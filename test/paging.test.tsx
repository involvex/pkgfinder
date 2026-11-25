import {afterEach, describe, expect, mock, test} from 'bun:test'
import {render} from 'ink-testing-library'
import App from '../src/app.js'

const KEY_N = 'n'
const KEY_P = 'p'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface Hit {
	name: string
	version: string
}

function searchPayload(hits: Hit[], total: number): unknown {
	return {
		objects: hits.map(hit => ({
			package: {
				name: hit.name,
				version: hit.version,
				description: `Description of ${hit.name}`,
				keywords: [],
				license: 'MIT',
				links: {npm: `https://www.npmjs.com/package/${hit.name}`},
			},
			downloads: {monthly: 100},
			score: {final: 0.5},
		})),
		total,
	}
}

function mockSearch(total: number, limit = 20): string[] {
	const calls: string[] = []
	globalThis.fetch = mock(async (input: string | URL | Request) => {
		const href =
			input instanceof URL
				? input.href
				: typeof input === 'string'
					? input
					: input.url
		calls.push(href)
		const url = new URL(href)
		const from = Number(url.searchParams.get('from') ?? 0)
		const size = Number(url.searchParams.get('size') ?? limit)
		const remaining = Math.max(0, total - from)
		const hits: Hit[] = Array.from(
			{length: Math.min(size, remaining)},
			(_, i) => ({
				name: `pkg-${from + i}`,
				version: '1.0.0',
			}),
		)
		return new Response(JSON.stringify(searchPayload(hits, total)), {
			status: 200,
			headers: {'Content-Type': 'application/json'},
		})
	}) as unknown as typeof fetch
	return calls
}

function fromsOf(calls: string[]): Array<string | null> {
	return calls.map(href => new URL(href).searchParams.get('from'))
}

afterEach(() => {
	mock.restore()
})

describe('paging', () => {
	test('n fetches the next page via from=20 and shows Page 2', async () => {
		const calls = mockSearch(100)
		const {lastFrame, stdin, unmount} = render(
			<App
				initialQuery="x"
				debounceMs={0}
				onExit={() => {}}
			/>,
		)
		await delay(100)

		expect(lastFrame()).toContain('Page 1/5')

		stdin.write(KEY_N)
		await delay(100)

		expect(lastFrame()).toContain('Page 2/5')
		expect(fromsOf(calls)).toContain('20')

		unmount()
	})

	test('rapid double n advances only one page', async () => {
		const calls = mockSearch(100)
		const {lastFrame, stdin, unmount} = render(
			<App
				initialQuery="x"
				debounceMs={0}
				onExit={() => {}}
			/>,
		)
		await delay(100)

		stdin.write(KEY_N)
		stdin.write(KEY_N)
		await delay(150)

		expect(lastFrame()).toContain('Page 2/5')
		expect(fromsOf(calls).filter(from => from === '20').length).toBe(1)

		unmount()
	})

	test('n stops at the last page and shows a Last page hint', async () => {
		const calls = mockSearch(25)
		const {lastFrame, stdin, unmount} = render(
			<App
				initialQuery="x"
				debounceMs={0}
				onExit={() => {}}
			/>,
		)
		await delay(100)

		stdin.write(KEY_N) // from=20, 5 results -> the end
		await delay(100)

		expect(lastFrame()).toContain('Page 2')
		expect(lastFrame()).toContain('Last page')

		const callsBefore = calls.length
		stdin.write(KEY_N)
		await delay(100)

		expect(calls.length).toBe(callsBefore)
		expect(lastFrame()).toContain('Page 2')

		unmount()
	})

	test('p returns to the previous page', async () => {
		mockSearch(100)
		const {lastFrame, stdin, unmount} = render(
			<App
				initialQuery="x"
				debounceMs={0}
				onExit={() => {}}
			/>,
		)
		await delay(100)

		stdin.write(KEY_N)
		await delay(100)
		expect(lastFrame()).toContain('Page 2/5')

		stdin.write(KEY_P)
		await delay(100)

		expect(lastFrame()).toContain('Page 1/5')

		unmount()
	})
})
