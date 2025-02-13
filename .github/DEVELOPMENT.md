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

### Publishing

1. Create new versions of packages:
```bash
pnpm changeset version
```

2. Build all packages:
```bash
pnpm build
```

3. Publish to npm:
```bash
pnpm changeset publish
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