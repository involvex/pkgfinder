import {Box, Text} from 'ink'

const KEYS: Array<{key: string; action: string}> = [
	{key: '/', action: 'focus search'},
	{key: '↑↓', action: 'navigate results'},
	{key: 'PgUp/PgDn', action: 'jump'},
	{key: 'n/p', action: 'next/previous page'},
	{key: 'Enter', action: 'open package details'},
	{key: 'o', action: 'open npm page in browser'},
	{key: 'b', action: 'open repository/homepage in browser'},
	{key: 'Esc', action: 'back / leave search'},
	{key: 'q / Ctrl+C', action: 'quit'},
]

export default function HelpOverlay() {
	return (
		<Box
			flexDirection="column"
			borderStyle="round"
			borderColor="cyan"
			paddingX={2}
			paddingY={1}
		>
			<Text
				bold
				color="cyan"
			>
				Keys
			</Text>
			{KEYS.map(({key, action}) => (
				<Box key={key}>
					<Text bold>{key.padEnd(14)}</Text>
					<Text dimColor>{action}</Text>
				</Box>
			))}
			<Box marginTop={1}>
				<Text dimColor>Press Esc to close this help.</Text>
			</Box>
		</Box>
	)
}
