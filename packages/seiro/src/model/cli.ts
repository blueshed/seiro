#!/usr/bin/env bun
/**
 * CLI for @seiro/model - CQRS Domain Modeling
 *
 * Usage:
 *   bunx @seiro/model <command> [args] [options]
 */

import { parseArgs } from "util";
import { createServer } from "./server";
import { createModel, type ModelDB } from "./db";

const DB_PATH = process.env.MODEL_DB ?? "model.db";

function getModel(): ModelDB {
  return createModel(DB_PATH);
}

function printHelp() {
  console.log(`
seiro model - CQRS Domain Modeling CLI

Usage:
  bunx seiro model <command> [args] [options]

Commands:
  serve                                    Start the diagram server
  up                                       Start PlantUML server (Docker)
  down                                     Stop PlantUML server (Docker)
  status                                   Check PlantUML server status

  # Entities
  add entity <name> [description]          Add an entity
  add attribute <entity> <name> <type>     Add an attribute (use --nullable)
  add relationship <from> <field> <to>     Add a relationship (use --many, --reference)

  # Documents
  add document <name> [description]        Add a document
  add param <document> <name> <type>       Add a parameter to a document
  add query <document> <name> <sql>        Add a query to a document
  add doc-entity <document> <entity>       Add an entity to a document

  # Actors & Use Cases
  add actor <name> [description]           Add an actor
  add usecase <name> <actor> [description] Add a use case for an actor

  # Commands & Events
  add command <name> [description]         Add a command (use --entity <name>)
  add command-doc <command> <document>     Link command to document it affects
  add event <name> <command> [description] Add an event emitted by a command (use --entity <name>)

  # Sequences
  add participant <name> --type <type>     Add a participant (actor|client|server|database|queue)
  add sequence <name> [description]        Add a sequence (use --usecase <name>)
  add step <sequence> <from> <to> <msg>    Add a step (use --type, --note)

  # List
  list entities                            List all entities
  list documents                           List all documents
  list actors                              List all actors
  list usecases                            List all use cases
  list commands                            List all commands
  list events                              List all events
  list participants                        List all participants
  list sequences                           List all sequences

  # Export
  export                                   Export model as JSON for seiro app generation

Options:
  --db <path>          Database path (default: model.db, or MODEL_DB env)
  --port <port>        Server port (default: 3000)
  --no-cache           Disable SVG caching (regenerate on every request)
  --many               Set cardinality to "many" for relationships
  --reference          Mark relationship as reference (by ID, not embedded)
  --nullable           Mark attribute as nullable
  --type <type>        Participant or step type
  --usecase <name>     Link sequence to use case
  --note <text>        Add note to step
  --entity <name>      Link command/event to entity type
  -h, --help           Show this help

Examples:
  bunx seiro model add entity Product "A product in the catalogue"
  bunx seiro model add attribute Product name string
  bunx seiro model add relationship Product tagIds Tag --many --reference
  bunx seiro model add document Catalogue "All products"
  bunx seiro model add query Catalogue products "SELECT * FROM products"
  bunx seiro model add doc-entity Catalogue Product
  bunx seiro model add actor User
  bunx seiro model add usecase "Save Product" User
  bunx seiro model add command product.save
  bunx seiro model add event product_saved product.save
  bunx seiro model add participant Browser --type actor
  bunx seiro model add sequence "Save Product" --usecase "Save Product"
  bunx seiro model add step "Save Product" Browser Server "cmd('product.save')"
  bunx seiro model serve --port 3000
  bunx seiro model serve --no-cache
`);
}

function serve(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      db: { type: "string", default: DB_PATH },
      port: { type: "string", default: "3000" },
      "plantuml-server": { type: "string", default: "http://localhost:8080/svg/" },
      "no-cache": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  createServer({
    dbPath: values.db!,
    port: parseInt(values.port!),
    plantUmlServer: values["plantuml-server"],
    noCache: values["no-cache"],
  });
}

function add(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      db: { type: "string", default: DB_PATH },
      many: { type: "boolean", default: false },
      reference: { type: "boolean", default: false },
      nullable: { type: "boolean", default: false },
      type: { type: "string" },
      usecase: { type: "string" },
      note: { type: "string" },
      entity: { type: "string" },
    },
    allowPositionals: true,
  });

  const [type, ...rest] = positionals;
  const model = createModel(values.db!);

  try {
    switch (type) {
      // --- Entities ---
      case "entity": {
        const [name, description] = rest;
        if (!name) {
          console.error("Usage: add entity <name> [description]");
          process.exit(1);
        }
        const id = model.addEntity({ name, description });
        console.log(`Added entity "${name}" (id: ${id})`);
        break;
      }

      case "attribute": {
        const [entityName, attrName, attrType] = rest;
        if (!entityName || !attrName || !attrType) {
          console.error("Usage: add attribute <entity> <name> <type> [--nullable]");
          process.exit(1);
        }
        const entity = model.getEntityByName(entityName);
        if (!entity) {
          console.error(`Entity "${entityName}" not found`);
          process.exit(1);
        }
        const id = model.addAttribute({
          entity_id: entity.id!,
          name: attrName,
          type: attrType,
          nullable: values.nullable,
        });
        console.log(`Added attribute "${attrName}" to "${entityName}" (id: ${id})`);
        break;
      }

      case "relationship": {
        const [fromName, field, toName] = rest;
        if (!fromName || !field || !toName) {
          console.error("Usage: add relationship <from> <field> <to> [--many] [--reference]");
          process.exit(1);
        }
        const fromEntity = model.getEntityByName(fromName);
        const toEntity = model.getEntityByName(toName);
        if (!fromEntity) {
          console.error(`Entity "${fromName}" not found`);
          process.exit(1);
        }
        if (!toEntity) {
          console.error(`Entity "${toName}" not found`);
          process.exit(1);
        }
        const id = model.addRelationship({
          from_entity_id: fromEntity.id!,
          from_field: field,
          to_entity_id: toEntity.id!,
          cardinality: values.many ? "many" : "one",
          is_reference: values.reference,
        });
        const refStr = values.reference ? " (reference)" : "";
        console.log(`Added relationship "${fromName}.${field}" -> "${toName}"${refStr} (id: ${id})`);
        break;
      }

      // --- Documents ---
      case "document": {
        const [name, description] = rest;
        if (!name) {
          console.error("Usage: add document <name> [description]");
          process.exit(1);
        }
        const id = model.addDocument({ name, description });
        console.log(`Added document "${name}" (id: ${id})`);
        break;
      }

      case "param": {
        const [docName, paramName, paramType] = rest;
        if (!docName || !paramName || !paramType) {
          console.error("Usage: add param <document> <name> <type>");
          process.exit(1);
        }
        const doc = model.getDocumentByName(docName);
        if (!doc) {
          console.error(`Document "${docName}" not found`);
          process.exit(1);
        }
        const id = model.addDocumentParam({
          document_id: doc.id!,
          name: paramName,
          type: paramType,
        });
        console.log(`Added param "${paramName}" to "${docName}" (id: ${id})`);
        break;
      }

      case "query": {
        const [docName, queryName, sql] = rest;
        if (!docName || !queryName || !sql) {
          console.error("Usage: add query <document> <name> <sql>");
          process.exit(1);
        }
        const doc = model.getDocumentByName(docName);
        if (!doc) {
          console.error(`Document "${docName}" not found`);
          process.exit(1);
        }
        const id = model.addDocumentQuery({
          document_id: doc.id!,
          name: queryName,
          sql: sql,
        });
        console.log(`Added query "${queryName}" to "${docName}" (id: ${id})`);
        break;
      }

      case "doc-entity": {
        const [docName, entityName] = rest;
        if (!docName || !entityName) {
          console.error("Usage: add doc-entity <document> <entity>");
          process.exit(1);
        }
        const doc = model.getDocumentByName(docName);
        if (!doc) {
          console.error(`Document "${docName}" not found`);
          process.exit(1);
        }
        const entity = model.getEntityByName(entityName);
        if (!entity) {
          console.error(`Entity "${entityName}" not found`);
          process.exit(1);
        }
        const id = model.addDocumentEntity({
          document_id: doc.id!,
          entity_id: entity.id!,
        });
        console.log(`Added "${entityName}" to document "${docName}" (id: ${id})`);
        break;
      }

      // --- Actors & Use Cases ---
      case "actor": {
        const [name, description] = rest;
        if (!name) {
          console.error("Usage: add actor <name> [description]");
          process.exit(1);
        }
        const id = model.addActor({ name, description });
        console.log(`Added actor "${name}" (id: ${id})`);
        break;
      }

      case "usecase": {
        const [name, actorName, description] = rest;
        if (!name || !actorName) {
          console.error("Usage: add usecase <name> <actor> [description]");
          process.exit(1);
        }
        const actor = model.getActorByName(actorName);
        if (!actor) {
          console.error(`Actor "${actorName}" not found`);
          process.exit(1);
        }
        const id = model.addUseCase({
          name,
          actor_id: actor.id!,
          description,
        });
        console.log(`Added use case "${name}" for "${actorName}" (id: ${id})`);
        break;
      }

      // --- Commands & Events ---
      case "command": {
        const [name, description] = rest;
        if (!name) {
          console.error("Usage: add command <name> [description] [--entity <name>]");
          process.exit(1);
        }
        let entity_id: number | undefined;
        if (values.entity) {
          const entity = model.getEntityByName(values.entity);
          if (!entity) {
            console.error(`Entity "${values.entity}" not found`);
            process.exit(1);
          }
          entity_id = entity.id;
        }
        const id = model.addCommand({ name, description, entity_id });
        console.log(`Added command "${name}"${values.entity ? ` with entity "${values.entity}"` : ""} (id: ${id})`);
        break;
      }

      case "command-doc": {
        const [cmdName, docName] = rest;
        if (!cmdName || !docName) {
          console.error("Usage: add command-doc <command> <document>");
          process.exit(1);
        }
        const cmd = model.getCommandByName(cmdName);
        if (!cmd) {
          console.error(`Command "${cmdName}" not found`);
          process.exit(1);
        }
        const doc = model.getDocumentByName(docName);
        if (!doc) {
          console.error(`Document "${docName}" not found`);
          process.exit(1);
        }
        const id = model.addCommandDocument({
          command_id: cmd.id!,
          document_id: doc.id!,
        });
        console.log(`Linked command "${cmdName}" to document "${docName}" (id: ${id})`);
        break;
      }

      case "event": {
        const [name, cmdName, description] = rest;
        if (!name || !cmdName) {
          console.error("Usage: add event <name> <command> [description] [--entity <name>]");
          process.exit(1);
        }
        const cmd = model.getCommandByName(cmdName);
        if (!cmd) {
          console.error(`Command "${cmdName}" not found`);
          process.exit(1);
        }
        let entity_id: number | undefined;
        if (values.entity) {
          const entity = model.getEntityByName(values.entity);
          if (!entity) {
            console.error(`Entity "${values.entity}" not found`);
            process.exit(1);
          }
          entity_id = entity.id;
        }
        const id = model.addEvent({
          name,
          command_id: cmd.id!,
          description,
          entity_id,
        });
        console.log(`Added event "${name}" emitted by "${cmdName}"${values.entity ? ` with entity "${values.entity}"` : ""} (id: ${id})`);
        break;
      }

      // --- Participants & Sequences ---
      case "participant": {
        const [name] = rest;
        if (!name || !values.type) {
          console.error("Usage: add participant <name> --type <actor|client|server|database|queue>");
          process.exit(1);
        }
        const validTypes = ["actor", "client", "server", "database", "queue"];
        if (!validTypes.includes(values.type)) {
          console.error(`Invalid type "${values.type}". Must be one of: ${validTypes.join(", ")}`);
          process.exit(1);
        }
        const id = model.addParticipant({
          name,
          type: values.type as "actor" | "client" | "server" | "database" | "queue",
        });
        console.log(`Added participant "${name}" (${values.type}) (id: ${id})`);
        break;
      }

      case "sequence": {
        const [name, description] = rest;
        if (!name) {
          console.error("Usage: add sequence <name> [description] [--usecase <name>]");
          process.exit(1);
        }
        let use_case_id: number | undefined;
        if (values.usecase) {
          const uc = model.getUseCaseByName(values.usecase);
          if (!uc) {
            console.error(`Use case "${values.usecase}" not found`);
            process.exit(1);
          }
          use_case_id = uc.id;
        }
        const id = model.addSequence({ name, use_case_id, description });
        console.log(`Added sequence "${name}" (id: ${id})${values.usecase ? ` linked to "${values.usecase}"` : ""}`);
        break;
      }

      case "step": {
        const [seqName, fromName, toName, message] = rest;
        if (!seqName || !fromName || !toName || !message) {
          console.error("Usage: add step <sequence> <from> <to> <message> [--type <type>] [--note <text>]");
          process.exit(1);
        }
        const seq = model.getSequenceByName(seqName);
        if (!seq) {
          console.error(`Sequence "${seqName}" not found`);
          process.exit(1);
        }
        const fromP = model.getParticipantByName(fromName);
        if (!fromP) {
          console.error(`Participant "${fromName}" not found`);
          process.exit(1);
        }
        const toP = model.getParticipantByName(toName);
        if (!toP) {
          console.error(`Participant "${toName}" not found`);
          process.exit(1);
        }
        const stepType = values.type as "call" | "return" | "event" | "subscribe" | "query" | "note" | undefined;
        const validStepTypes = ["call", "return", "event", "subscribe", "query", "note"];
        if (stepType && !validStepTypes.includes(stepType)) {
          console.error(`Invalid step type "${stepType}". Must be one of: ${validStepTypes.join(", ")}`);
          process.exit(1);
        }
        const step_order = model.getNextStepOrder(seq.id!);
        const id = model.addSequenceStep({
          sequence_id: seq.id!,
          step_order,
          from_participant_id: fromP.id!,
          to_participant_id: toP.id!,
          message,
          step_type: stepType,
          note: values.note,
        });
        console.log(`Added step ${step_order}: ${fromName} -> ${toName}: "${message}" (id: ${id})`);
        break;
      }

      default:
        console.error(`Unknown type: ${type}`);
        console.error("Valid types: entity, attribute, relationship, document, param, query, doc-entity, actor, usecase, command, command-doc, event, participant, sequence, step");
        process.exit(1);
    }
  } finally {
    model.close();
  }
}

function list(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      db: { type: "string", default: DB_PATH },
    },
    allowPositionals: true,
  });

  const [type] = positionals;
  const model = createModel(values.db!);

  try {
    switch (type) {
      case "entities": {
        const entities = model.getEntities();
        if (entities.length === 0) {
          console.log("No entities found");
        } else {
          console.log("Entities:");
          for (const e of entities) {
            console.log(`  ${e.id}: ${e.name}${e.description ? ` - ${e.description}` : ""}`);
            const attrs = model.getAttributes(e.id!);
            for (const a of attrs) {
              console.log(`      ${a.name}: ${a.type}${a.nullable ? "?" : ""}`);
            }
            const rels = model.getRelationshipsFrom(e.id!);
            for (const r of rels) {
              const toEntity = model.getEntity(r.to_entity_id);
              const card = r.cardinality === "many" ? "[]" : "";
              const ref = r.is_reference ? " (ref)" : "";
              console.log(`      ${r.from_field}: ${toEntity?.name}${card}${ref}`);
            }
          }
        }
        break;
      }

      case "documents": {
        const documents = model.getDocuments();
        if (documents.length === 0) {
          console.log("No documents found");
        } else {
          console.log("Documents:");
          for (const d of documents) {
            console.log(`  ${d.id}: ${d.name}${d.description ? ` - ${d.description}` : ""}`);
            const params = model.getDocumentParams(d.id!);
            if (params.length > 0) {
              console.log(`      params: ${params.map(p => `${p.name}: ${p.type}`).join(", ")}`);
            }
            const entities = model.getDocumentEntities(d.id!);
            if (entities.length > 0) {
              console.log(`      entities: ${entities.map(e => e.name).join(", ")}`);
            }
            const queries = model.getDocumentQueries(d.id!);
            for (const q of queries) {
              console.log(`      query ${q.name}: ${q.sql.substring(0, 50)}${q.sql.length > 50 ? "..." : ""}`);
            }
          }
        }
        break;
      }

      case "actors": {
        const actors = model.getActors();
        if (actors.length === 0) {
          console.log("No actors found");
        } else {
          console.log("Actors:");
          for (const a of actors) {
            console.log(`  ${a.id}: ${a.name}${a.description ? ` - ${a.description}` : ""}`);
            const useCases = model.getUseCasesByActor(a.id!);
            for (const uc of useCases) {
              console.log(`      -> ${uc.name}`);
            }
          }
        }
        break;
      }

      case "usecases": {
        const useCases = model.getUseCases();
        if (useCases.length === 0) {
          console.log("No use cases found");
        } else {
          console.log("Use Cases:");
          for (const uc of useCases) {
            const actors = model.getActors();
            const actor = actors.find(a => a.id === uc.actor_id);
            console.log(`  ${uc.id}: ${uc.name} (${actor?.name})${uc.description ? ` - ${uc.description}` : ""}`);
          }
        }
        break;
      }

      case "commands": {
        const commands = model.getCommands();
        if (commands.length === 0) {
          console.log("No commands found");
        } else {
          console.log("Commands:");
          for (const c of commands) {
            const docs = model.getCommandDocuments(c.id!);
            const events = model.getEventsByCommand(c.id!);
            const docStr = docs.length > 0 ? ` -> ${docs.map(d => d.name).join(", ")}` : "";
            const eventStr = events.length > 0 ? ` emits ${events.map(e => e.name).join(", ")}` : "";
            console.log(`  ${c.id}: ${c.name}${docStr}${eventStr}`);
          }
        }
        break;
      }

      case "events": {
        const events = model.getEvents();
        if (events.length === 0) {
          console.log("No events found");
        } else {
          console.log("Events:");
          for (const e of events) {
            const cmd = e.command_id ? model.getCommands().find(c => c.id === e.command_id) : null;
            const cmdStr = cmd ? ` (from ${cmd.name})` : "";
            console.log(`  ${e.id}: ${e.name}${cmdStr}${e.description ? ` - ${e.description}` : ""}`);
          }
        }
        break;
      }

      case "participants": {
        const participants = model.getParticipants();
        if (participants.length === 0) {
          console.log("No participants found");
        } else {
          console.log("Participants:");
          for (const p of participants) {
            console.log(`  ${p.id}: ${p.name} (${p.type})`);
          }
        }
        break;
      }

      case "sequences": {
        const sequences = model.getSequences();
        if (sequences.length === 0) {
          console.log("No sequences found");
        } else {
          console.log("Sequences:");
          for (const s of sequences) {
            const uc = s.use_case_id ? model.getUseCases().find(u => u.id === s.use_case_id) : null;
            const ucStr = uc ? ` (use case: ${uc.name})` : "";
            console.log(`  ${s.id}: ${s.name}${ucStr}`);
            const steps = model.getSequenceSteps(s.id!);
            const participants = model.getParticipants();
            for (const step of steps) {
              const from = participants.find(p => p.id === step.from_participant_id);
              const to = participants.find(p => p.id === step.to_participant_id);
              const typeStr = step.step_type && step.step_type !== "call" ? ` [${step.step_type}]` : "";
              console.log(`      ${step.step_order}. ${from?.name} -> ${to?.name}: ${step.message}${typeStr}`);
            }
          }
        }
        break;
      }

      default:
        console.error(`Unknown type: ${type}`);
        console.error("Valid types: entities, documents, actors, usecases, commands, events, participants, sequences");
        process.exit(1);
    }
  } finally {
    model.close();
  }
}

async function up() {
  const composeFile = new URL("../compose.yml", import.meta.url).pathname;
  const proc = Bun.spawn(["docker", "compose", "-f", composeFile, "up", "-d"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
  if (proc.exitCode === 0) {
    console.log("PlantUML server started at http://localhost:8080");
  }
}

async function down() {
  const composeFile = new URL("../compose.yml", import.meta.url).pathname;
  const proc = Bun.spawn(["docker", "compose", "-f", composeFile, "down"], {
    stdout: "inherit",
    stderr: "inherit",
  });
  await proc.exited;
}

async function status() {
  const plantUmlServer = process.env.PLANTUML_SERVER ?? "http://localhost:8080";
  const testUrl = `${plantUmlServer}/png/SoWkIImgAStDuNBAJrBGjLDmpCbCJbMmKiX8pSd9vt98pKi1IW80`;
  try {
    const response = await fetch(testUrl, { method: "HEAD" });
    if (response.ok) {
      console.log(`PlantUML server is running at ${plantUmlServer}`);
    } else {
      console.log(`PlantUML server returned ${response.status}`);
      process.exit(1);
    }
  } catch (e) {
    console.log(`PlantUML server is not reachable at ${plantUmlServer}`);
    process.exit(1);
  }
}

function exportModel(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      db: { type: "string", default: DB_PATH },
    },
    allowPositionals: true,
  });

  const model = createModel(values.db!);

  try {
    // Helper to check if entity is a domain entity (not Cmd/Evt)
    const isDomainEntity = (name: string) => !name.endsWith("Cmd") && !name.endsWith("Evt");

    // Build entities with attributes and relationships
    const allEntities = model.getEntities();
    const entities = allEntities
      .filter(e => isDomainEntity(e.name))
      .map(e => {
        const attrs = model.getAttributes(e.id!);
        const rels = model.getRelationshipsFrom(e.id!);
        return {
          name: e.name,
          description: e.description,
          attributes: attrs.map(a => ({
            name: a.name,
            type: a.type,
            nullable: a.nullable,
          })),
          relationships: rels.map(r => {
            const toEntity = model.getEntity(r.to_entity_id);
            return {
              field: r.from_field,
              to: toEntity?.name,
              many: r.cardinality === "many",
              reference: r.is_reference,
            };
          }),
        };
      });

    // Build documents with queries, entities, and commands
    const documents = model.getDocuments().map(d => {
      const docEntities = model.getDocumentEntities(d.id!);
      const queries = model.getDocumentQueries(d.id!);
      const commands = model.getDocumentCommands(d.id!);

      return {
        name: d.name,
        description: d.description,
        entities: docEntities.map(e => e.name),
        queries: queries.map(q => ({
          name: q.name,
          sql: q.sql,
        })),
        commands: commands.map(c => {
          const events = model.getCommandEvents(c.id!);

          // Get command entity type
          let input = null;
          if (c.entity_id) {
            const cmdEntity = model.getEntity(c.entity_id);
            if (cmdEntity) {
              const cmdAttrs = model.getAttributes(cmdEntity.id!);
              input = {
                name: cmdEntity.name,
                attributes: cmdAttrs.map(a => ({
                  name: a.name,
                  type: a.type,
                  nullable: a.nullable,
                })),
              };
            }
          }

          // Get event entity types
          const eventData = events.map(ev => {
            let payload = null;
            if (ev.entity_id) {
              const evtEntity = model.getEntity(ev.entity_id);
              if (evtEntity) {
                const evtAttrs = model.getAttributes(evtEntity.id!);
                payload = {
                  name: evtEntity.name,
                  attributes: evtAttrs.map(a => ({
                    name: a.name,
                    type: a.type,
                    nullable: a.nullable,
                  })),
                };
              }
            }
            return {
              name: ev.name,
              payload,
            };
          });

          return {
            name: c.name,
            description: c.description,
            input,
            events: eventData,
          };
        }),
      };
    });

    const output = {
      entities,
      documents,
    };

    console.log(JSON.stringify(output, null, 2));
  } finally {
    model.close();
  }
}

// Main function for CLI
export async function main(argv: string[]) {
  const command = argv[0];

  if (!command || command === "-h" || command === "--help") {
    printHelp();
    process.exit(0);
  }

  switch (command) {
    case "serve":
      serve(argv.slice(1));
      break;
    case "up":
      await up();
      break;
    case "down":
      await down();
      break;
    case "status":
      await status();
      break;
    case "add":
      add(argv.slice(1));
      break;
    case "list":
      list(argv.slice(1));
      break;
    case "export":
      exportModel(argv.slice(1));
      break;
    default:
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  await main(Bun.argv.slice(2));
}
