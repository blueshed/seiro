/**
 * CQRS Domain Model Database
 *
 * Documents are central - they're what clients get and update.
 * Entities define the shape, sequences show the flow.
 */
import { Database } from "bun:sqlite";
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
export declare class ModelDB {
    db: Database;
    constructor(path?: string);
    close(): void;
    addEntity(entity: Entity): number;
    getEntities(): Entity[];
    getEntity(id: number): Entity | null;
    getEntityByName(name: string): Entity | null;
    addAttribute(attr: Attribute): number;
    getAttributes(entityId: number): Attribute[];
    addRelationship(rel: Relationship): number;
    getRelationships(): Relationship[];
    getRelationshipsFrom(entityId: number): Relationship[];
    addDocument(doc: Document): number;
    getDocuments(): Document[];
    getDocument(id: number): Document | null;
    getDocumentByName(name: string): Document | null;
    addDocumentParam(param: DocumentParam): number;
    getDocumentParams(documentId: number): DocumentParam[];
    addDocumentQuery(query: DocumentQuery): number;
    getDocumentQueries(documentId: number): DocumentQuery[];
    addDocumentEntity(de: DocumentEntity): number;
    getDocumentEntities(documentId: number): Entity[];
    addActor(actor: Actor): number;
    getActors(): Actor[];
    getActorByName(name: string): Actor | null;
    addUseCase(uc: UseCase): number;
    getUseCases(): UseCase[];
    getUseCasesByActor(actorId: number): UseCase[];
    getUseCaseByName(name: string): UseCase | null;
    addCommand(cmd: Command): number;
    getCommands(): Command[];
    getCommandByName(name: string): Command | null;
    addCommandDocument(cd: CommandDocument): number;
    getCommandDocuments(commandId: number): Document[];
    getDocumentCommands(documentId: number): Command[];
    getCommandEvents(commandId: number): Event[];
    addEvent(event: Event): number;
    getEvents(): Event[];
    getEventsByCommand(commandId: number): Event[];
    addParticipant(p: Participant): number;
    getParticipants(): Participant[];
    getParticipantByName(name: string): Participant | null;
    addSequence(seq: Sequence): number;
    getSequences(): Sequence[];
    getSequenceByName(name: string): Sequence | null;
    getSequenceByUseCase(useCaseId: number): Sequence | null;
    addSequenceStep(step: SequenceStep): number;
    getSequenceSteps(sequenceId: number): SequenceStep[];
    getNextStepOrder(sequenceId: number): number;
}
export declare function createModel(path?: string): ModelDB;
//# sourceMappingURL=db.d.ts.map