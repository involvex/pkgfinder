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
	  --from      Start at this result offset
	  --page      Start at this 1-based page number (takes precedence over --from)
	  --version   Show version
	  --help      Show help

	Examples
	  $ pkgfinder "react hooks"
	  $ pkgfinder --json --sort popularity "state management"
	  $ pkgfinder --page 3 "react hooks"
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
			from: {
				type: 'number',
				default: 0,
			},
			page: {
				type: 'number',
				default: 0,
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
const fromOffset =
	cli.flags.page > 0
		? Math.max(0, (cli.flags.page - 1) * limit)
		: Math.max(0, cli.flags.from)

if (cli.flags.json) {
	try {
		const {results, total} = await searchPackages(query, {
			size: limit,
			from: fromOffset,
			sort,
		})
		console.log(JSON.stringify({total, from: fromOffset, results}, null, 2))
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
			initialFrom={fromOffset}
		/>,
	)
}
