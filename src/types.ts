export type SortMode = 'optimal' | 'quality' | 'popularity' | 'maintenance'

export interface SearchResult {
	name: string
	version: string
	description: string
	keywords: string[]
	license: string
	links: {
		npm: string
		homepage?: string
		repository?: string
	}
	downloads: number
	score: number
}

export interface PackageInfo {
	name: string
	version: string
	description: string
	license: string
	homepage?: string
	repository?: string
	maintainers: string[]
	keywords: string[]
	dependencies: Record<string, string>
	unpackedSize?: number
}

export class RegistryError extends Error {
	readonly exitCode: number

	constructor(message: string, exitCode = 2) {
		super(message)
		this.name = 'RegistryError'
		this.exitCode = exitCode
	}
}
