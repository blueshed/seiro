/**
 * PlantUML Generators for CQRS Domain Model
 *
 * Based on modeling2 patterns - clean, focused generators.
 */
import type { ModelDB } from "./db";
export declare function toId(name: string): string;
export declare function simplifyType(type: string): string;
/** Generate Use Case diagram PUML - all actors and their use cases */
export declare function generateUseCasesPuml(model: ModelDB): string;
/** Generate actor-centric use case diagram PUML */
export declare function generateActorPuml(model: ModelDB, actorName: string): string | null;
/** Generate Class/Entity diagram PUML - domain entities only */
export declare function generateEntitiesPuml(model: ModelDB): string;
/** Generate Commands diagram PUML */
export declare function generateCommandsPuml(model: ModelDB): string;
/** Generate Events diagram PUML */
export declare function generateEventsPuml(model: ModelDB): string;
/** Generate entity detail diagram - focused on one entity and its relations */
export declare function generateEntityPuml(model: ModelDB, entityName: string): string | null;
/** Generate a sequence diagram PUML */
export declare function generateSequencePuml(model: ModelDB, name: string): string | null;
/** Generate a document commands sequence diagram - shows all commands that affect this document */
export declare function generateDocumentCommandsPuml(model: ModelDB, name: string): string | null;
/** Generate a document diagram PUML */
export declare function generateDocumentPuml(model: ModelDB, name: string): string | null;
//# sourceMappingURL=plantuml.d.ts.map