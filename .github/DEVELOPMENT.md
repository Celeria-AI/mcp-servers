# Development

## Setup

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Development mode
pnpm dev
```

## Package Structure

```
packages/
  ├── asana-mcp/      # Asana MCP integration
  └── [future-packages]
```

## Development Workflow

This monorepo uses:
- [pnpm](https://pnpm.io/) for package management
- [Turborepo](https://turborepo.org/) for build orchestration
- [Changesets](https://github.com/changesets/changesets) for versioning and publishing
- [tsup](https://github.com/egoist/tsup) for TypeScript bundling

### Making Changes

1. Make your changes in the relevant package(s)
2. Create a changeset to document your changes:
```bash
pnpm changeset
```

3. Build and test your changes:
```bash
pnpm build
```

### Automated Publishing (Recommended)

We use the Changesets [github bot](https://github.com/apps/changeset-bot) and [github action](https://github.com/changesets/action) to assist with publishing package update to NPM. The flow is outlined below:

1. Make your changes
2. Create a changeset to document your changes:
```bash
# you will be prompted to choose if it's a patch/minor/major version change as well as a summary of the change(s)
pnpm changeset
```
3. Commit your changes and open a PR
4. The changeset bot will comment on the PR if no changeset is present
    - This doesn't necessarily mean one is needed it's just a helpful reminder e.g. root readme changes wouldn't warrant a changeset
5. Once the pr is merged a `version` PR will be created by the changeset github action. It will be kept up to date if new PRs w/ new changesets get merged.
6. Packages are published to npm when this `version` PR is merged

### Manual Publishing (Not Recommended)

If you do need to manually publish packages, run the following commands from the root of the repo:

1. Create new versions of packages:
```bash
pnpm changeset version
```

2. Build all packages and publish to npm:
```bash
pnpm ci:release
```

## Adding a New Package

1. Create a new directory in `packages/`
2. Initialize package:
```bash
cd packages/new-package
pnpm init
```

3. Add basic configuration files:
```bash
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── src/
    └── index.ts
```

4. Add minimal tsup configuration:
```typescript
// tsup.config.ts
import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: 'esm',
  clean: true,
})
```

## Scripts

- `pnpm build` - Build all packages
- `pnpm dev` - Start development mode
- `pnpm clean` - Clean all builds
- `pnpm changeset` - Create a new changeset
- `pnpm test` - Run tests (when added)