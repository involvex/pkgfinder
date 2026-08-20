#!/usr/bin/env node
import {render} from 'ink'
import meow from 'meow'
import pkg from '../package.json' with {type: 'json'}
import App from './app.js'
import {searchPackages} from './registry.js'
import type {SortMode} from './types.js'

const VALID_SORTS: SortMode[] = [
	'optimal',
	'quality',
	'popularity',
	'maintenance',
]

const cli = meow(
	`
	Usage
	  $ pkgfinder [query]

	Options
	  --json      Print search results as JSON and exit
	  --sort      Sort by quality, popularity, maintenance or optimal (default)
	  --limit     Number of results per page (default: 20)
	  --version   Show version
	  --help      Show help

	Examples
	  $ pkgfinder "react hooks"
	  $ pkgfinder --json --sort popularity "state management"
`,
	{
		importMeta: import.meta,
		flags: {
			json: {
				type: 'boolean',
				default: false,
			},
			sort: {
				type: 'string',
				default: 'optimal',
			},
			limit: {
				type: 'number',
				default: 20,
			},
			version: {
				type: 'boolean',
				default: false,
			},
			help: {
				type: 'boolean',
				default: false,
			},
		},
		autoHelp: false,
		autoVersion: false,
	},
)

if (cli.flags.help) {
	console.log(cli.help)
	process.exit(0)
}

if (cli.flags.version) {
	console.log(pkg.version)
	process.exit(0)
}

const query = cli.input.join(' ').trim()
const sort: SortMode = VALID_SORTS.includes(cli.flags.sort as SortMode)
	? (cli.flags.sort as SortMode)
	: 'optimal'
const limit = Math.max(1, Math.min(100, cli.flags.limit))

if (cli.flags.json) {
	try {
		const {results, total} = await searchPackages(query, {size: limit, sort})
		console.log(JSON.stringify({total, results}, null, 2))
	} catch (error) {
		console.error(error instanceof Error ? error.message : String(error))
		process.exitCode = 2
	}
} else {
	render(
		<App
			initialQuery={query}
			sort={sort}
			limit={limit}
		/>,
	)
}
