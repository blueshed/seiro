#!/usr/bin/env bun
/**
 * CLI for @seiro/model
 *
 * Usage:
 *   bunx @seiro/model <command> [args] [options]
 *
 * Commands:
 *   serve                          Start the diagram server
 *   add <type> [args]              Add an entity, attribute, relationship, etc.
 *   list <type>                    List entities, documents, commands, etc.
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
@seiro/model - CQRS Domain Modeling CLI

Usage:
  bunx @seiro/model <command> [args] [options]

Commands:
  serve                                    Start the diagram server
  up                                       Start PlantUML server (Docker)
  down                                     Stop PlantUML server (Docker)
  status                                   Check PlantUML server status

  add entity <name> [description]          Add an entity
  add attribute <entity> <name> <type>     Add an attribute to an entity
  add relationship <from> <field> <to>     Add a relationship (use --many for one-to-many)
  add document <name> [description]        Add a document (use --root <entity>)
  add include <document> <entity>          Add an entity to a document (use --alias, --filter)
  add command <name> [description]         Add a command (use --document <doc>)
  add event <name> [description]           Add an event (use --command <cmd>)
  add story <title> <narrative>            Add a story (use --actor <name>)
  add sequence <name> [description]        Add a sequence
  add permission <command> <actor>         Add actor permission to a command

  list entities                            List all entities
  list documents                           List all documents
  list commands                            List all commands
  list events                              List all events
  list stories                             List all stories
  list sequences                           List all sequences

Options:
  --db <path>          Database path (default: model.db, or MODEL_DB env)
  --port <port>        Server port (default: 3000)
  --many               Set cardinality to "many" for relationships
  --actor <name>       Set actor for story
  --nullable           Mark attribute as nullable
  --alias <name>       Alias for document include
  --filter <expr>      Filter expression for document include
  --document <name>    Document for command
  --command <name>     Command that emits an event
  -h, --help           Show this help

Examples:
  bunx @seiro/model add entity User "A system user"
  bunx @seiro/model add attribute User email string
  bunx @seiro/model add attribute User name string
  bunx @seiro/model add relationship User orders Order --many
  bunx @seiro/model add story "User Registration" "As a visitor, I can register" --actor Visitor
  bunx @seiro/model list entities
  bunx @seiro/model serve --port 3001
`);
}

function serve(args: string[]) {
  const { values } = parseArgs({
    args,
    options: {
      db: { type: "string", default: DB_PATH },
      port: { type: "string", default: "3000" },
      "plantuml-server": { type: "string", default: "http://localhost:8080/svg/" },
    },
    allowPositionals: true,
  });

  const server = createServer({
    dbPath: values.db!,
    port: parseInt(values.port!),
    plantUmlServer: values["plantuml-server"],
  });

  console.log(`Domain Model Server running at http://localhost:${server.port}`);
  console.log(`Database: ${values.db}`);
  console.log(`PlantUML server: ${values["plantuml-server"]}`);
}

function add(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      db: { type: "string", default: DB_PATH },
      many: { type: "boolean", default: false },
      actor: { type: "string" },
      nullable: { type: "boolean", default: false },
      description: { type: "string", short: "d" },
      root: { type: "string" },
      alias: { type: "string" },
      filter: { type: "string" },
      document: { type: "string" },
      command: { type: "string" },
    },
    allowPositionals: true,
  });

  const [type, ...rest] = positionals;
  const model = createModel(values.db!);

  try {
    switch (type) {
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
          console.error("Usage: add attribute <entity> <name> <type>");
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
          console.error("Usage: add relationship <from> <field> <to> [--many]");
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
        });
        console.log(`Added relationship "${fromName}.${field}" -> "${toName}" (id: ${id})`);
        break;
      }

      case "document": {
        const [name, description] = rest;
        if (!name) {
          console.error("Usage: add document <name> [description] [--root <entity>]");
          process.exit(1);
        }
        let root_entity_id: number | undefined;
        if (values.root) {
          const rootEntity = model.getEntityByName(values.root);
          if (!rootEntity) {
            console.error(`Entity "${values.root}" not found`);
            process.exit(1);
          }
          root_entity_id = rootEntity.id;
        }
        const id = model.addDocument({ name, description, root_entity_id });
        console.log(`Added document "${name}" (id: ${id})${values.root ? ` with root entity "${values.root}"` : ""}`);
        break;
      }

      case "include": {
        const [documentName, entityName] = rest;
        if (!documentName || !entityName) {
          console.error("Usage: add include <document> <entity> [--alias <name>] [--filter <expr>]");
          process.exit(1);
        }
        const documents = model.getDocuments();
        const document = documents.find(d => d.name === documentName);
        if (!document) {
          console.error(`Document "${documentName}" not found`);
          process.exit(1);
        }
        const entity = model.getEntityByName(entityName);
        if (!entity) {
          console.error(`Entity "${entityName}" not found`);
          process.exit(1);
        }
        const id = model.addDocumentInclude({
          document_id: document.id!,
          entity_id: entity.id!,
          alias: values.alias,
          filter: values.filter,
        });
        console.log(`Added "${entityName}" to document "${documentName}" (id: ${id})`);
        break;
      }

      case "command": {
        const [name, description] = rest;
        if (!name) {
          console.error("Usage: add command <name> [description] [--document <doc>]");
          process.exit(1);
        }
        let document_id: number | undefined;
        if (values.document) {
          const documents = model.getDocuments();
          const doc = documents.find(d => d.name === values.document);
          if (!doc) {
            console.error(`Document "${values.document}" not found`);
            process.exit(1);
          }
          document_id = doc.id;
        }
        const id = model.addCommand({ name, description, document_id });
        console.log(`Added command "${name}" (id: ${id})${values.document ? ` -> ${values.document}` : ""}`);
        break;
      }

      case "event": {
        const [name, description] = rest;
        if (!name) {
          console.error("Usage: add event <name> [description] [--command <cmd>]");
          process.exit(1);
        }
        const id = model.addEvent({ name, description });
        if (values.command) {
          const commands = model.getCommands();
          const cmd = commands.find(c => c.name === values.command);
          if (!cmd) {
            console.error(`Command "${values.command}" not found`);
            process.exit(1);
          }
          model.addCommandEmits(cmd.id!, id);
          console.log(`Added event "${name}" (id: ${id}) emitted by "${values.command}"`);
        } else {
          console.log(`Added event "${name}" (id: ${id})`);
        }
        break;
      }

      case "story": {
        const [title, narrative] = rest;
        if (!title || !narrative) {
          console.error("Usage: add story <title> <narrative> [--actor <name>]");
          process.exit(1);
        }
        const id = model.addStory({ title, narrative, actor: values.actor });
        console.log(`Added story "${title}" (id: ${id})`);
        break;
      }

      case "sequence": {
        const [name, description] = rest;
        if (!name) {
          console.error("Usage: add sequence <name> [description]");
          process.exit(1);
        }
        const id = model.addSequence({ name, description });
        console.log(`Added sequence "${name}" (id: ${id})`);
        break;
      }

      case "permission": {
        const [commandName, actorName] = rest;
        if (!commandName || !actorName) {
          console.error("Usage: add permission <command> <actor>");
          process.exit(1);
        }
        const commands = model.getCommands();
        const command = commands.find(c => c.name === commandName);
        if (!command) {
          console.error(`Command "${commandName}" not found`);
          process.exit(1);
        }
        const id = model.addPermission({ command_id: command.id!, actor: actorName });
        console.log(`Added permission: "${actorName}" can execute "${commandName}" (id: ${id})`);
        break;
      }

      default:
        console.error(`Unknown type: ${type}`);
        console.error("Valid types: entity, attribute, relationship, document, command, event, story, sequence");
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
            const attrs = model.getAttributes(e.id!);
            console.log(`  ${e.id}: ${e.name}${e.description ? ` - ${e.description}` : ""}`);
            for (const a of attrs) {
              console.log(`      ${a.name}: ${a.type}${a.nullable ? "?" : ""}`);
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
            const rootEntity = d.root_entity_id ? model.getEntity(d.root_entity_id) : null;
            const rootStr = rootEntity ? ` [${rootEntity.name}]` : "";
            console.log(`  ${d.id}: ${d.name}${rootStr}${d.description ? ` - ${d.description}` : ""}`);
            const includes = model.getDocumentIncludes(d.id!);
            for (const inc of includes) {
              const entity = model.getEntity(inc.entity_id);
              const aliasStr = inc.alias ? ` as ${inc.alias}` : "";
              const filterStr = inc.filter ? ` where ${inc.filter}` : "";
              console.log(`      + ${entity?.name}${aliasStr}${filterStr}`);
            }
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
            console.log(`  ${c.id}: ${c.name}${c.description ? ` - ${c.description}` : ""}`);
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
            console.log(`  ${e.id}: ${e.name}${e.description ? ` - ${e.description}` : ""}`);
          }
        }
        break;
      }

      case "stories": {
        const stories = model.getStories();
        if (stories.length === 0) {
          console.log("No stories found");
        } else {
          console.log("Stories:");
          for (const s of stories) {
            console.log(`  ${s.id}: ${s.title}${s.actor ? ` (${s.actor})` : ""}`);
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
            console.log(`  ${s.id}: ${s.name}${s.description ? ` - ${s.description}` : ""}`);
          }
        }
        break;
      }

      default:
        console.error(`Unknown type: ${type}`);
        console.error("Valid types: entities, documents, commands, events, stories, sequences");
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
  // Simple test diagram encoded
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

// Main
const args = Bun.argv.slice(2);
const command = args[0];

if (!command || command === "-h" || command === "--help") {
  printHelp();
  process.exit(0);
}

switch (command) {
  case "serve":
    serve(args.slice(1));
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
    add(args.slice(1));
    break;
  case "list":
    list(args.slice(1));
    break;
  default:
    console.error(`Unknown command: ${command}`);
    printHelp();
    process.exit(1);
}
