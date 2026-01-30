# Seiro Monorepo Plan

Transform wicket into a monorepo with a publishable core library, CLI scaffolder, starter template, and reference example.

## Structure

```
seiro/
├── packages/
│   ├── seiro/                 # npm: "seiro" - core library
│   │   ├── src/
│   │   │   ├── types.ts       # Command<D,R>, Query<P,R>, base types
│   │   │   ├── protocol.ts    # wire types, type guards, encode/decode
│   │   │   ├── server.ts      # createServer()
│   │   │   ├── client.ts      # createClient() + signals re-export
│   │   │   ├── logger.ts      # category-based logging
│   │   │   └── index.ts       # re-exports
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── README.md
│   │
│   └── create-seiro/          # npm: "create-seiro" - CLI scaffolder
│       ├── index.ts           # copies template, runs bun install
│       ├── package.json
│       └── README.md
│
├── template/                   # copied by create-seiro
│   ├── init_db/
│   │   ├── 01_extensions.sql
│   │   ├── 02_auth_tables.sql
│   │   └── 03_auth_functions.sql
│   ├── auth/
│   │   ├── types.ts           # AuthCommands, AuthQueries, AuthEvents
│   │   └── server.ts          # register(), verifyToken(), channels
│   ├── components/
│   │   ├── auth.ts            # login/register form component
│   │   └── shared/
│   │       ├── modal.ts
│   │       ├── icons.ts
│   │       └── router.ts
│   ├── server.ts              # minimal server setup
│   ├── app.ts                 # minimal app shell
│   ├── types.ts               # re-exports auth types
│   ├── compose.yml            # dev postgres on 5432
│   ├── compose.test.yml       # test postgres on 5433
│   ├── server.test.ts         # auth tests only
│   ├── package.json           # depends on "seiro"
│   ├── tsconfig.json
│   ├── .gitignore
│   ├── CLAUDE.md              # project instructions
│   └── .claude/
│       └── skills/
│           ├── new-entity.md
│           └── entity-ui.md
│
├── example/                    # full reference app (shipments)
│   ├── init_db/
│   │   ├── 01_extensions.sql
│   │   ├── 02_auth_tables.sql
│   │   ├── 03_auth_functions.sql
│   │   ├── 04_shipment_tables.sql
│   │   └── 05_shipment_functions.sql
│   ├── auth/
│   │   ├── types.ts
│   │   └── server.ts
│   ├── shipment/
│   │   ├── types.ts
│   │   └── server.ts
│   ├── components/
│   │   ├── auth.ts
│   │   ├── shipments.ts
│   │   └── shared/
│   │       ├── modal.ts
│   │       ├── icons.ts
│   │       └── router.ts
│   ├── server.ts
│   ├── app.ts
│   ├── types.ts
│   ├── compose.yml
│   ├── compose.test.yml
│   ├── server.test.ts
│   ├── package.json           # depends on "seiro"
│   └── tsconfig.json
│
├── package.json               # workspace root
├── README.md                  # monorepo overview
└── .gitignore
```

## Package Details

### packages/seiro

The core library. Minimal, stable, typed.

**package.json:**
```json
{
  "name": "seiro",
  "version": "0.1.0",
  "description": "CQRS over WebSocket with Bun and Preact Signals",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    },
    "./client": {
      "types": "./dist/client.d.ts",
      "import": "./dist/client.js"
    },
    "./server": {
      "types": "./dist/server.d.ts",
      "import": "./dist/server.js"
    },
    "./protocol": {
      "types": "./dist/protocol.d.ts",
      "import": "./dist/protocol.js"
    }
  },
  "files": ["dist", "src"],
  "scripts": {
    "build": "bun run build:js && bun run build:types",
    "build:js": "bun build ./src/index.ts ./src/client.ts ./src/server.ts ./src/protocol.ts --outdir=dist --target=bun --format=esm --splitting",
    "build:types": "tsc --project tsconfig.build.json",
    "prepublishOnly": "bun run build"
  },
  "peerDependencies": {
    "@preact/signals-core": "^1.0.0"
  },
  "peerDependenciesMeta": {
    "@preact/signals-core": {
      "optional": true
    }
  },
  "devDependencies": {
    "@preact/signals-core": "^1.12.2",
    "@types/bun": "latest",
    "typescript": "^5.9.3"
  }
}
```

### packages/create-seiro

CLI to scaffold new projects.

**index.ts:**
```typescript
#!/usr/bin/env bun
import { $ } from "bun";
import { cp, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";

const projectName = process.argv[2];
if (!projectName) {
  console.error("Usage: bunx create-seiro <project-name>");
  process.exit(1);
}

const targetDir = resolve(projectName);
const templateDir = join(import.meta.dir, "../template");

console.log(`Creating ${projectName}...`);

// Copy template
await cp(templateDir, targetDir, { recursive: true });

// Update package.json name
const pkgPath = join(targetDir, "package.json");
const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
pkg.name = projectName;
await writeFile(pkgPath, JSON.stringify(pkg, null, 2));

// Install dependencies
console.log("Installing dependencies...");
await $`cd ${targetDir} && bun install`.quiet();

console.log(`
Done! Next steps:

  cd ${projectName}
  docker compose up -d
  bun run dev
`);
```

**package.json:**
```json
{
  "name": "create-seiro",
  "version": "0.1.0",
  "description": "Scaffold a new Seiro project",
  "type": "module",
  "bin": {
    "create-seiro": "./index.ts"
  },
  "files": ["index.ts", "template"]
}
```

Note: template/ gets copied into the create-seiro package at publish time, or we reference it via the monorepo.

### template/

Minimal starting point with just auth.

**package.json:**
```json
{
  "name": "my-seiro-app",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "bun run --hot server.ts",
    "check": "tsc --noEmit",
    "db": "docker compose down -v && docker compose up -d",
    "down": "docker compose down -v",
    "test": "bun test server.test.ts"
  },
  "dependencies": {
    "seiro": "^0.1.0",
    "@preact/signals-core": "^1.12.2",
    "postgres": "^3.4.8"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "typescript": "^5.9.3"
  }
}
```

**CLAUDE.md:**
```markdown
# Project Dev Context

CQRS over WebSocket. Bun + Preact Signals + Web Components.

## Commands

docker compose up -d   # start database
bun run dev            # server on :3000
bun run check          # typecheck
bun test               # run tests

## Adding Entities

Use the new-entity skill to add new entities with proper types and handlers.

## Type Patterns

Use Command<D, R> and Query<P, R> from seiro:

import type { Command, Query } from "seiro";

export type MyCommands = {
  "thing.create": Command<{ name: string }, { id: number }>;
};

export type MyQueries = {
  "things.all": Query<void, Thing>;
};

## Typed SQL

const rows = await sql<{ query_things_all: Thing }[]>`
  SELECT query_things_all(${ctx.userId})
`;
for (const row of rows) {
  yield row.query_things_all;
}
```

### example/

Full reference implementation showing shipments domain.

Same structure as current wicket example but:
- Depends on `seiro` package (not relative imports)
- Only includes auth + shipments (remove venues, occasions, catalogues)
- Clean demonstration of the pattern

## Migration Steps

### Phase 1: Restructure

1. Create monorepo structure
   ```
   mkdir -p packages/seiro/src packages/create-seiro
   ```

2. Move core library
   ```
   mv src/* packages/seiro/src/
   ```

3. Create package configs
   - packages/seiro/package.json
   - packages/seiro/tsconfig.json
   - packages/seiro/tsconfig.build.json

4. Create root workspace package.json
   ```json
   {
     "name": "seiro-monorepo",
     "private": true,
     "workspaces": ["packages/*", "example", "template"]
   }
   ```

### Phase 2: Template

1. Create template/ directory

2. Copy from example/:
   - compose.yml, compose.test.yml
   - init_db/ (01-03 only - extensions, auth tables, auth functions)
   - auth/ (types.ts, server.ts)
   - components/auth.ts
   - components/shared/ (modal.ts, icons.ts, router.ts)

3. Create minimal:
   - server.ts (just auth)
   - app.ts (login form, placeholder)
   - types.ts (just auth types)
   - server.test.ts (auth tests only)
   - package.json
   - CLAUDE.md

4. Copy skills:
   - .claude/skills/new-entity.md
   - .claude/skills/entity-ui.md

5. Update imports to use `seiro` package instead of relative paths

### Phase 3: Example

1. Rename current example/ or create fresh

2. Keep only:
   - auth/ domain
   - shipment/ domain
   - Related components

3. Remove:
   - venues/, occasions/, catalogues/
   - Their components, SQL, types

4. Update imports to use `seiro` package

### Phase 4: create-seiro CLI

1. Create packages/create-seiro/index.ts

2. Test locally:
   ```
   cd packages/create-seiro
   bun run index.ts test-project
   ```

### Phase 5: Build & Test

1. Build seiro package:
   ```
   cd packages/seiro
   bun run build
   ```

2. Test template:
   ```
   cd template
   bun install
   bun run check
   bun test
   ```

3. Test example:
   ```
   cd example
   bun install
   bun run check
   bun test
   ```

### Phase 6: Publish

1. Create npm account if needed

2. Publish seiro:
   ```
   cd packages/seiro
   npm publish
   ```

3. Publish create-seiro:
   ```
   cd packages/create-seiro
   npm publish
   ```

4. Test end-to-end:
   ```
   bunx create-seiro my-test-app
   cd my-test-app
   docker compose up -d
   bun run dev
   ```

## Files to Create

### New Files

- /package.json (workspace root)
- /packages/seiro/package.json
- /packages/seiro/tsconfig.json
- /packages/seiro/tsconfig.build.json
- /packages/seiro/README.md
- /packages/create-seiro/package.json
- /packages/create-seiro/index.ts
- /packages/create-seiro/README.md
- /template/package.json
- /template/tsconfig.json
- /template/CLAUDE.md
- /template/server.ts
- /template/app.ts
- /template/types.ts
- /template/server.test.ts
- /template/.gitignore

### Files to Move

- /src/* → /packages/seiro/src/

### Files to Copy (then modify)

- /example/compose.yml → /template/compose.yml
- /example/compose.test.yml → /template/compose.test.yml
- /example/init_db/01-03*.sql → /template/init_db/
- /example/auth/* → /template/auth/
- /example/components/auth.ts → /template/components/auth.ts
- /example/components/shared/* → /template/components/shared/
- /.claude/skills/*.md → /template/.claude/skills/

### Files to Remove from Example

- /example/venues/
- /example/occasions/
- /example/catalogues/
- /example/components/venues/
- /example/components/occasions/
- /example/components/catalogues/
- /example/init_db/06-11*.sql (venue, occasion, catalogue SQL)

## Verification

After each phase, verify:

1. **Type check passes**: `bun run check` in each package
2. **Tests pass**: `bun test` in template and example
3. **Dev server works**: `bun run dev` starts without errors
4. **Skills work**: Claude can use new-entity skill to add an entity

## Open Questions

1. **Monorepo tooling**: Use bun workspaces or add turborepo?
   - Recommendation: Start with bun workspaces, simple enough

2. **Template distribution**: Bundle template in create-seiro or fetch from repo?
   - Recommendation: Bundle in package for offline/version consistency

3. **Version sync**: How to keep template seiro version in sync?
   - Recommendation: create-seiro updates template package.json to its version

4. **Skill updates**: How do existing projects get skill updates?
   - Recommendation: Manual for now, document in README. Future: `seiro update-skills` command
