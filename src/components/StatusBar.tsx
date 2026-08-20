import {Text} from 'ink'

interface StatusBarProps {
	screen: 'search' | 'detail'
}

export default function StatusBar({screen}: StatusBarProps) {
	const hints =
		screen === 'detail'
			? '/ Search · o npm · b repo · Esc Back · ? Help · q Quit'
			: '/ Search · ↑↓ Navigate · n/p Page · Enter Details · o npm · b repo · ? Help · q Quit'

	return <Text dimColor>{hints}</Text>
}
