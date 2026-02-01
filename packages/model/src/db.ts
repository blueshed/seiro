/**
 * CQRS Domain Model Database
 *
 * Uses bun:sqlite for persistence.
 * Provides typed access to stories, entities, documents, commands, events, and sequences.
 */

import { Database } from "bun:sqlite";
import schema from "./schema.sql" with { type: "text" };

// ============================================
// Types
// ============================================

export interface Story {
  id?: number;
  title: string;
  narrative: string;
  actor?: string;
  created_at?: string;
}

export interface Entity {
  id?: number;
  name: string;
  description?: string;
}

export interface Attribute {
  id?: number;
  entity_id: number;
  name: string;
  type: string;
  nullable?: boolean;
  default_value?: string;
}

export interface Relationship {
  id?: number;
  from_entity_id: number;
  from_field: string;
  to_entity_id: number;
  cardinality?: "one" | "many";
  description?: string;
}

export interface Document {
  id?: number;
  name: string;
  description?: string;
  root_entity_id?: number;
}

export interface DocumentInclude {
  id?: number;
  document_id: number;
  entity_id: number;
  alias?: string;
  filter?: string;
  via_relationship_id?: number;
}

export interface Command {
  id?: number;
  name: string;
  document_id?: number;
  description?: string;
}

export interface CommandParam {
  id?: number;
  command_id: number;
  name: string;
  type: string;
  required?: boolean;
}

export interface CommandAffects {
  id?: number;
  command_id: number;
  entity_id: number;
  operation: "create" | "update" | "delete";
}

export interface Event {
  id?: number;
  name: string;
  description?: string;
}

export interface EventPayload {
  id?: number;
  event_id: number;
  field: string;
  type: string;
}

export interface Sequence {
  id?: number;
  name: string;
  document_id?: number;
  description?: string;
}

export interface SequenceStep {
  id?: number;
  sequence_id: number;
  step_order: number;
  actor?: string;
  command_id?: number;
  event_id?: number;
  note?: string;
}

export interface Permission {
  id?: number;
  command_id: number;
  actor: string;
  condition?: string;
}

// ============================================
// Model Database
// ============================================

export class ModelDB {
  private db: Database;

  constructor(path: string = ":memory:") {
    this.db = new Database(path);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(schema);
  }

  close() {
    this.db.close();
  }

  // --- Stories ---

  addStory(story: Story): number {
    const stmt = this.db.prepare(
      "INSERT INTO stories (title, narrative, actor) VALUES (?, ?, ?)"
    );
    stmt.run(story.title, story.narrative, story.actor ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getStories(): Story[] {
    return this.db.query("SELECT * FROM stories ORDER BY created_at DESC").all() as Story[];
  }

  getStory(id: number): Story | null {
    return this.db.query("SELECT * FROM stories WHERE id = ?").get(id) as Story | null;
  }

  // --- Entities ---

  addEntity(entity: Entity): number {
    const stmt = this.db.prepare(
      "INSERT INTO entities (name, description) VALUES (?, ?)"
    );
    stmt.run(entity.name, entity.description ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getEntities(): Entity[] {
    return this.db.query("SELECT * FROM entities ORDER BY name").all() as Entity[];
  }

  getEntity(id: number): Entity | null {
    return this.db.query("SELECT * FROM entities WHERE id = ?").get(id) as Entity | null;
  }

  getEntityByName(name: string): Entity | null {
    return this.db.query("SELECT * FROM entities WHERE name = ?").get(name) as Entity | null;
  }

  // --- Attributes ---

  addAttribute(attr: Attribute): number {
    const stmt = this.db.prepare(
      "INSERT INTO attributes (entity_id, name, type, nullable, default_value) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(attr.entity_id, attr.name, attr.type, attr.nullable ? 1 : 0, attr.default_value ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getAttributes(entityId: number): Attribute[] {
    return this.db.query("SELECT * FROM attributes WHERE entity_id = ? ORDER BY name").all(entityId) as Attribute[];
  }

  // --- Relationships ---

  addRelationship(rel: Relationship): number {
    const stmt = this.db.prepare(
      "INSERT INTO relationships (from_entity_id, from_field, to_entity_id, cardinality, description) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(rel.from_entity_id, rel.from_field, rel.to_entity_id, rel.cardinality ?? "one", rel.description ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getRelationships(): Relationship[] {
    return this.db.query("SELECT * FROM relationships").all() as Relationship[];
  }

  getRelationshipsFrom(entityId: number): Relationship[] {
    return this.db.query("SELECT * FROM relationships WHERE from_entity_id = ?").all(entityId) as Relationship[];
  }

  // --- Documents ---

  addDocument(doc: Document): number {
    const stmt = this.db.prepare(
      "INSERT INTO documents (name, description, root_entity_id) VALUES (?, ?, ?)"
    );
    stmt.run(doc.name, doc.description ?? null, doc.root_entity_id ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getDocuments(): Document[] {
    return this.db.query("SELECT * FROM documents ORDER BY name").all() as Document[];
  }

  getDocument(id: number): Document | null {
    return this.db.query("SELECT * FROM documents WHERE id = ?").get(id) as Document | null;
  }

  addDocumentInclude(include: DocumentInclude): number {
    const stmt = this.db.prepare(
      "INSERT INTO document_includes (document_id, entity_id, alias, filter, via_relationship_id) VALUES (?, ?, ?, ?, ?)"
    );
    stmt.run(include.document_id, include.entity_id, include.alias ?? null, include.filter ?? null, include.via_relationship_id ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getDocumentIncludes(documentId: number): DocumentInclude[] {
    return this.db.query("SELECT * FROM document_includes WHERE document_id = ?").all(documentId) as DocumentInclude[];
  }

  // --- Commands ---

  addCommand(cmd: Command): number {
    const stmt = this.db.prepare(
      "INSERT INTO commands (name, document_id, description) VALUES (?, ?, ?)"
    );
    stmt.run(cmd.name, cmd.document_id ?? null, cmd.description ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getCommands(): Command[] {
    return this.db.query("SELECT * FROM commands ORDER BY name").all() as Command[];
  }

  getCommand(id: number): Command | null {
    return this.db.query("SELECT * FROM commands WHERE id = ?").get(id) as Command | null;
  }

  addCommandParam(param: CommandParam): number {
    const stmt = this.db.prepare(
      "INSERT INTO command_params (command_id, name, type, required) VALUES (?, ?, ?, ?)"
    );
    stmt.run(param.command_id, param.name, param.type, param.required !== false ? 1 : 0);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getCommandParams(commandId: number): CommandParam[] {
    return this.db.query("SELECT * FROM command_params WHERE command_id = ?").all(commandId) as CommandParam[];
  }

  addCommandAffects(affects: CommandAffects): number {
    const stmt = this.db.prepare(
      "INSERT INTO command_affects (command_id, entity_id, operation) VALUES (?, ?, ?)"
    );
    stmt.run(affects.command_id, affects.entity_id, affects.operation);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  addCommandEmits(commandId: number, eventId: number): void {
    this.db.prepare("INSERT INTO command_emits (command_id, event_id) VALUES (?, ?)").run(commandId, eventId);
  }

  // --- Events ---

  addEvent(event: Event): number {
    const stmt = this.db.prepare(
      "INSERT INTO events (name, description) VALUES (?, ?)"
    );
    stmt.run(event.name, event.description ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getEvents(): Event[] {
    return this.db.query("SELECT * FROM events ORDER BY name").all() as Event[];
  }

  addEventPayload(payload: EventPayload): number {
    const stmt = this.db.prepare(
      "INSERT INTO event_payload (event_id, field, type) VALUES (?, ?, ?)"
    );
    stmt.run(payload.event_id, payload.field, payload.type);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getEventPayload(eventId: number): EventPayload[] {
    return this.db.query("SELECT * FROM event_payload WHERE event_id = ?").all(eventId) as EventPayload[];
  }

  getCommandEvents(commandId: number): Event[] {
    return this.db.query(`
      SELECT e.* FROM events e
      JOIN command_emits ce ON ce.event_id = e.id
      WHERE ce.command_id = ?
    `).all(commandId) as Event[];
  }

  // --- Sequences ---

  addSequence(seq: Sequence): number {
    const stmt = this.db.prepare(
      "INSERT INTO sequences (name, document_id, description) VALUES (?, ?, ?)"
    );
    stmt.run(seq.name, seq.document_id ?? null, seq.description ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getSequences(): Sequence[] {
    return this.db.query("SELECT * FROM sequences ORDER BY name").all() as Sequence[];
  }

  addSequenceStep(step: SequenceStep): number {
    const stmt = this.db.prepare(
      "INSERT INTO sequence_steps (sequence_id, step_order, actor, command_id, event_id, note) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(step.sequence_id, step.step_order, step.actor ?? null, step.command_id ?? null, step.event_id ?? null, step.note ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getSequenceSteps(sequenceId: number): SequenceStep[] {
    return this.db.query("SELECT * FROM sequence_steps WHERE sequence_id = ? ORDER BY step_order").all(sequenceId) as SequenceStep[];
  }

  // --- Permissions ---

  addPermission(perm: Permission): number {
    const stmt = this.db.prepare(
      "INSERT INTO permissions (command_id, actor, condition) VALUES (?, ?, ?)"
    );
    stmt.run(perm.command_id, perm.actor, perm.condition ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as any).id;
  }

  getPermissions(commandId: number): Permission[] {
    return this.db.query("SELECT * FROM permissions WHERE command_id = ?").all(commandId) as Permission[];
  }

  // --- Traceability ---

  linkStoryEntity(storyId: number, entityId: number): void {
    this.db.prepare("INSERT OR IGNORE INTO story_entities (story_id, entity_id) VALUES (?, ?)").run(storyId, entityId);
  }

  linkStoryDocument(storyId: number, documentId: number): void {
    this.db.prepare("INSERT OR IGNORE INTO story_documents (story_id, document_id) VALUES (?, ?)").run(storyId, documentId);
  }

  linkStoryCommand(storyId: number, commandId: number): void {
    this.db.prepare("INSERT OR IGNORE INTO story_commands (story_id, command_id) VALUES (?, ?)").run(storyId, commandId);
  }

  linkStorySequence(storyId: number, sequenceId: number): void {
    this.db.prepare("INSERT OR IGNORE INTO story_sequences (story_id, sequence_id) VALUES (?, ?)").run(storyId, sequenceId);
  }

  getEntityStories(entityId: number): Story[] {
    return this.db.query(`
      SELECT s.* FROM stories s
      JOIN story_entities se ON se.story_id = s.id
      WHERE se.entity_id = ?
    `).all(entityId) as Story[];
  }
}

export function createModel(path?: string): ModelDB {
  return new ModelDB(path);
}
