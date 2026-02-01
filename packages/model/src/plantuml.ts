/**
 * PlantUML Generators for CQRS Domain Model
 *
 * Generates class diagrams, sequence diagrams, and component diagrams
 * from the domain model database.
 */

import type { ModelDB, Entity, Attribute, Relationship, Document, Sequence, SequenceStep, Command, Event } from "./db";

// ============================================
// Entity/Class Diagram
// ============================================

export function generateEntityDiagram(model: ModelDB): string {
  const entities = model.getEntities();
  const relationships = model.getRelationships();

  const lines: string[] = [
    "@startuml",
    "skinparam classAttributeIconSize 0",
    "skinparam classFontStyle bold",
    "hide circle",
    ""
  ];

  // Generate classes for each entity
  for (const entity of entities) {
    const attrs = model.getAttributes(entity.id!);
    lines.push(`class ${entity.name} {`);
    for (const attr of attrs) {
      const nullable = attr.nullable ? "?" : "";
      lines.push(`  ${attr.name}: ${attr.type}${nullable}`);
    }
    lines.push("}");
    lines.push("");
  }

  // Generate relationships
  for (const rel of relationships) {
    const fromEntity = model.getEntity(rel.from_entity_id);
    const toEntity = model.getEntity(rel.to_entity_id);
    if (fromEntity && toEntity) {
      const arrow = rel.cardinality === "many" ? '"*"' : '"1"';
      lines.push(`${fromEntity.name} --> ${arrow} ${toEntity.name} : ${rel.from_field}`);
    }
  }

  lines.push("@enduml");
  return lines.join("\n");
}

// ============================================
// Document Component Diagram
// ============================================

export function generateDocumentDiagram(model: ModelDB, documentId?: number): string {
  const documents = documentId
    ? [model.getDocument(documentId)].filter(Boolean)
    : model.getDocuments();

  const lines: string[] = [
    "@startuml",
    "skinparam classAttributeIconSize 0",
    "skinparam classFontStyle bold",
    "hide circle",
    ""
  ];

  for (const doc of documents) {
    if (!doc) continue;

    const includes = model.getDocumentIncludes(doc.id!);
    const rootEntity = doc.root_entity_id ? model.getEntity(doc.root_entity_id) : null;

    // Collect all entities in this document
    const entityIds = new Set<number>();
    if (rootEntity) entityIds.add(rootEntity.id!);
    for (const inc of includes) {
      entityIds.add(inc.entity_id);
    }

    lines.push(`package "${doc.name}" {`);

    // Generate classes for each entity with attributes
    for (const entityId of entityIds) {
      const entity = model.getEntity(entityId);
      if (!entity) continue;

      const attrs = model.getAttributes(entityId);
      const isRoot = rootEntity && entityId === rootEntity.id;
      const stereotype = isRoot ? " <<root>>" : "";

      lines.push(`  class ${entity.name}${stereotype} {`);
      for (const attr of attrs) {
        const nullable = attr.nullable ? "?" : "";
        lines.push(`    ${attr.name}: ${attr.type}${nullable}`);
      }
      lines.push(`  }`);
    }

    lines.push("}");
    lines.push("");

    // Generate relationships between entities in this document
    const allRelationships = model.getRelationships();
    for (const rel of allRelationships) {
      if (entityIds.has(rel.from_entity_id) && entityIds.has(rel.to_entity_id)) {
        const fromEntity = model.getEntity(rel.from_entity_id);
        const toEntity = model.getEntity(rel.to_entity_id);
        if (fromEntity && toEntity) {
          const arrow = rel.cardinality === "many" ? '"*"' : '"1"';
          lines.push(`${fromEntity.name} --> ${arrow} ${toEntity.name} : ${rel.from_field}`);
        }
      }
    }
    lines.push("");
  }

  lines.push("@enduml");
  return lines.join("\n");
}

// ============================================
// Sequence Diagram
// ============================================

export function generateSequenceDiagram(model: ModelDB, sequenceId: number): string {
  const sequence = model.getSequences().find((s) => s.id === sequenceId);
  if (!sequence) {
    return "@startuml\nnote: Sequence not found\n@enduml";
  }

  const steps = model.getSequenceSteps(sequenceId);
  const document = sequence.document_id ? model.getDocument(sequence.document_id) : null;

  const lines: string[] = [
    "@startuml",
    `title ${sequence.name}`,
    ""
  ];

  // Collect participants
  const actors = new Set<string>();
  const commands = new Map<number, Command>();
  const events = new Map<number, Event>();

  for (const step of steps) {
    if (step.actor) actors.add(step.actor);
    if (step.command_id) {
      const cmd = model.getCommand(step.command_id);
      if (cmd) commands.set(cmd.id!, cmd);
    }
    if (step.event_id) {
      const evt = model.getEvents().find((e) => e.id === step.event_id);
      if (evt) events.set(evt.id!, evt);
    }
  }

  // Declare participants
  for (const actor of actors) {
    lines.push(`actor "${actor}" as ${actor.replace(/\s+/g, "_")}`);
  }
  if (document) {
    lines.push(`participant "${document.name}" as doc`);
  }
  for (const cmd of commands.values()) {
    lines.push(`participant "${cmd.name}" as cmd_${cmd.id}`);
  }
  lines.push("");

  // Generate steps
  for (const step of steps) {
    const actorRef = step.actor?.replace(/\s+/g, "_");

    if (step.command_id && actorRef) {
      const cmd = commands.get(step.command_id);
      if (cmd) {
        lines.push(`${actorRef} -> cmd_${cmd.id}: invoke`);
        if (document) {
          lines.push(`cmd_${cmd.id} -> doc: transition`);
        }
      }
    }

    if (step.event_id) {
      const evt = events.get(step.event_id);
      if (evt && document) {
        lines.push(`doc -> ${actorRef || "?"}: ${evt.name}`);
      }
    }

    if (step.note) {
      lines.push(`note right: ${step.note}`);
    }
  }

  lines.push("@enduml");
  return lines.join("\n");
}

// ============================================
// Use Case Diagram (Commands + Permissions)
// ============================================

export function generateUseCaseDiagram(model: ModelDB): string {
  const commands = model.getCommands();
  const sequences = model.getSequences();
  const sequenceNames = new Set(sequences.map(s => s.name));

  const lines: string[] = [
    "@startuml",
    "left to right direction",
    ""
  ];

  // Collect all actors from permissions
  const actors = new Set<string>();
  const commandPerms = new Map<number, string[]>();

  for (const cmd of commands) {
    const perms = model.getPermissions(cmd.id!);
    const cmdActors: string[] = [];
    for (const perm of perms) {
      actors.add(perm.actor);
      cmdActors.push(perm.actor);
    }
    commandPerms.set(cmd.id!, cmdActors);
  }

  // Declare actors - link to stories with this actor
  for (const actor of actors) {
    const actorId = actor.replace(/\s+/g, "_");
    lines.push(`actor "${actor}" as ${actorId}`);
  }
  lines.push("");

  // Declare use cases (commands) - link to sequence if one exists with same name
  lines.push("rectangle Commands {");
  for (const cmd of commands) {
    const seq = sequences.find(s => s.name === cmd.name);
    if (seq) {
      lines.push(`  usecase "${cmd.name}" as uc_${cmd.id} [[#seq-${seq.id}]]`);
    } else {
      lines.push(`  usecase "${cmd.name}" as uc_${cmd.id}`);
    }
  }
  lines.push("}");
  lines.push("");

  // Connect actors to commands
  for (const cmd of commands) {
    const cmdActors = commandPerms.get(cmd.id!) || [];
    for (const actor of cmdActors) {
      lines.push(`${actor.replace(/\s+/g, "_")} --> uc_${cmd.id}`);
    }
  }

  lines.push("@enduml");
  return lines.join("\n");
}

// ============================================
// Full Model Overview
// ============================================

export function generateModelOverview(model: ModelDB): string {
  const entities = model.getEntities();
  const documents = model.getDocuments();
  const commands = model.getCommands();

  const lines: string[] = [
    "@startuml",
    "allowmixing",
    "skinparam packageStyle rectangle",
    "",
    "package Entities {",
  ];

  for (const e of entities) {
    lines.push(`  class ${e.name} [[#entities]]`);
  }
  lines.push("}");
  lines.push("");

  lines.push("package Documents {");
  for (const d of documents) {
    lines.push(`  component "${d.name}" as doc_${d.id} [[#doc-${d.id}]]`);
  }
  lines.push("}");
  lines.push("");

  lines.push("package Commands {");
  for (const c of commands) {
    lines.push(`  usecase "${c.name}" as cmd_${c.id} [[#usecases]]`);
  }
  lines.push("}");
  lines.push("");

  // Connect documents to their root entities
  for (const d of documents) {
    if (d.root_entity_id) {
      const entity = model.getEntity(d.root_entity_id);
      if (entity) {
        lines.push(`doc_${d.id} ..> ${entity.name}`);
      }
    }
  }

  // Connect commands to documents
  for (const c of commands) {
    if (c.document_id) {
      lines.push(`cmd_${c.id} --> doc_${c.document_id}`);
    }
  }

  lines.push("@enduml");
  return lines.join("\n");
}
