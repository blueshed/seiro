<p align="center">
  <img src="seiro-bun.png" alt="Seiro" width="480" />
</p>

# Seiro Monorepo

CQRS over WebSocket with Bun and Preact Signals.

## Packages

- **[seiro](./packages/seiro)** - Core library + domain modelling CLI
- **[create-seiro](./packages/create-seiro)** - CLI scaffolder

## Quick Start

Create a new project:

```bash
bunx create-seiro my-app
cd my-app
docker compose up -d
bun run dev
```

## Domain Modelling

Design your CQRS system with diagrams and consistency checking:

```bash
# Build your model
bunx seiro model add entity Product
bunx seiro model add document Catalogue
bunx seiro model add command product.save
bunx seiro model add event product_saved product.save

# Visualise
bunx seiro model up      # start PlantUML server
bunx seiro model serve   # view diagrams at localhost:3000

# Export for code generation
bunx seiro model export
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
