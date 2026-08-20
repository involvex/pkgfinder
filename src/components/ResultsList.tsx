import {Box, Text} from 'ink'
import type {SearchResult} from '../types.js'

interface ResultsListProps {
	results: SearchResult[]
	selectedIndex: number
}

export default function ResultsList({
	results,
	selectedIndex,
}: ResultsListProps) {
	if (results.length === 0) {
		return <Text dimColor>No packages found.</Text>
	}

	return (
		<Box flexDirection="column">
			{results.map((result, index) => {
				const selected = index === selectedIndex
				const description = (result.description || '(no description)').slice(
					0,
					80,
				)

				return (
					<Box key={result.name}>
						<Text inverse={selected}>
							{selected ? '❯ ' : '  '}
							{result.name}@{result.version}
						</Text>
						<Text
							dimColor
							color={selected ? 'cyan' : undefined}
						>
							{'  '}
							{description}
						</Text>
					</Box>
				)
			})}
		</Box>
	)
}
