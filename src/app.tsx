import {Box, Text, useInput} from 'ink'
import {useCallback, useEffect, useRef, useState} from 'react'
import DetailView from './components/DetailView.js'
import HelpOverlay from './components/HelpOverlay.js'
import ResultsList from './components/ResultsList.js'
import SearchBar from './components/SearchBar.js'
import StatusBar from './components/StatusBar.js'
import {openUrl} from './open.js'
import {getPackage, searchPackages} from './registry.js'
import type {PackageInfo, SearchResult, SortMode} from './types.js'

type Screen = 'search' | 'detail'

interface AppProps {
	initialQuery?: string
	sort?: SortMode
	limit?: number
	debounceMs?: number
	onExit?: () => void
}

export default function App({
	initialQuery = '',
	sort = 'optimal',
	limit = 20,
	debounceMs = 300,
	onExit = () => process.exit(0),
}: AppProps) {
	const [query, setQuery] = useState(initialQuery)
	const [searchActive, setSearchActive] = useState(false)
	const [results, setResults] = useState<SearchResult[]>([])
	const [total, setTotal] = useState(0)
	const [from, setFrom] = useState(0)
	const [selectedIndex, setSelectedIndex] = useState(0)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [screen, setScreen] = useState<Screen>('search')
	const [detail, setDetail] = useState<PackageInfo | null>(null)
	const [detailLoading, setDetailLoading] = useState(false)
	const [detailError, setDetailError] = useState<string | null>(null)
	const [showHelp, setShowHelp] = useState(false)

	const requestId = useRef(0)
	const lastSearched = useRef(initialQuery.trim())

	const performSearch = useCallback(
		async (value: string, offset = 0) => {
			const trimmed = value.trim()
			if (!trimmed) return

			const id = ++requestId.current
			lastSearched.current = trimmed
			setLoading(true)
			setError(null)

			try {
				const {results: found, total: foundTotal} = await searchPackages(
					trimmed,
					{size: limit, from: offset, sort},
				)
				if (id !== requestId.current) return
				setResults(found)
				setTotal(foundTotal)
				setFrom(offset)
				setSelectedIndex(0)
			} catch (caught) {
				if (id !== requestId.current) return
				setResults([])
				setError(caught instanceof Error ? caught.message : String(caught))
			} finally {
				if (id === requestId.current) setLoading(false)
			}
		},
		[limit, sort],
	)

	useEffect(() => {
		if (!initialQuery.trim()) return
		performSearch(initialQuery)
	}, [initialQuery, performSearch])

	useEffect(() => {
		if (!searchActive) return
		const trimmed = query.trim()
		if (!trimmed || trimmed === lastSearched.current) return

		const timer = setTimeout(() => {
			performSearch(trimmed)
		}, debounceMs)

		return () => clearTimeout(timer)
	}, [query, searchActive, debounceMs, performSearch])

	const openDetail = useCallback(async (name: string) => {
		setScreen('detail')
		setDetail(null)
		setDetailLoading(true)
		setDetailError(null)
		try {
			const pkg = await getPackage(name)
			setDetail(pkg)
		} catch (caught) {
			setDetailError(caught instanceof Error ? caught.message : String(caught))
		} finally {
			setDetailLoading(false)
		}
	}, [])

	const nextPage = useCallback(() => {
		if (from + limit < total) {
			performSearch(query, from + limit)
		}
	}, [from, limit, total, query, performSearch])

	const prevPage = useCallback(() => {
		if (from > 0) {
			performSearch(query, Math.max(0, from - limit))
		}
	}, [from, limit, query, performSearch])

	const openSelectedBrowser = useCallback((url: string | undefined) => {
		if (url) void openUrl(url)
	}, [])

	useInput((input, key) => {
		if (showHelp) {
			if (key.escape || input === '?') setShowHelp(false)
			return
		}

		if (searchActive) {
			if (key.escape) setSearchActive(false)
			return
		}

		if (key.escape) {
			if (screen === 'detail') {
				setScreen('search')
				setDetail(null)
				setDetailError(null)
			}
			return
		}

		if (key.ctrl && input === 'c') {
			onExit()
			return
		}

		if (input === 'q') {
			onExit()
			return
		}

		if (input === '/') {
			setSearchActive(true)
			return
		}

		if (input === '?') {
			setShowHelp(true)
			return
		}

		if (screen === 'search') {
			if (key.upArrow) {
				setSelectedIndex(index => Math.max(0, index - 1))
				return
			}
			if (key.downArrow) {
				setSelectedIndex(index => Math.min(results.length - 1, index + 1))
				return
			}
			if (key.pageUp) {
				setSelectedIndex(index => Math.max(0, index - 5))
				return
			}
			if (key.pageDown) {
				setSelectedIndex(index => Math.min(results.length - 1, index + 5))
				return
			}
			if (input === 'n') {
				nextPage()
				return
			}
			if (input === 'p') {
				prevPage()
				return
			}
			if (key.return) {
				const selected = results[selectedIndex]
				if (selected) openDetail(selected.name)
				return
			}
			if (input === 'o') {
				openSelectedBrowser(results[selectedIndex]?.links.npm)
				return
			}
			if (input === 'b') {
				const selected = results[selectedIndex]
				openSelectedBrowser(
					selected?.links.repository || selected?.links.homepage,
				)
				return
			}
		}

		if (screen === 'detail' && detail) {
			if (input === 'o') {
				openSelectedBrowser(`https://www.npmjs.com/package/${detail.name}`)
				return
			}
			if (input === 'b') {
				openSelectedBrowser(detail.repository || detail.homepage)
				return
			}
		}
	})

	const pageInfo = total > 0 ? `Page ${Math.floor(from / limit) + 1}` : ''

	return (
		<Box flexDirection="column">
			{showHelp ? (
				<HelpOverlay />
			) : (
				<>
					<SearchBar
						value={query}
						active={searchActive}
						onChange={setQuery}
						onSubmit={value => {
							setQuery(value)
							setSearchActive(false)
							performSearch(value)
						}}
					/>

					{screen === 'detail' ? (
						<Box marginTop={1}>
							{detailLoading ? (
								<Text dimColor>Loading package details…</Text>
							) : detailError ? (
								<Text color="red">{detailError}</Text>
							) : detail ? (
								<DetailView pkg={detail} />
							) : null}
						</Box>
					) : (
						<Box
							flexDirection="column"
							marginTop={1}
						>
							{loading ? (
								<Text dimColor>Searching…</Text>
							) : error ? (
								<Text color="red">{error}</Text>
							) : (
								<>
									<ResultsList
										results={results}
										selectedIndex={selectedIndex}
									/>
									<Text dimColor>
										{results.length > 0
											? `${total} results${pageInfo ? ` · ${pageInfo}` : ''}`
											: 'Press / to start searching.'}
									</Text>
								</>
							)}
						</Box>
					)}

					<Box marginTop={1}>
						<StatusBar screen={screen} />
					</Box>
				</>
			)}
		</Box>
	)
}
