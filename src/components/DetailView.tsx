import {Box, Text} from 'ink'
import type {PackageInfo} from '../types.js'

function formatBytes(bytes?: number): string {
	if (bytes === undefined) return '—'
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} kB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface DetailViewProps {
	pkg: PackageInfo
	loading?: boolean
}

export default function DetailView({pkg, loading}: DetailViewProps) {
	if (loading) {
		return <Text dimColor>Loading package details…</Text>
	}

	const rows: Array<{label: string; value: string}> = [
		{label: 'License', value: pkg.license || '—'},
		{
			label: 'Keywords',
			value: pkg.keywords.slice(0, 8).join(', ') || '—',
		},
		{
			label: 'Maintainers',
			value: pkg.maintainers.join(', ') || '—',
		},
		{
			label: 'Dependencies',
			value: String(Object.keys(pkg.dependencies).length),
		},
		{label: 'Size', value: formatBytes(pkg.unpackedSize)},
		{label: 'Homepage', value: pkg.homepage || '—'},
		{label: 'Repository', value: pkg.repository || '—'},
	]

	return (
		<Box
			flexDirection="column"
			paddingX={1}
		>
			<Text
				bold
				color="cyan"
			>
				{pkg.name}
			</Text>
			<Text dimColor>{pkg.version}</Text>
			{pkg.description ? (
				<Box marginTop={1}>
					<Text>{pkg.description}</Text>
				</Box>
			) : null}
			<Box
				flexDirection="column"
				marginTop={1}
			>
				{rows.map(row => (
					<Box key={row.label}>
						<Text bold>{row.label.padEnd(14)}</Text>
						<Text dimColor>{row.value}</Text>
					</Box>
				))}
			</Box>
		</Box>
	)
}
