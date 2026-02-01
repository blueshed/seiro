---
name: model-generate
description: Generate a seiro application from seiro model export. Use when you have a model.db and want to generate schema.sql, TypeScript types, and command handlers. Run `bunx seiro model export` to get the JSON input.
---

# Generate Seiro Application from Model

Takes the JSON export from seiro model and generates a complete seiro application.

## Usage

```bash
# Get the model export
bunx seiro model export > model.json

# Or pipe directly
bunx seiro model export | # use in generation
```

## Input Format

The export JSON contains:

```json
{
  "entities": [
    {
      "name": "Product",
      "attributes": [
        { "name": "id", "type": "integer" },
        { "name": "name", "type": "string" }
      ],
      "relationships": [
        { "field": "tagIds", "to": "Tag", "many": true, "reference": true }
      ]
    }
  ],
  "documents": [
    {
      "name": "Catalogue",
      "entities": ["Product", "Part", "Face"],
      "queries": [
        { "name": "products", "sql": "SELECT ..." }
      ],
      "commands": [
        {
          "name": "product.save",
          "input": { "name": "ProductSaveCmd", "attributes": [...] },
          "events": [
            { "name": "product_saved", "payload": { "name": "ProductSavedEvt", "attributes": [...] } }
          ]
        }
      ]
    }
  ]
}
```

## Output Files

### 1. SQL Schema (`src/db/schema.sql`)

Generate tables from entities:

```sql
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  spec TEXT NOT NULL,
  tag_ids TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS parts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  child_product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL
);
```

Type mapping:
- `string` → `TEXT`
- `integer` → `INTEGER`
- `json` → `TEXT` (stored as JSON string)
- `integer[]` → `TEXT` (stored as JSON array)
- `boolean` → `INTEGER` (0/1)

Relationships:
- `reference: false` (composition) → foreign key with `ON DELETE CASCADE`
- `reference: true` (association) → stored as `_ids` JSON array

### 2. TypeScript Types (`src/types.ts`)

Generate from entities and command/event types:

```typescript
// Domain entities
export type Product = {
  id: number
  name: string
  spec: Record<string, unknown>
  tagIds: number[]
}

// Command types
export type ProductSaveCmd = {
  id?: number
  name: string
  spec: Record<string, unknown>
  tagIds: number[]
}

// Event types
export type ProductSavedEvt = {
  id: number
  name: string
  spec: Record<string, unknown>
  tagIds: number[]
}

// Document types
export type CatalogueDocument = {
  products: Product[]
  parts: Part[]
  faces: Face[]
}
```

Type mapping:
- `string` → `string`
- `integer` → `number`
- `json` → `Record<string, unknown>`
- `integer[]` → `number[]`
- `boolean` → `boolean`
- `nullable: true` → `| null`

### 3. Command Handlers (`src/commands.ts`)

Generate handler stubs for each command:

```typescript
import type { CommandContext } from "seiro"
import type { Events, ProductSaveCmd } from "./types"
import { db } from "./db"

export async function productSave(
  data: ProductSaveCmd,
  ctx: CommandContext<Events>
): Promise<{ id: number }> {
  const { id, name, spec, tagIds } = data
  
  if (id) {
    // Update
    db.run(
      `UPDATE products SET name = ?, spec = ?, tag_ids = ? WHERE id = ?`,
      [name, JSON.stringify(spec), JSON.stringify(tagIds), id]
    )
  } else {
    // Insert
    const result = db.run(
      `INSERT INTO products (name, spec, tag_ids) VALUES (?, ?, ?)`,
      [name, JSON.stringify(spec), JSON.stringify(tagIds)]
    )
    id = result.lastInsertRowid
  }
  
  ctx.send("product_saved", { id, name, spec, tagIds })
  return { id }
}
```

### 4. Query Handlers (`src/queries.ts`)

Generate from document queries:

```typescript
import { db } from "./db"
import type { Product, Part, Face } from "./types"

export async function* catalogueProducts(): AsyncIterable<Product> {
  const rows = db.query(`SELECT id, name, spec, tag_ids FROM products`).all()
  for (const row of rows) {
    yield {
      id: row.id,
      name: row.name,
      spec: JSON.parse(row.spec),
      tagIds: JSON.parse(row.tag_ids)
    }
  }
}
```

### 5. Server Setup (`src/server.ts`)

Wire up commands and queries:

```typescript
import { createServer } from "seiro"
import type { Commands, Queries, Events } from "./types"
import { productSave, productDelete, ... } from "./commands"
import { catalogueProducts, ... } from "./queries"

const server = createServer<Commands, Queries, Events>()

// Register commands
server.command("product.save", productSave)
server.command("product.delete", productDelete)
// ...

// Register queries  
server.query("catalogue.products", catalogueProducts)
// ...

export { server }
```

## Conventions

Follow the same patterns as the `cqrs-document` skill:

- Commands are `entity.action` (e.g., `product.save`, `product.delete`)
- Events are `entity_actioned` (e.g., `product_saved`, `product_deleted`)
- Save commands handle both create (no id) and update (with id)
- Delete commands return void, emit event with just `{ id }`
- Queries yield rows for streaming
- JSON fields stored as TEXT, parsed on read

## Workflow

1. Run `bunx @seiro/model export` to get JSON
2. Generate schema.sql from entities
3. Generate types.ts from entities + command/event types
4. Generate command handler stubs
5. Generate query handlers from document queries
6. Wire up in server.ts

The generated code is a starting point - handlers will need business logic added.
