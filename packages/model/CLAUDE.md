# @seiro/model - CQRS Domain Modeling

A story-driven domain modeling tool for designing CQRS systems before implementation.

## Philosophy

**"AI as compiler"** - This tool captures domain knowledge in a pliable form that can evolve through discussion. When the model is stable, AI helps generate seiro implementations.

**Stories → Entities → Documents → Commands → Events → Implementation**

## CLI Usage

The package provides a CLI for managing domain models:

```bash
# From the seiro monorepo root:
bun run model <command> [args] [options]

# Or after publishing:
bunx @seiro/model <command> [args] [options]
```

### Server Commands

```bash
bun run model up                    # Start PlantUML server (Docker)
bun run model down                  # Stop PlantUML server
bun run model status                # Check PlantUML server status
bun run model serve [--port 3000]   # Start the diagram viewer
```

### Adding Model Elements

```bash
# Entities and attributes
bun run model add entity User "A system user"
bun run model add attribute User email string
bun run model add attribute User password_hash string
bun run model add attribute User created_at timestamp --nullable

# Relationships
bun run model add relationship User orders Order --many

# Documents (views)
bun run model add document UserProfile "User's public profile" --root User

# Commands
bun run model add command Register "Register a new user"
bun run model add command Login "Authenticate a user"

# Events
bun run model add event UserRegistered "Emitted when a user registers"
bun run model add event UserLoggedIn "Emitted when a user logs in"

# Permissions (link actors to commands)
bun run model add permission Register Visitor
bun run model add permission Login Visitor

# Stories
bun run model add story "User Registration" "As a visitor, I want to register..." --actor Visitor

# Sequences
bun run model add sequence LoginFlow "The login interaction flow"
```

### Listing Model Elements

```bash
bun run model list entities
bun run model list documents
bun run model list commands
bun run model list events
bun run model list stories
bun run model list sequences
```

### Options

```bash
--db <path>          # Database path (default: model.db, or MODEL_DB env)
--port <port>        # Server port (default: 3000)
--many               # Set cardinality to "many" for relationships
--actor <name>       # Set actor for story
--nullable           # Mark attribute as nullable
--root <entity>      # Set root entity for document
```

## Diagram Server

Start the PlantUML server and diagram viewer:

```bash
bun run model up              # Start PlantUML (Docker)
bun run model serve           # Start viewer at http://localhost:3000
```

Available diagrams:
- **Overview** - High-level model structure
- **Entities** - Class diagram of all entities with attributes
- **Use Cases** - Commands with actor permissions
- **Documents** - Component diagrams per document
- **Sequences** - Interaction flows
- **Stories** - Business narratives

## Core Concepts

### Entities (Primary)
The fundamental data structures. Entities are shared and can appear in multiple documents.

```typescript
model.addEntity({ name: "Shipment", description: "A package to be delivered" });
model.addAttribute({ entity_id: 1, name: "status", type: "text" });
model.addAttribute({ entity_id: 1, name: "driver_id", type: "integer", nullable: true });
```

### Relationships (Primary)
How entities connect. These are the source of truth for joins.

```typescript
model.addRelationship({
  from_entity_id: 1, // Shipment
  from_field: "driver_id",
  to_entity_id: 2,   // Driver
  cardinality: "one"
});
```

### Documents (Views)
Compositions of entities for specific contexts. A document is what an actor sees and operates on.

```typescript
model.addDocument({
  name: "DriverDashboard",
  description: "What the driver sees",
  root_entity_id: 2 // Driver
});
model.addDocumentInclude({
  document_id: 1,
  entity_id: 1, // Shipment
  filter: "driver_id = @user"
});
```

### Commands
Operations that transition a document from one valid state to another.

```typescript
model.addCommand({
  name: "ClaimShipment",
  document_id: 1,
  description: "Driver claims an available shipment"
});
model.addCommandParam({ command_id: 1, name: "shipment_id", type: "integer" });
model.addCommandAffects({ command_id: 1, entity_id: 1, operation: "update" });
```

### Events
Notifications broadcast when commands complete.

```typescript
model.addEvent({ name: "ShipmentClaimed", description: "A shipment was claimed by a driver" });
model.addEventPayload({ event_id: 1, field: "shipment_id", type: "integer" });
model.addCommandEmits(1, 1); // ClaimShipment emits ShipmentClaimed
```

### Sequences
The flow of actor → command → document → event.

```typescript
model.addSequence({ name: "ClaimFlow", document_id: 1 });
model.addSequenceStep({ sequence_id: 1, step_order: 1, actor: "Driver", command_id: 1 });
model.addSequenceStep({ sequence_id: 1, step_order: 2, event_id: 1, note: "Notifies dispatcher" });
```

### Permissions
Who can execute which commands. This drives the use case diagram.

```typescript
model.addPermission({ command_id: 1, actor: "Driver", condition: "status = 'available'" });
```

### Stories (Traceability)
Natural language scenarios that drive the model. Link stories to the artifacts they inform.

```typescript
const storyId = model.addStory({
  title: "Driver claims shipment",
  narrative: "As a driver, I want to claim available shipments so I can make deliveries...",
  actor: "Driver"
});
model.linkStoryCommand(storyId, 1);
model.linkStoryEntity(storyId, 1);
```

## Programmatic Usage

```typescript
import { createModel } from "@seiro/model";
import { generateEntityDiagram, generateUseCaseDiagram } from "@seiro/model/plantuml";

const model = createModel("./model.db");

// Add entities, commands, etc.
model.addEntity({ name: "User" });

// Generate diagrams
const classDiagram = generateEntityDiagram(model);
const useCaseDiagram = generateUseCaseDiagram(model);

model.close();
```

## Workflow

1. **Capture stories** from client discussions
2. **Extract entities** and relationships from stories
3. **Design documents** for each actor's view
4. **Define commands** that transition documents
5. **Specify events** that notify of changes
6. **Map sequences** showing the full flow
7. **Set permissions** for access control
8. **Generate diagrams** for review with client
9. **Iterate** until the model is stable
10. **Generate seiro code** from the model

## From Model to Seiro

When the model is ready, use it to generate seiro scaffolding:

- **Entities** → Database tables
- **Documents** → Query handlers
- **Commands** → Command handlers
- **Events** → Event types and broadcasts
- **Permissions** → Authorization checks

The AI reads the model and helps write the implementation, adapting to your specific needs rather than rigid code generation.
