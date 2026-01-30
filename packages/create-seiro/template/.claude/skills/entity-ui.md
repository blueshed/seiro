# Entity UI Skill

Create UI components for entities using Web Components and Preact Signals.

## Critical: Research First

1. **Read existing components** - Look at `components/auth.ts` for the pattern
2. **Check app.ts** - See how views are switched
3. **Use shared utilities** - Don't reinvent modals, routing

## Component Architecture

### Initialization Pattern

Components are initialized with the client after connection:

```typescript
// component file
import { signal, effect } from "seiro/client";
import type { Client } from "seiro";
import type { Commands, Queries, Events } from "../types";

type AppClient = Client<Commands, Queries, Events>;

let client: AppClient;

export function initMyEntity(c: AppClient) {
  client = c;

  // Subscribe to events
  client.on("entity_created", handleCreated);
  client.on("entity_updated", handleUpdated);
}

// app.ts - initialize after connect
const profile = await client.connect<User>();
initMyEntity(client);
initAuth(client, profile);  // Auth last - triggers rendering
client.subscribe();
```

### State with Signals

Use signals for reactive state that drives UI updates:

```typescript
import { signal, effect } from "seiro/client";

// Module-level state
const entities = signal<Map<number, Entity>>(new Map());

// Update by creating new Map (immutable pattern)
function addEntity(entity: Entity) {
  const next = new Map(entities.value);
  next.set(entity.id, entity);
  entities.value = next;
}

// Load from query
async function loadEntities() {
  const next = new Map<number, Entity>();
  for await (const row of client.query("entities.all")) {
    next.set(row.id, row);
  }
  entities.value = next;
}
```

### Web Component Structure

```typescript
class EntityList extends HTMLElement {
  private disposeEffects: (() => void)[] = [];

  connectedCallback() {
    this.innerHTML = `<div data-list></div>`;
    const list = this.querySelector("[data-list]")!;

    // React to signal changes
    this.disposeEffects.push(
      effect(() => {
        const items = Array.from(entities.value.values());
        list.innerHTML = items
          .map(e => `<div>${e.name}</div>`)
          .join("") || "<p>None yet</p>";
      })
    );
  }

  disconnectedCallback() {
    // Clean up effects to prevent memory leaks
    for (const dispose of this.disposeEffects) dispose();
    this.disposeEffects = [];
  }
}

customElements.define("entity-list", EntityList);
```

## Routing

### Adding a Route

Routes are handled in `app.ts` with hash-based navigation:

```typescript
import { route, navigate } from "./components/shared/router";

effect(() => {
  const currentRoute = route.value;

  if (currentRoute.startsWith("#/myview")) {
    main.innerHTML = `<my-component></my-component>`;
  }
});
```

### Navigation Links

```html
<a href="#/myview" class="text-zinc-500 hover:text-zinc-300">My View</a>
```

## Shared Utilities

### Modals (components/shared/modal.ts)

```typescript
import { showToast, showInputModal, showConfirmModal, showFormModal } from "./shared/modal";

// Toast notification
showToast("Saved successfully");

// Input modal - returns string or null
const name = await showInputModal("Enter name", "Default value");

// Confirm modal - returns boolean
const confirmed = await showConfirmModal("Delete?", "This cannot be undone.");

// Form modal - returns object or null
const result = await showFormModal("Edit User", [
  { name: "name", label: "Name", required: true },
  { name: "email", label: "Email" },
]);
```

### Router (components/shared/router.ts)

```typescript
import { route, navigate } from "./shared/router";

// Read current route (reactive)
effect(() => {
  if (route.value === "#/myview") {
    // show my view
  }
});

// Navigate programmatically
navigate("#/myview/123");
```

## Checklist

- [ ] Component has `initX(client)` function called from app.ts
- [ ] Event subscriptions set up in init function
- [ ] Signal state with immutable updates (new Map)
- [ ] Effects cleaned up in disconnectedCallback
- [ ] Routes added to app.ts effect
