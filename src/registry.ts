import type {PackageInfo, SearchResult, SortMode} from './types.js'
import {RegistryError} from './types.js'

const REGISTRY = 'https://registry.npmjs.org'
const TIMEOUT_MS = 10_000
const RETRY_BACKOFF_MS = 500
const VERSION = '0.1.0'

const SORT_MODES: SortMode[] = [
	'optimal',
	'quality',
	'popularity',
	'maintenance',
]

function looksLikeHtml(body: string): boolean {
	return /^\s*</.test(body)
}

function asString(value: unknown): string {
	return typeof value === 'string' ? value : ''
}

function asStringArray(value: unknown): string[] {
	if (!Array.isArray(value)) return []
	return value
		.map(v => {
			if (typeof v === 'string') return v
			if (v && typeof v === 'object' && 'username' in v)
				return asString(v.username)
			return ''
		})
		.filter(Boolean)
}

function repositoryUrl(value: unknown): string | undefined {
	if (typeof value === 'string') return value
	if (value && typeof value === 'object' && 'url' in value)
		return asString(value.url)
	return undefined
}

async function requestJson(url: URL): Promise<unknown> {
	let response: Response
	try {
		response = await fetch(url, {
			headers: {
				Accept: 'application/json',
				'User-Agent': `pkgfinder/${VERSION}`,
			},
			signal: AbortSignal.timeout(TIMEOUT_MS),
		})
	} catch (error) {
		if (error instanceof Error && error.name === 'TimeoutError') {
			throw new RegistryError('Timed out waiting for the npm registry (10 s).')
		}
		throw new RegistryError('Network error while contacting the npm registry.')
	}

	if (!response.ok) {
		throw new RegistryError(
			`npm registry responded with HTTP ${response.status} ${response.statusText}.`,
		)
	}

	const body = await response.text()

	if (looksLikeHtml(body)) {
		throw new RegistryError(
			'npm registry returned HTML instead of JSON (likely rate-limited).',
		)
	}

	try {
		return JSON.parse(body)
	} catch {
		throw new RegistryError('Could not parse the npm registry response.')
	}
}
function parseSearch(data: unknown): {results: SearchResult[]; total: number} {
	if (!data || typeof data !== 'object' || !('objects' in data)) {
		throw new RegistryError('Unexpected search response from the npm registry.')
	}

	const record = data as Record<string, unknown>
	const objects = record.objects
	const total = typeof record.total === 'number' ? record.total : 0

	if (!Array.isArray(objects)) {
		throw new RegistryError('Unexpected search response from the npm registry.')
	}

	const results: SearchResult[] = []

	for (const entry of objects) {
		if (!entry || typeof entry !== 'object') continue
		const entryRecord = entry as Record<string, unknown>
		const pkg = entryRecord.package
		if (!pkg || typeof pkg !== 'object') continue

		const pkgRecord = pkg as Record<string, unknown>
		const links = pkgRecord.links as Record<string, unknown> | undefined
		const downloads = entryRecord.downloads as
			Record<string, unknown> | undefined
		const score = entryRecord.score as Record<string, unknown> | undefined

		const name = asString(pkgRecord.name)
		if (!name) continue

		results.push({
			name,
			version: asString(pkgRecord.version),
			description: asString(pkgRecord.description),
			keywords: asStringArray(pkgRecord.keywords),
			license: asString(pkgRecord.license),
			links: {
				npm: asString(links?.npm) || `https://www.npmjs.com/package/${name}`,
				homepage: asString(links?.homepage) || undefined,
				repository: asString(links?.repository) || undefined,
			},
			downloads: typeof downloads?.monthly === 'number' ? downloads.monthly : 0,
			score: typeof score?.final === 'number' ? score.final : 0,
		})
	}

	return {results, total}
}

function parsePackage(data: unknown, name: string): PackageInfo {
	if (!data || typeof data !== 'object') {
		throw new RegistryError(
			'Unexpected package response from the npm registry.',
		)
	}

	const record = data as Record<string, unknown>
	const distTags = record['dist-tags'] as Record<string, unknown> | undefined
	const versions = record.versions as Record<string, unknown> | undefined
	const version = asString(distTags?.latest) || ''
	const latest =
		version && versions && typeof versions[version] === 'object'
			? (versions[version] as Record<string, unknown>)
			: undefined

	const latestDist =
		latest && typeof latest.dist === 'object' && latest.dist !== null
			? (latest.dist as Record<string, unknown>)
			: undefined

	const dependencies =
		latest &&
		typeof latest.dependencies === 'object' &&
		latest.dependencies !== null
			? (latest.dependencies as Record<string, string>)
			: {}

	return {
		name,
		version,
		description: asString(record.description),
		license: asString(record.license),
		homepage: asString(record.homepage) || undefined,
		repository: repositoryUrl(record.repository),
		maintainers: asStringArray(record.maintainers),
		keywords: asStringArray(record.keywords),
		dependencies,
		unpackedSize:
			typeof latestDist?.unpackedSize === 'number'
				? latestDist.unpackedSize
				: undefined,
	}
}

async function withRetry(fn: () => Promise<unknown>): Promise<unknown> {
	try {
		return await fn()
	} catch (error) {
		const retryable =
			error instanceof RegistryError &&
			/HTTP 429|HTTP 5\d\d/.test(error.message)

		if (retryable) {
			await Bun.sleep(RETRY_BACKOFF_MS)
			return await fn()
		}
		throw error
	}
}

export async function searchPackages(
	query: string,
	options: {size?: number; from?: number; sort?: SortMode} = {},
): Promise<{results: SearchResult[]; total: number}> {
	const size = options.size ?? 20
	const from = options.from ?? 0
	const sort =
		options.sort && SORT_MODES.includes(options.sort) ? options.sort : 'optimal'

	const url = new URL(`${REGISTRY}/-/v1/search`)
	url.searchParams.set('text', query)
	url.searchParams.set('size', String(size))
	url.searchParams.set('from', String(from))
	if (sort !== 'optimal') {
		url.searchParams.set(sort, '1')
	}

	const data = await withRetry(() => requestJson(url))
	return parseSearch(data)
}

export async function getPackage(name: string): Promise<PackageInfo> {
	const url = new URL(`${REGISTRY}/${encodeURIComponent(name)}`)
	const data = await withRetry(() => requestJson(url))
	return parsePackage(data, name)
}
