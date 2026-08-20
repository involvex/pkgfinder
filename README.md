# @involvex/pkgfinder

> Interactive npm registry search TUI – search, inspect and open npm packages from your terminal.

`pkgfinder` is a small, fast terminal UI for the npm registry. It improves on the classic
`npm find` / `npm view` workflow by giving you a live searchable list, a rich package
detail view, and one-key shortcuts to open a package on npm or in its repository.

![Status](https://img.shields.io/badge/status-beta-yellow) ![Node](https://img.shields.io/badge/node-%3E%3D18-green) ![License](https://img.shields.io/badge/license-MIT-blue)

## Features

- **Live search** – press `/`, type, and results update as you type (debounced).
- **Rich detail view** – license, keywords, maintainers, dependencies, unpacked size,
  homepage and repository links.
- **Instant browser open** – `o` opens the npm page, `b` opens the repository/homepage.
- **Sorting** – by optimal, quality, popularity or maintenance.
- **Pagination** – `n` / `p` (or `PageUp` / `PageDown`) browse pages.
- **JSON mode** – `--json` prints structured results for scripting/pipe workflows.
- **Zero-config** – free public registry API, no API key, no account.

## Install

```bash
# Install globally (npm)
npm install --global @involvex/pkgfinder

# Or from the repo with Bun
bun link
```

## Usage

```bash
# Start the interactive TUI
$ pkgfinder

# Start with an initial query
$ pkgfinder "react hooks"

# Print JSON results and exit (for scripting)
$ pkgfinder --json --sort popularity "state management"
```

### Options

```
  --json      Print search results as JSON and exit
  --sort      Sort by quality, popularity, maintenance or optimal (default)
  --limit     Number of results per page (default: 20)
  --version   Show version
  --help      Show help
```

### Keybindings

| Key                 | Action                                       |
| ------------------- | -------------------------------------------- |
| `/`                 | Focus the search bar                         |
| `Enter`             | Open the selected package's details          |
| `↑` / `↓`           | Move the selection                           |
| `PageUp` / `PageDn` | Move the selection by 5                      |
| `n` / `p`           | Next / previous page                         |
| `o`                 | Open the npm page in your browser            |
| `b`                 | Open the repository/homepage in your browser |
| `Esc`               | Leave the search bar / go back to results    |
| `?`                 | Show/hide the help overlay                   |
| `q` / `Ctrl+C`      | Quit                                         |

## Development

```bash
# Install dependencies (Bun only – never npm/yarn/pnpm)
bun install

# Run in development mode
bun run dev
# or directly with arguments
bun run src/cli.tsx "react hooks"

# Build for production
bun run build        # outputs dist/cli.js

# Type-check, lint and format
bun run typecheck
bun run lint
bun run format
```

### Testing

```bash
# Run all tests (mocked fetch – no network access)
bun test

# Run a single test file
bun test test/registry.test.ts

# Run tests matching a pattern
bun test --grep "retry"
```

## How it works

- The **search** and **details** views talk directly to the public npm registry API
  (`registry.npmjs.org`) – no API key needed.
- The TUI is built with [Ink](https://github.com/vadimdemedes/ink) (React for CLIs) and
  uses native `fetch()` with a 10s timeout and one retry on `429`/`5xx`.
- In `--json` mode no UI is rendered; output is a plain JSON object on stdout.

## License

MIT
