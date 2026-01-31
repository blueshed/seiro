<p align="center">
  <img src="seiro-bun.png" alt="Seiro" width="480" />
</p>

# Seiro Monorepo

CQRS over WebSocket with Bun and Preact Signals.

## Packages

- **[seiro](./packages/seiro)** - Core library
- **[create-seiro](./packages/create-seiro)** - CLI scaffolder

## Quick Start

Create a new project:

```bash
bunx create-seiro my-app
cd my-app
docker compose up -d
bun run dev
```

## Development

```bash
# Install dependencies
bun install

# Build core library
bun run build

# Run tests
bun test
```

## Structure

```
seiro/
├── packages/
│   ├── seiro/           # Core library (npm: "seiro")
│   └── create-seiro/    # CLI scaffolder (npm: "create-seiro")
├── template/            # Starter template with auth
└── example/             # Full reference app
```

## License

MIT
