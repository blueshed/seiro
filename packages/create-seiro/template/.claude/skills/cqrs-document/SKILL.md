---
name: cqrs-document
description: Document-first CQRS design through conversation. Use when designing systems where users see documents (views) that are kept up to date by commands. Outputs SQL migrations and TypeScript types directly - no intermediate DSL. Triggers on discussions about documents, commands, entities, CQRS, Seiro protocol, or system design conversations that involve "what does the user see" questions.
---

# Document-First CQRS Design

Design systems by starting with what the user sees (the document), then deriving entities and commands.

## Core Principle

A document is a composition of entity views. Commands exist to transition the document from one valid state to another. Entities are derived from what's needed to support the documents.

## Conversation Workflow

### 1. Establish the Document

Ask: "What does the user see?"

Capture the shape:
```
Document Venue {
  id, name, location
  sites: [Site { id, name, position, dimensions, area_id? }]
  areas: [Area { id, name, parent_id? }]
}
```

- Nesting implies joins
- `?` means optional/nullable
- `[]` means array/list
- Use entity names, subset fields for views

### 2. Define Commands

Commands that transition the document:
```
commands {
  save_venue(name, location, id?)
  delete_venue(id)
  save_site(venue_id, name, position, dimensions, area_id?, id?)
  delete_site(id)
}
```

Conventions:
- `save_*` for create/update (id absent = create, id present = update)
- Required parameters first, optional `id?` last
- Commands return `{ id }` on success
- `delete_*` with cascade logic documented

### 3. Derive Entities

Extract the minimal tables:
```
venues (id, name, location)
sites (id, venue_id FK, name, position, dimensions, area_id?)
areas (id, venue_id FK, name, parent_id?)
```

### 4. Output Code

Once document is agreed, write directly:

**SQL Migration** - Tables, constraints, command functions with pg_notify
**TypeScript Types** - Document shapes, command/query types for Seiro

## Output Conventions

### SQL Command Functions

```sql
CREATE FUNCTION cmd_entity_save(
  p_required_field text,
  p_optional_field text DEFAULT NULL,
  p_id int DEFAULT NULL
) RETURNS jsonb AS $$
DECLARE
  v_entity entities%ROWTYPE;
BEGIN
  IF p_id IS NULL THEN
    INSERT INTO entities (...) VALUES (...) RETURNING * INTO v_entity;
  ELSE
    UPDATE entities SET ... WHERE id = p_id RETURNING * INTO v_entity;
  END IF;
  
  PERFORM pg_notify('entity_saved', jsonb_build_object(...));
  RETURN jsonb_build_object('id', v_entity.id);
END;
$$ LANGUAGE plpgsql;
```

### SQL Delete with Cascade

```sql
CREATE FUNCTION cmd_entity_delete(p_id int) RETURNS void AS $$
BEGIN
  -- Nullify references before delete
  UPDATE children SET entity_id = NULL WHERE entity_id = p_id;
  DELETE FROM entities WHERE id = p_id;
  PERFORM pg_notify('entity_deleted', jsonb_build_object('id', p_id));
END;
$$ LANGUAGE plpgsql;
```

### TypeScript Document Type

```typescript
export type VenueDocument = {
  id: number
  name: string
  location: string
  sites: Site[]
  areas: Area[]
}

export type Site = {
  id: number
  name: string
  position: { x: number, y: number }
  dimensions: { w: number, h: number }
  area_id: number | null
}
```

## What NOT To Do

- No intermediate DSL or spec files
- No compiler or code generator to maintain
- No UML diagrams
- No abstract entity modelling before documents are clear

## Iteration Pattern

When requirements change:
1. Update the document shape in conversation
2. Identify entity/command changes
3. Write migration SQL
4. Update TypeScript types

The code is the spec. PostgreSQL enforces it. TypeScript checks it.
