import {Box, Text} from 'ink'
import TextInput from 'ink-text-input'

interface SearchBarProps {
	value: string
	active: boolean
	onChange: (value: string) => void
	onSubmit: (value: string) => void
	placeholder?: string
}

export default function SearchBar({
	value,
	active,
	onChange,
	onSubmit,
	placeholder = 'search npm packages…',
}: SearchBarProps) {
	return (
		<Box>
			<Text
				bold
				color={active ? 'cyan' : undefined}
			>
				{active ? '> ' : '  '}Search:
			</Text>
			<TextInput
				value={value}
				onChange={onChange}
				onSubmit={onSubmit}
				focus={active}
				placeholder={placeholder}
			/>
		</Box>
	)
}
