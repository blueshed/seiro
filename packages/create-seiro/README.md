# create-seiro

Scaffold a new Seiro project.

## Usage

```bash
bunx create-seiro my-app
cd my-app
docker compose up -d
bun run dev
```

## What's Included

The scaffolded project includes:

- **Authentication** - User registration and login with JWT tokens
- **Database** - PostgreSQL with Docker Compose setup
- **Server** - WebSocket server with CQRS pattern
- **Client** - Web Components with Preact Signals
- **Skills** - Claude skills for adding new entities

## Project Structure

```
my-app/
├── auth/              # Authentication types and handlers
├── components/        # Web components
│   ├── auth.ts       # Login/register form
│   └── shared/       # Shared utilities (modal, router)
├── init_db/          # SQL initialization scripts
├── .claude/skills/   # Claude skills for development
├── server.ts         # Server entry point
├── app.ts           # Client entry point
├── types.ts         # Combined types
└── compose.yml      # Docker Compose for PostgreSQL
```

## Adding Features

Use the Claude skills to add new entities:

1. Ask Claude to use the `new-entity` skill
2. Provide entity name and fields
3. Claude generates types, SQL, and handlers

## License

MIT
