---
name: model-build
description: Build a CQRS domain model through conversation using seiro model CLI. Use when designing larger systems where you want diagrams, consistency checking, and a formal model before generating code. Captures entities, documents, commands, events, and their relationships in model.db.
---

# Build Domain Model Through Conversation

Guide the user through building a complete CQRS domain model using the seiro model CLI. The model can be visualised with `bunx seiro model serve` and used to generate code with the `model-generate` skill.

## Workflow

### 1. Start with Documents

Ask: "What documents (views) does the user see?"

For each document, capture:
- Name and description
- What entities it contains
- Queries that build it

```bash
bunx seiro model add document Catalogue "All products with parts and faces"
bunx seiro model add doc-entity Catalogue Product
bunx seiro model add doc-entity Catalogue Part
bunx seiro model add doc-entity Catalogue Face
bunx seiro model add query Catalogue products "SELECT id, name, spec, tag_ids FROM products"
```

### 2. Define Entities

For each entity in the documents:
- Name and description
- Attributes with types
- Relationships to other entities

```bash
bunx seiro model add entity Product "A product in the catalogue"
bunx seiro model add attribute Product name string
bunx seiro model add attribute Product spec json
bunx seiro model add relationship Product tagIds Tag --many --reference
bunx seiro model add relationship Product parts Part --many
bunx seiro model add relationship Product faces Face --many
```

Types: `string`, `integer`, `boolean`, `json`, `integer[]`
Options: `--nullable`, `--many`, `--reference`

### 3. Define Commands for Each Document

For each entity in a document, determine what commands change its state. At minimum: save and delete.

```bash
# Command with input type
bunx seiro model add entity ProductSaveCmd
bunx seiro model add attribute ProductSaveCmd id integer --nullable
bunx seiro model add attribute ProductSaveCmd name string
bunx seiro model add attribute ProductSaveCmd spec json
bunx seiro model add attribute ProductSaveCmd tagIds integer[]

bunx seiro model add command product.save --entity ProductSaveCmd
bunx seiro model add command-doc product.save Catalogue
```

### 4. Define Events for Each Command

Each command emits an event with payload describing the change:

```bash
# Event with payload type
bunx seiro model add entity ProductSavedEvt
bunx seiro model add attribute ProductSavedEvt id integer
bunx seiro model add attribute ProductSavedEvt name string
bunx seiro model add attribute ProductSavedEvt spec json
bunx seiro model add attribute ProductSavedEvt tagIds integer[]

bunx seiro model add event product_saved product.save --entity ProductSavedEvt
```

### 5. Ensure Complete Coverage

For each entity in each document, verify:

| Entity | save command | delete command | save event | delete event |
|--------|--------------|----------------|------------|--------------|
| Product | product.save | product.delete | product_saved | product_deleted |
| Part | part.save | part.delete | part_saved | part_deleted |
| Face | face.save | face.delete | face_saved | face_deleted |
| Tag | tag.save | tag.delete | tag_saved | tag_deleted |

This is the minimum surface. Additional commands (e.g., `product.tag`) can be added for specific operations.

### 6. Visualise and Verify

```bash
bunx seiro model up      # start PlantUML server
bunx seiro model serve   # open browser to view diagrams
```

Review:
- Entity diagram - are relationships correct?
- Document diagrams - do they contain the right entities?
- Command coverage - does each document have all needed commands?

### 7. Export for Code Generation

```bash
bunx seiro model export > model.json
```

Then use the `model-generate` skill to create the application code.

## CLI Reference

```bash
# Entities
bunx seiro model add entity <name> [description]
bunx seiro model add attribute <entity> <name> <type> [--nullable]
bunx seiro model add relationship <from> <field> <to> [--many] [--reference]

# Documents
bunx seiro model add document <name> [description]
bunx seiro model add doc-entity <document> <entity>
bunx seiro model add query <document> <name> <sql>

# Commands & Events
bunx seiro model add command <name> [--entity <type>]
bunx seiro model add command-doc <command> <document>
bunx seiro model add event <name> <command> [--entity <type>]

# View
bunx seiro model list entities|documents|commands|events
bunx seiro model serve
bunx seiro model export
```

## Conversation Pattern

1. "What does the user see?" → identify documents
2. "What's in each document?" → identify entities and their attributes
3. "How are they related?" → define relationships
4. "What can change each document?" → define commands per entity
5. "What does each change notify?" → define events
6. "Is the surface complete?" → verify coverage matrix
7. "Let's visualise" → run serve, review diagrams
8. "Ready to generate" → export and use model-generate skill
