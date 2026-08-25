const FORGE_BASES: Record<string, string> = {
	github: 'https://github.com',
	gitlab: 'https://gitlab.com',
	bitbucket: 'https://bitbucket.org',
}

const SCHEME_TARGETS: Record<string, string> = {
	git: 'https',
	ssh: 'https',
	'git+https': 'https',
	'git+ssh': 'https',
	'git+http': 'http',
}

function stripGitSuffix(url: string): string {
	return url.replace(/\.git$/i, '')
}

function toWebUrl(target: string, authorityAndPath: string): string {
	const anonymous = authorityAndPath.replace(/^\/\/[^/@]*@/, '//')
	return stripGitSuffix(`${target}:${anonymous}`)
}

export function toBrowserUrl(url: string): string {
	const value = url.trim()
	if (!value) return ''

	const shorthand = /^([a-z]+):(.+)$/i.exec(value)
	if (shorthand) {
		const base = FORGE_BASES[shorthand[1]!.toLowerCase()]
		if (base) return stripGitSuffix(`${base}/${shorthand[2]}`)
	}

	const scpStyle = /^git@([^/:]+):(.+)$/i.exec(value)
	if (scpStyle) return stripGitSuffix(`https://${scpStyle[1]}/${scpStyle[2]}`)

	const schemeMatch = /^([a-z][a-z0-9+.-]*):(.+)$/i.exec(value)
	if (schemeMatch) {
		const target = SCHEME_TARGETS[schemeMatch[1]!.toLowerCase()]
		const rest = schemeMatch[2]!
		if (target && rest.startsWith('//')) return toWebUrl(target, rest)
	}

	return value
}
