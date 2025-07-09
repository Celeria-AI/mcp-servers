# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a TypeScript monorepo containing MCP (Model Context Protocol) servers developed by Celeria. The project uses pnpm workspaces, Turborepo for build orchestration, and Changesets for version management. Each package is a standalone MCP server that can be published to npm and used as a command-line tool.

## MCP Reference Documentation

When working on MCP server implementations, always reference the official MCP documentation:
- **MCP Specification**: https://modelcontextprotocol.io/llms-full.txt
- This contains the complete protocol specification, message formats, and implementation guidance

## Development Commands

### Essential Commands
- `pnpm install` - Install all dependencies
- `pnpm build` - Build all packages using Turborepo
- `pnpm dev` - Start development mode with file watching
- `pnpm clean` - Clean all build artifacts and node_modules
- `pnpm format` - Format code using Prettier

### Package-specific Commands (run from package directory)
- `pnpm build` - Build single package using tsup
- `pnpm dev` - Watch mode for single package
- `pnpm typecheck` - Type checking with TypeScript
- `pnpm clean` - Clean single package build

### Version Management
- `pnpm changeset` - Create changeset for version bumping
- `pnpm ci:version` - Update package versions (automated)
- `pnpm ci:release` - Build and publish packages (automated)

## Architecture

### Monorepo Structure
- **Root**: Contains workspace configuration, shared tooling (Turborepo, Changesets, ESLint, Prettier)
- **packages/**: Individual MCP server packages
  - Each package is self-contained with its own package.json, tsconfig.json, and tsup.config.ts
  - All packages follow the same structure and build process

### MCP Server Pattern
All MCP servers in this repository follow a consistent pattern:
1. **Entry Point**: `src/index.ts` - Main server implementation
2. **Dependencies**: `@modelcontextprotocol/sdk` for MCP protocol, `zod` for validation
3. **Build**: `tsup` configuration with ESM output and CLI shebang
4. **Transport**: StdioServerTransport for command-line usage
5. **Tools**: Each server exposes domain-specific tools (not resources)

### Key Components
- **McpServer**: Main server class from MCP SDK
- **StdioServerTransport**: Handles stdin/stdout communication
- **Tool Registration**: Each server defines tools using `server.tool()` with Zod schemas
- **Error Handling**: Consistent error response format with `isError: true`

### Package Configuration
Each package uses identical configuration:
- **tsup.config.ts**: ESM output, CLI shebang banner, clean builds
- **package.json**: Consistent scripts, dependencies, and publishing config
- **tsconfig.json**: TypeScript configuration for Node.js ES modules

## Environment Variables

### Asana MCP Server
- `ASANA_ACCESS_TOKEN` - Required for Asana API access

### Mixpanel MCP Server  
- `MIXPANEL_USERNAME` - Required for Mixpanel API access
- `MIXPANEL_SECRET` - Required for Mixpanel API access
- `MIXPANEL_PROJECT_ID` - Optional project ID filter

## Testing and Quality

The project currently uses:
- TypeScript for type checking (`pnpm typecheck`)
- Prettier for code formatting (`pnpm format`)
- ESLint for linting (configured via turbo.json)

When adding new packages, always run `pnpm build` to ensure compilation works correctly.

## Adding New Packages

1. Create directory in `packages/[package-name]`
2. Initialize with `pnpm init`
3. Copy tsup.config.ts, tsconfig.json from existing package
4. Follow the MCP server pattern from existing packages
5. Add appropriate environment variable handling
6. Update package.json with consistent scripts and dependencies