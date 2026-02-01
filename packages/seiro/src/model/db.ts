/**
 * CQRS Domain Model Database
 *
 * Documents are central - they're what clients get and update.
 * Entities define the shape, sequences show the flow.
 */

import { Database } from "bun:sqlite";
import schema from "./schema.sql" with { type: "text" };

// ============================================
// Types
// ============================================

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
}

export interface Relationship {
  id?: number;
  from_entity_id: number;
  from_field: string;
  to_entity_id: number;
  cardinality?: "one" | "many";
  is_reference?: boolean;
  description?: string;
}

export interface Document {
  id?: number;
  name: string;
  description?: string;
}

export interface DocumentParam {
  id?: number;
  document_id: number;
  name: string;
  type: string;
}

export interface DocumentQuery {
  id?: number;
  document_id: number;
  name: string;
  sql: string;
}

export interface DocumentEntity {
  id?: number;
  document_id: number;
  entity_id: number;
}

export interface Actor {
  id?: number;
  name: string;
  description?: string;
}

export interface UseCase {
  id?: number;
  name: string;
  actor_id: number;
  description?: string;
}

export interface Command {
  id?: number;
  name: string;
  description?: string;
  entity_id?: number;
}

export interface CommandDocument {
  id?: number;
  command_id: number;
  document_id: number;
}

export interface Event {
  id?: number;
  name: string;
  command_id?: number;
  description?: string;
  entity_id?: number;
}

export interface Participant {
  id?: number;
  name: string;
  type: "actor" | "client" | "server" | "database" | "queue";
}

export interface Sequence {
  id?: number;
  name: string;
  use_case_id?: number;
  description?: string;
}

export interface SequenceStep {
  id?: number;
  sequence_id: number;
  step_order: number;
  from_participant_id: number;
  to_participant_id: number;
  message: string;
  step_type?: "call" | "return" | "event" | "subscribe" | "query" | "note";
  note?: string;
}

// ============================================
// Model Database
// ============================================

export class ModelDB {
  db: Database;

  constructor(path: string = ":memory:") {
    this.db = new Database(path);
    this.db.exec("PRAGMA foreign_keys = ON");
    this.db.exec(schema);
  }

  close() {
    this.db.close();
  }

  // --- Entities ---

  addEntity(entity: Entity): number {
    const stmt = this.db.prepare(
      "INSERT INTO entities (name, description) VALUES (?, ?)"
    );
    stmt.run(entity.name, entity.description ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
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
      "INSERT INTO attributes (entity_id, name, type, nullable) VALUES (?, ?, ?, ?)"
    );
    stmt.run(attr.entity_id, attr.name, attr.type, attr.nullable ? 1 : 0);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getAttributes(entityId: number): Attribute[] {
    return this.db.query("SELECT * FROM attributes WHERE entity_id = ? ORDER BY name").all(entityId) as Attribute[];
  }

  // --- Relationships ---

  addRelationship(rel: Relationship): number {
    const stmt = this.db.prepare(
      "INSERT INTO relationships (from_entity_id, from_field, to_entity_id, cardinality, is_reference, description) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      rel.from_entity_id,
      rel.from_field,
      rel.to_entity_id,
      rel.cardinality ?? "one",
      rel.is_reference ? 1 : 0,
      rel.description ?? null
    );
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
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
      "INSERT INTO documents (name, description) VALUES (?, ?)"
    );
    stmt.run(doc.name, doc.description ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getDocuments(): Document[] {
    return this.db.query("SELECT * FROM documents ORDER BY name").all() as Document[];
  }

  getDocument(id: number): Document | null {
    return this.db.query("SELECT * FROM documents WHERE id = ?").get(id) as Document | null;
  }

  getDocumentByName(name: string): Document | null {
    return this.db.query("SELECT * FROM documents WHERE name = ?").get(name) as Document | null;
  }

  // --- Document Params ---

  addDocumentParam(param: DocumentParam): number {
    const stmt = this.db.prepare(
      "INSERT INTO document_params (document_id, name, type) VALUES (?, ?, ?)"
    );
    stmt.run(param.document_id, param.name, param.type);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getDocumentParams(documentId: number): DocumentParam[] {
    return this.db.query("SELECT * FROM document_params WHERE document_id = ?").all(documentId) as DocumentParam[];
  }

  // --- Document Queries ---

  addDocumentQuery(query: DocumentQuery): number {
    const stmt = this.db.prepare(
      "INSERT INTO document_queries (document_id, name, sql) VALUES (?, ?, ?)"
    );
    stmt.run(query.document_id, query.name, query.sql);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getDocumentQueries(documentId: number): DocumentQuery[] {
    return this.db.query("SELECT * FROM document_queries WHERE document_id = ?").all(documentId) as DocumentQuery[];
  }

  // --- Document Entities ---

  addDocumentEntity(de: DocumentEntity): number {
    const stmt = this.db.prepare(
      "INSERT INTO document_entities (document_id, entity_id) VALUES (?, ?)"
    );
    stmt.run(de.document_id, de.entity_id);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getDocumentEntities(documentId: number): Entity[] {
    return this.db.query(`
      SELECT e.* FROM entities e
      JOIN document_entities de ON de.entity_id = e.id
      WHERE de.document_id = ?
      ORDER BY e.name
    `).all(documentId) as Entity[];
  }

  // --- Actors ---

  addActor(actor: Actor): number {
    const stmt = this.db.prepare(
      "INSERT INTO actors (name, description) VALUES (?, ?)"
    );
    stmt.run(actor.name, actor.description ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getActors(): Actor[] {
    return this.db.query("SELECT * FROM actors ORDER BY name").all() as Actor[];
  }

  getActorByName(name: string): Actor | null {
    return this.db.query("SELECT * FROM actors WHERE name = ?").get(name) as Actor | null;
  }

  // --- Use Cases ---

  addUseCase(uc: UseCase): number {
    const stmt = this.db.prepare(
      "INSERT INTO use_cases (name, actor_id, description) VALUES (?, ?, ?)"
    );
    stmt.run(uc.name, uc.actor_id, uc.description ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getUseCases(): UseCase[] {
    return this.db.query("SELECT * FROM use_cases ORDER BY name").all() as UseCase[];
  }

  getUseCasesByActor(actorId: number): UseCase[] {
    return this.db.query("SELECT * FROM use_cases WHERE actor_id = ? ORDER BY name").all(actorId) as UseCase[];
  }

  getUseCaseByName(name: string): UseCase | null {
    return this.db.query("SELECT * FROM use_cases WHERE name = ?").get(name) as UseCase | null;
  }

  // --- Commands ---

  addCommand(cmd: Command): number {
    const stmt = this.db.prepare(
      "INSERT INTO commands (name, description, entity_id) VALUES (?, ?, ?)"
    );
    stmt.run(cmd.name, cmd.description ?? null, cmd.entity_id ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getCommands(): Command[] {
    return this.db.query("SELECT * FROM commands ORDER BY name").all() as Command[];
  }

  getCommandByName(name: string): Command | null {
    return this.db.query("SELECT * FROM commands WHERE name = ?").get(name) as Command | null;
  }

  // --- Command Documents ---

  addCommandDocument(cd: CommandDocument): number {
    const stmt = this.db.prepare(
      "INSERT INTO command_documents (command_id, document_id) VALUES (?, ?)"
    );
    stmt.run(cd.command_id, cd.document_id);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getCommandDocuments(commandId: number): Document[] {
    return this.db.query(`
      SELECT d.* FROM documents d
      JOIN command_documents cd ON cd.document_id = d.id
      WHERE cd.command_id = ?
    `).all(commandId) as Document[];
  }

  getDocumentCommands(documentId: number): Command[] {
    return this.db.query(`
      SELECT c.* FROM commands c
      JOIN command_documents cd ON cd.command_id = c.id
      WHERE cd.document_id = ?
      ORDER BY c.name
    `).all(documentId) as Command[];
  }

  getCommandEvents(commandId: number): Event[] {
    return this.db.query("SELECT * FROM events WHERE command_id = ?").all(commandId) as Event[];
  }

  // --- Events ---

  addEvent(event: Event): number {
    const stmt = this.db.prepare(
      "INSERT INTO events (name, command_id, description, entity_id) VALUES (?, ?, ?, ?)"
    );
    stmt.run(event.name, event.command_id ?? null, event.description ?? null, event.entity_id ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getEvents(): Event[] {
    return this.db.query("SELECT * FROM events ORDER BY name").all() as Event[];
  }

  getEventsByCommand(commandId: number): Event[] {
    return this.db.query("SELECT * FROM events WHERE command_id = ?").all(commandId) as Event[];
  }

  // --- Participants ---

  addParticipant(p: Participant): number {
    const stmt = this.db.prepare(
      "INSERT INTO participants (name, type) VALUES (?, ?)"
    );
    stmt.run(p.name, p.type);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getParticipants(): Participant[] {
    return this.db.query("SELECT * FROM participants ORDER BY name").all() as Participant[];
  }

  getParticipantByName(name: string): Participant | null {
    return this.db.query("SELECT * FROM participants WHERE name = ?").get(name) as Participant | null;
  }

  // --- Sequences ---

  addSequence(seq: Sequence): number {
    const stmt = this.db.prepare(
      "INSERT INTO sequences (name, use_case_id, description) VALUES (?, ?, ?)"
    );
    stmt.run(seq.name, seq.use_case_id ?? null, seq.description ?? null);
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getSequences(): Sequence[] {
    return this.db.query("SELECT * FROM sequences ORDER BY name").all() as Sequence[];
  }

  getSequenceByName(name: string): Sequence | null {
    return this.db.query("SELECT * FROM sequences WHERE name = ?").get(name) as Sequence | null;
  }

  getSequenceByUseCase(useCaseId: number): Sequence | null {
    return this.db.query("SELECT * FROM sequences WHERE use_case_id = ?").get(useCaseId) as Sequence | null;
  }

  // --- Sequence Steps ---

  addSequenceStep(step: SequenceStep): number {
    const stmt = this.db.prepare(
      "INSERT INTO sequence_steps (sequence_id, step_order, from_participant_id, to_participant_id, message, step_type, note) VALUES (?, ?, ?, ?, ?, ?, ?)"
    );
    stmt.run(
      step.sequence_id,
      step.step_order,
      step.from_participant_id,
      step.to_participant_id,
      step.message,
      step.step_type ?? "call",
      step.note ?? null
    );
    return (this.db.query("SELECT last_insert_rowid() as id").get() as { id: number }).id;
  }

  getSequenceSteps(sequenceId: number): SequenceStep[] {
    return this.db.query("SELECT * FROM sequence_steps WHERE sequence_id = ? ORDER BY step_order").all(sequenceId) as SequenceStep[];
  }

  getNextStepOrder(sequenceId: number): number {
    const result = this.db.query("SELECT MAX(step_order) as max_order FROM sequence_steps WHERE sequence_id = ?").get(sequenceId) as { max_order: number | null };
    return (result.max_order ?? 0) + 1;
  }
}

export function createModel(path?: string): ModelDB {
  return new ModelDB(path);
}
