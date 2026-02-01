/**
 * PlantUML Generators for CQRS Domain Model
 *
 * Based on modeling2 patterns - clean, focused generators.
 */

import type { ModelDB } from "./db";

// ==================== HELPERS ====================

export function toId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_");
}

export function simplifyType(type: string): string {
  // Keep array notation (e.g., integer[] stays as integer[])
  const match = type.match(/^(\w+(?:\[\])?)/);
  return match ? match[1] : type;
}

// ==================== USE CASES ====================

/** Generate Use Case diagram PUML - all actors and their use cases */
export function generateUseCasesPuml(model: ModelDB): string {
  const actors = model.getActors();
  const useCases = model.getUseCases();
  const sequences = model.getSequences();
  const sequenceNames = new Set(sequences.map(s => s.name));

  let uml = "@startuml\n";
  uml += "left to right direction\n\n";

  for (const a of actors) {
    uml += `actor "${a.name}" as ${toId(a.name)}\n`;
    if (a.description) {
      uml += `note right of ${toId(a.name)}: ${a.description}\n`;
    }
  }
  uml += "\n";

  uml += "rectangle System {\n";
  for (const uc of useCases) {
    // Link to sequence diagram if one exists for this use case
    if (sequenceNames.has(uc.name)) {
      uml += `  usecase "${uc.name}" as ${toId(uc.name)} [[#seq-${toId(uc.name)}]]\n`;
    } else {
      uml += `  usecase "${uc.name}" as ${toId(uc.name)}\n`;
    }
  }
  uml += "}\n\n";

  for (const uc of useCases) {
    const actor = actors.find(a => a.id === uc.actor_id);
    if (actor) {
      uml += `${toId(actor.name)} --> ${toId(uc.name)}\n`;
    }
  }

  // Add use case descriptions as notes
  for (const uc of useCases) {
    if (uc.description) {
      uml += `note right of ${toId(uc.name)}: ${uc.description}\n`;
    }
  }

  uml += "@enduml\n";
  return uml;
}

/** Generate actor-centric use case diagram PUML */
export function generateActorPuml(model: ModelDB, actorName: string): string | null {
  const actor = model.getActorByName(actorName);
  if (!actor) return null;

  const useCases = model.getUseCasesByActor(actor.id!);
  if (useCases.length === 0) return null;

  const sequences = model.getSequences();
  const sequenceNames = new Set(sequences.map(s => s.name));

  let uml = "@startuml\n";
  uml += "left to right direction\n\n";
  uml += `actor "${actor.name}" as ${toId(actor.name)}\n`;
  if (actor.description) {
    uml += `note right of ${toId(actor.name)}: ${actor.description}\n`;
  }
  uml += "\n";

  uml += `rectangle "${actor.name} Actions" {\n`;
  for (const uc of useCases) {
    if (sequenceNames.has(uc.name)) {
      uml += `  usecase "${uc.name}" as ${toId(uc.name)} [[#seq-${toId(uc.name)}]]\n`;
    } else {
      uml += `  usecase "${uc.name}" as ${toId(uc.name)}\n`;
    }
  }
  uml += "}\n\n";

  for (const uc of useCases) {
    uml += `${toId(actor.name)} --> ${toId(uc.name)}\n`;
  }

  // Add use case descriptions as notes
  for (const uc of useCases) {
    if (uc.description) {
      uml += `note right of ${toId(uc.name)}: ${uc.description}\n`;
    }
  }

  uml += "@enduml\n";
  return uml;
}

// ==================== ENTITIES ====================

/** Check if entity is a command type */
function isCommandEntity(name: string): boolean {
  return name.endsWith("Cmd");
}

/** Check if entity is an event type */
function isEventEntity(name: string): boolean {
  return name.endsWith("Evt");
}

/** Check if entity is a domain entity (not command or event) */
function isDomainEntity(name: string): boolean {
  return !isCommandEntity(name) && !isEventEntity(name);
}

/** Generate Class/Entity diagram PUML - domain entities only */
export function generateEntitiesPuml(model: ModelDB): string {
  const entities = model.getEntities().filter(e => isDomainEntity(e.name));
  const relationships = model.getRelationships();

  let uml = "@startuml\n";
  uml += "title Domain Entities\n";
  uml += "hide empty methods\n\n";

  const entityIds = new Set(entities.map(e => e.id!));

  for (const e of entities) {
    uml += `class ${toId(e.name)} [[#entity-${toId(e.name)}]] {\n`;
    const attrs = model.getAttributes(e.id!);
    for (const attr of attrs) {
      uml += `  ${attr.name}: ${simplifyType(attr.type)}\n`;
    }
    uml += "}\n\n";
  }

  for (const rel of relationships) {
    if (!entityIds.has(rel.from_entity_id) || !entityIds.has(rel.to_entity_id)) continue;
    const fromEntity = model.getEntity(rel.from_entity_id);
    const toEntity = model.getEntity(rel.to_entity_id);
    if (fromEntity && toEntity) {
      const arrow = rel.is_reference ? ".." : "--";
      const toCard = rel.cardinality === "many" ? "*" : "1";
      uml += `${toId(fromEntity.name)} "1" ${arrow}> "${toCard}" ${toId(toEntity.name)} : ${rel.from_field}\n`;
    }
  }

  uml += "@enduml\n";
  return uml;
}

/** Generate Commands diagram PUML */
export function generateCommandsPuml(model: ModelDB): string {
  const entities = model.getEntities().filter(e => isCommandEntity(e.name));

  let uml = "@startuml\n";
  uml += "title Commands\n";
  uml += "hide empty methods\n\n";

  for (const e of entities) {
    uml += `class ${toId(e.name)} <<command>> [[#entity-${toId(e.name)}]] {\n`;
    const attrs = model.getAttributes(e.id!);
    for (const attr of attrs) {
      uml += `  ${attr.name}: ${simplifyType(attr.type)}\n`;
    }
    uml += "}\n\n";
  }

  uml += "@enduml\n";
  return uml;
}

/** Generate Events diagram PUML */
export function generateEventsPuml(model: ModelDB): string {
  const entities = model.getEntities().filter(e => isEventEntity(e.name));

  let uml = "@startuml\n";
  uml += "title Events\n";
  uml += "hide empty methods\n\n";

  for (const e of entities) {
    uml += `class ${toId(e.name)} <<event>> [[#entity-${toId(e.name)}]] {\n`;
    const attrs = model.getAttributes(e.id!);
    for (const attr of attrs) {
      uml += `  ${attr.name}: ${simplifyType(attr.type)}\n`;
    }
    uml += "}\n\n";
  }

  uml += "@enduml\n";
  return uml;
}

/** Generate entity detail diagram - focused on one entity and its relations */
export function generateEntityPuml(model: ModelDB, entityName: string): string | null {
  const entity = model.getEntityByName(entityName);
  if (!entity) return null;

  const relationships = model.getRelationships();
  const relatedEntityIds = new Set<number>();
  relatedEntityIds.add(entity.id!);

  // Find directly related entities
  for (const rel of relationships) {
    if (rel.from_entity_id === entity.id) {
      relatedEntityIds.add(rel.to_entity_id);
    }
    if (rel.to_entity_id === entity.id) {
      relatedEntityIds.add(rel.from_entity_id);
    }
  }

  let uml = "@startuml\n";
  uml += `title ${entity.name}\n`;
  if (entity.description) {
    uml += `caption ${entity.description}\n`;
  }
  uml += "hide empty methods\n\n";

  // Generate classes for related entities
  for (const eid of relatedEntityIds) {
    const e = model.getEntity(eid);
    if (!e) continue;
    const attrs = model.getAttributes(eid);
    const highlight = eid === entity.id ? " <<focus>>" : "";
    uml += `class ${toId(e.name)}${highlight} [[#entity-${toId(e.name)}]] {\n`;
    for (const attr of attrs) {
      uml += `  ${attr.name}: ${simplifyType(attr.type)}\n`;
    }
    uml += "}\n\n";
  }

  // Style the focused entity
  uml += "skinparam class<<focus>> {\n";
  uml += "  BackgroundColor LightBlue\n";
  uml += "}\n\n";

  // Generate relationships between related entities
  for (const rel of relationships) {
    if (relatedEntityIds.has(rel.from_entity_id) && relatedEntityIds.has(rel.to_entity_id)) {
      const fromEntity = model.getEntity(rel.from_entity_id);
      const toEntity = model.getEntity(rel.to_entity_id);
      if (fromEntity && toEntity) {
        const arrow = rel.is_reference ? ".." : "--";
        const toCard = rel.cardinality === "many" ? "*" : "1";
        uml += `${toId(fromEntity.name)} "1" ${arrow}> "${toCard}" ${toId(toEntity.name)} : ${rel.from_field}\n`;
      }
    }
  }

  uml += "@enduml\n";
  return uml;
}

// ==================== SEQUENCES ====================

/** Generate a sequence diagram PUML */
export function generateSequencePuml(model: ModelDB, name: string): string | null {
  const seq = model.getSequenceByName(name);
  if (!seq) return null;

  const steps = model.getSequenceSteps(seq.id!);
  const participants = model.getParticipants();

  // Get actor from use case if linked
  let actorName: string | null = null;
  if (seq.use_case_id) {
    const useCases = model.getUseCases();
    const uc = useCases.find(u => u.id === seq.use_case_id);
    if (uc) {
      const actors = model.getActors();
      const actor = actors.find(a => a.id === uc.actor_id);
      if (actor) actorName = actor.name;
    }
  }

  let uml = "@startuml\n";
  uml += `title ${seq.name}\n`;
  if (seq.description) {
    uml += `caption ${seq.description}\n`;
  }
  uml += "\n";

  // Collect participants used in steps
  const usedParticipantIds = new Set<number>();
  for (const step of steps) {
    usedParticipantIds.add(step.from_participant_id);
    usedParticipantIds.add(step.to_participant_id);
  }

  // Declare participants in order: actor first, then by type
  const participantOrder = ["actor", "client", "server", "database", "queue"];
  const sortedParticipants = participants
    .filter(p => usedParticipantIds.has(p.id!))
    .sort((a, b) => participantOrder.indexOf(a.type) - participantOrder.indexOf(b.type));

  for (const p of sortedParticipants) {
    if (p.type === "actor") {
      uml += `actor "${p.name}" as ${toId(p.name)}\n`;
    } else {
      uml += `participant "${p.name}" as ${toId(p.name)}\n`;
    }
  }
  uml += "\n";

  // Generate steps
  for (const step of steps) {
    const fromP = participants.find(p => p.id === step.from_participant_id);
    const toP = participants.find(p => p.id === step.to_participant_id);
    if (!fromP || !toP) continue;

    const from = toId(fromP.name);
    const to = toId(toP.name);

    switch (step.step_type) {
      case "return":
        uml += `${from} --> ${to}: ${step.message}\n`;
        break;
      case "event":
        uml += `${from} -[#blue]> ${to}: ${step.message}\n`;
        break;
      default:
        uml += `${from} -> ${to}: ${step.message}\n`;
    }

    if (step.note) {
      uml += `note right: ${step.note}\n`;
    }
  }

  uml += "@enduml\n";
  return uml;
}

// ==================== DOCUMENTS ====================

/** Generate a document commands sequence diagram - shows all commands that affect this document */
export function generateDocumentCommandsPuml(model: ModelDB, name: string): string | null {
  const doc = model.getDocumentByName(name);
  if (!doc) return null;

  const commands = model.getDocumentCommands(doc.id!);
  if (commands.length === 0) return null;

  let uml = "@startuml\n";
  uml += `title ${doc.name} Commands\n`;
  if (doc.description) {
    uml += `caption ${doc.description}\n`;
  }
  uml += "\n";

  // Standard CQRS participants
  uml += `actor "User" as user\n`;
  uml += `participant "Client" as client\n`;
  uml += `participant "Server" as server\n`;
  uml += `database "Database" as db\n`;
  uml += "\n";

  // Subscribe to document
  uml += `user -> client: subscribe("${doc.name}")\n`;
  uml += `client -> server: { subscribe: "${doc.name}" }\n`;
  uml += `server --> client: ${doc.name} data\n`;
  uml += "\n";

  // Show each command flow
  for (const cmd of commands) {
    const events = model.getCommandEvents(cmd.id!);
    const event = events.length > 0 ? events[0] : null;
    const eventName = event ? event.name : `${cmd.name}_done`;
    // Convert command name to stored procedure: product.save -> cmd_product_save
    const procName = `cmd_${cmd.name.replace(/\./g, '_')}`;

    // Get command entity for signature and link
    let cmdParams = "...";
    let cmdEntityName: string | null = null;
    if (cmd.entity_id) {
      const cmdEntity = model.getEntity(cmd.entity_id);
      if (cmdEntity) {
        cmdEntityName = cmdEntity.name;
        const attrs = model.getAttributes(cmd.entity_id);
        if (attrs.length > 0) {
          cmdParams = attrs.map(a => a.name).join(", ");
        }
      }
    }

    // Get event entity for payload and link
    let eventPayload = "";
    let eventEntityName: string | null = null;
    if (event?.entity_id) {
      const eventEntity = model.getEntity(event.entity_id);
      if (eventEntity) {
        eventEntityName = eventEntity.name;
        const attrs = model.getAttributes(event.entity_id);
        if (attrs.length > 0) {
          eventPayload = `, { ${attrs.map(a => a.name).join(", ")} }`;
        }
      }
    }

    uml += `== ${cmd.name} ==\n`;
    if (cmd.description) {
      uml += `note over user: ${cmd.description}\n`;
    }

    // Command call - link to entity if available
    if (cmdEntityName) {
      uml += `user -> client: cmd("${cmd.name}", [[#entity-${toId(cmdEntityName)} {${cmdParams}}]])\n`;
    } else {
      uml += `user -> client: cmd("${cmd.name}", { ${cmdParams} })\n`;
    }

    uml += `client -> server: { cmd: "${cmd.name}", data }\n`;
    uml += `server -> db: SELECT ${procName}(${cmdParams})\n`;
    uml += `db --> server: result\n`;

    // Event - link to entity if available
    if (eventEntityName) {
      uml += `server -[#blue]> client: event("${eventName}", [[#entity-${toId(eventEntityName)} {${eventPayload.slice(4, -2)}}]])\n`;
    } else {
      uml += `server -[#blue]> client: event("${eventName}"${eventPayload})\n`;
    }

    uml += `client --> user: update view\n`;
    uml += "\n";
  }

  uml += "@enduml\n";
  return uml;
}

/** Generate a document diagram PUML */
export function generateDocumentPuml(model: ModelDB, name: string): string | null {
  const doc = model.getDocumentByName(name);
  if (!doc) return null;

  const entities = model.getDocumentEntities(doc.id!);
  const queries = model.getDocumentQueries(doc.id!);
  const params = model.getDocumentParams(doc.id!);

  if (entities.length === 0) return null;

  const entityIds = new Set(entities.map(e => e.id!));
  const relationships = model.getRelationships();

  // Find external entities referenced by entities in this document
  const externalEntityIds = new Set<number>();
  for (const rel of relationships) {
    if (entityIds.has(rel.from_entity_id) && !entityIds.has(rel.to_entity_id)) {
      externalEntityIds.add(rel.to_entity_id);
    }
  }

  let uml = "@startuml\n";
  uml += `title Document: ${doc.name}\n`;
  if (doc.description) {
    uml += `caption ${doc.description}\n`;
  }
  uml += "hide empty methods\n";
  uml += "skinparam linetype ortho\n\n";

  // Parameters as note
  if (params.length > 0) {
    uml += `note "Parameters:\\n${params.map(p => `${p.name}: ${p.type}`).join("\\n")}" as params\n\n`;
  }

  // Document entities as full classes
  for (const e of entities) {
    const attrs = model.getAttributes(e.id!);
    uml += `class ${toId(e.name)} [[#entity-${toId(e.name)}]] {\n`;
    for (const attr of attrs) {
      uml += `  ${attr.name}: ${simplifyType(attr.type)}\n`;
    }
    uml += "}\n\n";
  }

  // External entities as simple classes (referenced but in other documents)
  for (const extId of externalEntityIds) {
    const extEntity = model.getEntity(extId);
    if (extEntity) {
      uml += `class ${toId(extEntity.name)} <<external>> [[#entity-${toId(extEntity.name)}]] {\n`;
      uml += "}\n\n";
    }
  }

  // Relationships where source is in this document
  for (const rel of relationships) {
    if (entityIds.has(rel.from_entity_id)) {
      const fromEntity = model.getEntity(rel.from_entity_id);
      const toEntity = model.getEntity(rel.to_entity_id);
      if (fromEntity && toEntity) {
        const arrow = rel.is_reference ? ".." : "*--";
        const toCard = rel.cardinality === "many" ? "*" : "1";
        uml += `${toId(fromEntity.name)} ${arrow} "${toCard}" ${toId(toEntity.name)} : ${rel.from_field}\n`;
      }
    }
  }

  // Queries as note with SQL
  if (queries.length > 0) {
    uml += "\n";
    uml += `note bottom\n`;
    uml += `  <b>Queries</b>\n`;
    for (const q of queries) {
      uml += `  <b>${q.name}</b>: ${q.sql}\n`;
    }
    uml += `end note\n`;
  }

  uml += "@enduml\n";
  return uml;
}
