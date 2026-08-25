import {describe, expect, test} from 'bun:test'
import {toBrowserUrl} from '../src/url.js'

describe('toBrowserUrl', () => {
	test('rewrites VCS URL styles to https web URLs', () => {
		const cases: Array<[string, string]> = [
			['git+https://github.com/u/r.git', 'https://github.com/u/r'],
			['git+https://github.com/u/r', 'https://github.com/u/r'],
			[
				'git+https://github.com/u/@scope/pkg.git',
				'https://github.com/u/@scope/pkg',
			],
			['git://github.com/u/r.git', 'https://github.com/u/r'],
			['git+ssh://git@github.com/u/r.git', 'https://github.com/u/r'],
			['ssh://git@github.com/u/r.git', 'https://github.com/u/r'],
			['ssh://github.com/u/r.git', 'https://github.com/u/r'],
			['git@github.com:u/r.git', 'https://github.com/u/r'],
			['git@gitlab.com:g/u/r.git', 'https://gitlab.com/g/u/r'],
			['github:u/r', 'https://github.com/u/r'],
			['GitHub:u/r', 'https://github.com/u/r'],
			['gitlab:u/r', 'https://gitlab.com/u/r'],
			['bitbucket:u/r', 'https://bitbucket.org/u/r'],
			// plain git+http keeps its scheme (no forced https upgrade)
			['git+http://intranet/x.git', 'http://intranet/x'],
		]

		for (const [input, expected] of cases) {
			expect(toBrowserUrl(input)).toBe(expected)
		}
	})

	test('leaves ordinary URLs untouched', () => {
		const cases = [
			'https://github.com/u/r',
			'https://example.com/some/page',
			'http://intranet/x',
			'https://gitlab.com/u/r.gitlab',
			'ftp://files.example.com/x',
			'not-a-url',
			'',
		]

		for (const input of cases) {
			expect(toBrowserUrl(input)).toBe(input)
		}
	})

	test('trims surrounding whitespace before converting', () => {
		expect(toBrowserUrl('  git+https://github.com/u/r.git  ')).toBe(
			'https://github.com/u/r',
		)
	})
})
