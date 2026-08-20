import {spawn} from 'node:child_process'

export function openUrl(url: string): Promise<void> {
	const platform = process.platform

	const command =
		platform === 'win32' ? 'cmd' : platform === 'darwin' ? 'open' : 'xdg-open'
	const args = platform === 'win32' ? ['/c', 'start', '', url] : [url]

	return new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: 'ignore',
			detached: true,
			shell: false,
			windowsHide: true,
		})

		child.on('error', reject)
		child.unref()

		child.on('close', code => {
			if (code === 0) {
				resolve()
			} else {
				reject(new Error(`Failed to open browser (exit code ${code}).`))
			}
		})
	})
}
