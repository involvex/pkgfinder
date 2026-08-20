import {afterEach, describe, expect, mock, test} from 'bun:test'
import {render} from 'ink-testing-library'
import App from '../src/app.js'

const KEY_DOWN = '\u001B[B'
const KEY_ESC = '\u001B'
const KEY_ENTER = '\r'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface SearchHit {
	name: string
	version: string
	description: string
}

function searchPayload(hits: SearchHit[]): unknown {
	return {
		objects: hits.map(hit => ({
			package: {
				name: hit.name,
				version: hit.version,
				description: hit.description,
				keywords: [],
				license: 'MIT',
				links: {npm: `https://www.npmjs.com/package/${hit.name}`},
			},
			downloads: {monthly: 100},
			score: {final: 0.5},
		})),
		total: hits.length,
	}
}

function packagePayload(name: string): unknown {
	return {
		name,
		description: `Full description of ${name}`,
		license: 'MIT',
		homepage: `https://example.com/${name}`,
		repository: `git+https://github.com/example/${name}.git`,
		maintainers: [{username: 'alice'}],
		keywords: ['k1'],
		'dist-tags': {latest: '1.0.0'},
		versions: {'1.0.0': {dependencies: {}, dist: {unpackedSize: 100}}},
	}
}

function mockRegistry(searchByText: Record<string, SearchHit[]>): void {
	globalThis.fetch = mock(async (input: string | URL | Request) => {
		const href =
			input instanceof URL
				? input.href
				: typeof input === 'string'
					? input
					: input.url
		const url = new URL(href)
		const body = (): unknown => {
			if (url.pathname === '/-/v1/search') {
				const text = url.searchParams.get('text') ?? ''
				return searchPayload(searchByText[text] ?? [])
			}
			const name = decodeURIComponent(url.pathname.slice(1))
			return packagePayload(name)
		}
		return new Response(JSON.stringify(body()), {
			status: 200,
			headers: {'Content-Type': 'application/json'},
		})
	}) as unknown as typeof fetch
}

afterEach(() => {
	mock.restore()
})

describe('App', () => {
	test('shows results for the initial query', async () => {
		mockRegistry({
			react: [{name: 'react', version: '19.0.0', description: 'A UI library'}],
		})

		const {lastFrame, unmount} = render(
			<App
				initialQuery="react"
				debounceMs={0}
				onExit={() => {}}
			/>,
		)
		await delay(100)

		const frame = lastFrame()
		expect(frame).toContain('react@19.0.0')
		expect(frame).toContain('A UI library')
		expect(frame).toContain('1 results')

		unmount()
	})

	test('opens package details with Enter and navigates back with Esc', async () => {
		mockRegistry({
			react: [{name: 'react', version: '19.0.0', description: 'A UI library'}],
		})

		const {lastFrame, stdin, unmount} = render(
			<App
				initialQuery="react"
				debounceMs={0}
				onExit={() => {}}
			/>,
		)
		await delay(100)

		stdin.write(KEY_DOWN)
		await delay(20)
		stdin.write(KEY_ENTER)
		await delay(100)

		let frame = lastFrame()
		expect(frame).toContain('Full description of react')

		stdin.write(KEY_ESC)
		await delay(50)

		frame = lastFrame()
		expect(frame).toContain('react@19.0.0')

		unmount()
	})

	test('searches after pressing /, typing and pressing Enter', async () => {
		mockRegistry({
			ink: [{name: 'ink', version: '7.0.0', description: 'React for CLIs'}],
		})

		const {lastFrame, stdin, unmount} = render(
			<App
				debounceMs={0}
				onExit={() => {}}
			/>,
		)
		await delay(50)

		expect(lastFrame()).toContain('Press / to start searching.')

		stdin.write('/')
		await delay(20)
		stdin.write('ink')
		await delay(20)
		stdin.write(KEY_ENTER)
		await delay(100)

		expect(lastFrame()).toContain('ink@7.0.0')

		unmount()
	})

	test('shows an empty state when nothing is found', async () => {
		mockRegistry({ghost: []})

		const {lastFrame, unmount} = render(
			<App
				initialQuery="ghost"
				debounceMs={0}
				onExit={() => {}}
			/>,
		)
		await delay(100)

		expect(lastFrame()).toContain('No packages found.')

		unmount()
	})

	test('shows an error message when the registry fails', async () => {
		globalThis.fetch = mock(
			async () => new Response('Not Found', {status: 404}),
		) as unknown as typeof fetch

		const {lastFrame, unmount} = render(
			<App
				initialQuery="react"
				debounceMs={0}
				onExit={() => {}}
			/>,
		)
		await delay(100)

		expect(lastFrame()).toContain('HTTP 404')

		unmount()
	})

	test('quits when q is pressed', async () => {
		mockRegistry({
			react: [{name: 'react', version: '19.0.0', description: 'A UI library'}],
		})
		let quit = false

		const {stdin, unmount} = render(
			<App
				initialQuery="react"
				debounceMs={0}
				onExit={() => {
					quit = true
				}}
			/>,
		)
		await delay(100)

		stdin.write('q')
		await delay(50)

		expect(quit).toBe(true)

		unmount()
	})
})
