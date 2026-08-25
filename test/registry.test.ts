import {afterEach, describe, expect, mock, test} from 'bun:test'
import {getPackage, searchPackages} from '../src/registry.js'
import {RegistryError} from '../src/types.js'

function jsonResponse(body: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		status: 200,
		headers: {'Content-Type': 'application/json'},
		...init,
	})
}

function mockFetch(impl: (url: URL) => Response): void {
	globalThis.fetch = mock(async (input: string | URL | Request) => {
		const href =
			input instanceof URL
				? input.href
				: typeof input === 'string'
					? input
					: input.url
		return impl(new URL(href))
	}) as unknown as typeof fetch
}

function searchPayload(name: string): unknown {
	return {
		objects: [
			{
				package: {
					name,
					version: '1.2.3',
					description: `Description of ${name}`,
					keywords: ['a', 'b'],
					license: 'MIT',
					links: {npm: `https://www.npmjs.com/package/${name}`},
				},
				downloads: {monthly: 1234},
				score: {final: 0.9},
			},
		],
		total: 1,
	}
}

function packagePayload(name: string): unknown {
	return {
		name,
		description: `Full description of ${name}`,
		license: 'MIT',
		homepage: `https://example.com/${name}`,
		repository: {type: 'git', url: `git+https://github.com/x/${name}.git`},
		maintainers: [{username: 'alice'}, {username: 'bob'}],
		keywords: ['k1'],
		'dist-tags': {latest: '2.0.0'},
		versions: {
			'2.0.0': {
				dependencies: {react: '^18.0.0', 'is-number': '^7.0.0'},
				dist: {unpackedSize: 2048},
			},
		},
	}
}

afterEach(() => {
	mock.restore()
})

describe('searchPackages', () => {
	test('parses search results', async () => {
		mockFetch(() => jsonResponse(searchPayload('my-pkg')))

		const {results, total} = await searchPackages('my-pkg')

		expect(total).toBe(1)
		expect(results[0]).toMatchObject({
			name: 'my-pkg',
			version: '1.2.3',
			description: 'Description of my-pkg',
			license: 'MIT',
			keywords: ['a', 'b'],
			downloads: 1234,
			score: 0.9,
		})
		expect(results[0]?.links.npm).toBe('https://www.npmjs.com/package/my-pkg')
	})

	test('sends text, size and from params', async () => {
		let url: URL | undefined
		mockFetch(input => {
			url = input
			return jsonResponse(searchPayload('x'))
		})

		await searchPackages('hello world', {size: 25, from: 40})

		expect(url?.searchParams.get('text')).toBe('hello world')
		expect(url?.searchParams.get('size')).toBe('25')
		expect(url?.searchParams.get('from')).toBe('40')
	})

	test('sets popularity flag when sorting by popularity', async () => {
		let url: URL | undefined
		mockFetch(input => {
			url = input
			return jsonResponse(searchPayload('x'))
		})

		await searchPackages('x', {sort: 'popularity'})

		expect(url?.searchParams.get('popularity')).toBe('1')
	})

	test('falls back to npm link when links are missing', async () => {
		const payload = structuredClone(searchPayload('bare'))
		;(
			payload as {objects: Array<{package: {links?: unknown}}>}
		).objects[0]!.package.links = undefined
		mockFetch(() => jsonResponse(payload))

		const {results} = await searchPackages('bare')

		expect(results[0]?.links.npm).toBe('https://www.npmjs.com/package/bare')
	})

	test('returns empty results for an empty object list', async () => {
		mockFetch(() => jsonResponse({objects: [], total: 0}))

		const {results, total} = await searchPackages('nothing')

		expect(results).toEqual([])
		expect(total).toBe(0)
	})
})

describe('getPackage', () => {
	test('parses package details', async () => {
		mockFetch(() => jsonResponse(packagePayload('my-pkg')))

		const pkg = await getPackage('my-pkg')

		expect(pkg).toMatchObject({
			name: 'my-pkg',
			version: '2.0.0',
			description: 'Full description of my-pkg',
			license: 'MIT',
			homepage: 'https://example.com/my-pkg',
			repository: 'https://github.com/x/my-pkg',
			maintainers: ['alice', 'bob'],
			keywords: ['k1'],
			dependencies: {react: '^18.0.0', 'is-number': '^7.0.0'},
			unpackedSize: 2048,
		})
	})

	test('handles string repository and string maintainers', async () => {
		const payload = packagePayload('my-pkg')
		;(payload as {repository: unknown}).repository =
			'https://github.com/x/my-pkg'
		;(payload as {maintainers: unknown}).maintainers = ['alice']
		mockFetch(() => jsonResponse(payload))

		const pkg = await getPackage('my-pkg')

		expect(pkg.repository).toBe('https://github.com/x/my-pkg')
		expect(pkg.maintainers).toEqual(['alice'])
	})

	test('encodes scoped package names in the URL', async () => {
		let url: URL | undefined
		mockFetch(input => {
			url = input
			return jsonResponse(packagePayload('@scope/name'))
		})

		await getPackage('@scope/name')

		expect(url?.pathname).toContain('%40scope%2Fname')
	})

	test('returns empty version when dist-tags are missing', async () => {
		const payload = packagePayload('x')
		delete (payload as {['dist-tags']?: unknown})['dist-tags']
		mockFetch(() => jsonResponse(payload))

		const pkg = await getPackage('x')

		expect(pkg.version).toBe('')
		expect(pkg.dependencies).toEqual({})
	})
})

describe('errors and retries', () => {
	test('fails on non-200 response', async () => {
		mockFetch(() => new Response('Not Found', {status: 404}))

		await expect(searchPackages('x')).rejects.toThrow('HTTP 404')
	})

	test('fails on timeout with a clear message', async () => {
		mockFetch(() => {
			throw new DOMException('timed out', 'TimeoutError')
		})

		await expect(searchPackages('x')).rejects.toThrow('Timed out')
	})

	test('detects an HTML body as an error', async () => {
		mockFetch(() => new Response('<html>rate limit</html>', {status: 200}))

		await expect(searchPackages('x')).rejects.toThrow('HTML instead of JSON')
	})

	test('fails on invalid JSON', async () => {
		mockFetch(() => new Response('not json', {status: 200}))

		await expect(searchPackages('x')).rejects.toThrow('Could not parse')
	})

	test('retries once on 429 and succeeds on the second call', async () => {
		let calls = 0
		mockFetch(() => {
			calls += 1
			if (calls === 1)
				return jsonResponse({error: 'rate limited'}, {status: 429})
			return jsonResponse(searchPayload('retry'))
		})

		const {results} = await searchPackages('retry')

		expect(calls).toBe(2)
		expect(results[0]?.name).toBe('retry')
	})

	test('retries once on 500 and then fails', async () => {
		let calls = 0
		mockFetch(() => {
			calls += 1
			return new Response('Server Error', {status: 500})
		})

		await expect(searchPackages('x')).rejects.toBeInstanceOf(RegistryError)
		expect(calls).toBe(2)
	})

	test('errors carry exit code 2', async () => {
		mockFetch(() => new Response('Error', {status: 500}))

		try {
			await searchPackages('x')
		} catch (error) {
			expect(error).toBeInstanceOf(RegistryError)
			expect((error as RegistryError).exitCode).toBe(2)
		}
	})
})
