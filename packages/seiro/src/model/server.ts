/**
 * Dynamic diagram server for CQRS Domain Model
 *
 * Based on modeling2 patterns - uses Bun routes for clean routing.
 */

import { watch, mkdirSync, existsSync, rmSync } from "fs";
import { createModel, type ModelDB } from "./db";
import { encodePlantUML } from "./encode";
import { generateIndexHtml } from "./html";
import {
  toId,
  generateUseCasesPuml,
  generateActorPuml,
  generateEntitiesPuml,
  generateCommandsPuml,
  generateEventsPuml,
  generateEntityPuml,
  generateSequencePuml,
  generateDocumentPuml,
  generateDocumentCommandsPuml,
} from "./plantuml";

export interface ServerOptions {
  dbPath: string;
  port?: number;
  plantUmlServer?: string;
  noCache?: boolean;
}

export function createServer(options: ServerOptions) {
  const {
    dbPath,
    port = 3000,
    plantUmlServer = "http://localhost:8080/svg/",
    noCache = false,
  } = options;

  const cacheDir = "dist";

  // Ensure cache directories exist
  for (const dir of [cacheDir, `${cacheDir}/actors`, `${cacheDir}/sequences`, `${cacheDir}/documents`, `${cacheDir}/document-commands`, `${cacheDir}/entities`]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  // Clear cache
  function clearCache() {
    for (const dir of [`${cacheDir}/actors`, `${cacheDir}/sequences`, `${cacheDir}/documents`, `${cacheDir}/document-commands`, `${cacheDir}/entities`]) {
      try {
        rmSync(dir, { recursive: true, force: true });
        mkdirSync(dir, { recursive: true });
      } catch {}
    }
    for (const file of [`${cacheDir}/use-cases.svg`, `${cacheDir}/entities.svg`, `${cacheDir}/commands.svg`, `${cacheDir}/events.svg`]) {
      try {
        rmSync(file, { force: true });
      } catch {}
    }
    console.log("Cache cleared");
  }

  // Watch for db changes
  let debounce: Timer | null = null;
  try {
    watch(dbPath, () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        console.log("model.db changed, clearing cache...");
        clearCache();
      }, 100);
    });
  } catch {}

  // Render PUML to SVG via PlantUML server
  async function renderSvg(puml: string): Promise<string> {
    const encoded = encodePlantUML(puml);
    const response = await fetch(plantUmlServer + encoded);
    if (!response.ok) {
      throw new Error(`PlantUML server error: ${response.status}`);
    }
    return await response.text();
  }

  // Get or generate cached SVG
  async function getCachedSvg(
    cachePath: string,
    generatePuml: () => string | null,
  ): Promise<Response> {
    // Check cache if enabled
    if (!noCache) {
      const file = Bun.file(cachePath);
      if (await file.exists()) {
        return new Response(file, { headers: { "Content-Type": "image/svg+xml" } });
      }
    }

    const puml = generatePuml();
    if (!puml) {
      return new Response("Not found", { status: 404 });
    }

    const svg = await renderSvg(puml);

    // Write to cache if enabled
    if (!noCache) {
      await Bun.write(cachePath, svg);
    }

    return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
  }

  function getModel(): ModelDB {
    return createModel(dbPath);
  }

  // Generate index HTML with data from database
  function generateDynamicIndexHtml(): string {
    const model = getModel();
    try {
      const actors = model.getActors().map(a => toId(a.name));
      const documents = model.getDocuments().map(d => toId(d.name));
      const sequences = model.getSequences().map(s => toId(s.name));
      const entities = model.getEntities().map(e => toId(e.name));
      const commands = model.getCommands().map(c => ({
        name: c.name,
        documents: model.getCommandDocuments(c.id!).map(d => d.name),
      }));

      return generateIndexHtml(actors, documents, sequences, entities, commands);
    } finally {
      model.close();
    }
  }

  const server = Bun.serve({
    port,
    routes: {
      // Home
      "/": () => new Response(generateDynamicIndexHtml(), {
        headers: { "Content-Type": "text/html" },
      }),

      // Use cases diagram
      "/use-cases.svg": () => {
        const model = getModel();
        try {
          return getCachedSvg(`${cacheDir}/use-cases.svg`, () => generateUseCasesPuml(model));
        } finally {
          model.close();
        }
      },

      // Entities diagram (domain only)
      "/entities.svg": () => {
        const model = getModel();
        try {
          return getCachedSvg(`${cacheDir}/entities.svg`, () => generateEntitiesPuml(model));
        } finally {
          model.close();
        }
      },

      // Commands diagram
      "/commands.svg": () => {
        const model = getModel();
        try {
          return getCachedSvg(`${cacheDir}/commands.svg`, () => generateCommandsPuml(model));
        } finally {
          model.close();
        }
      },

      // Events diagram
      "/events.svg": () => {
        const model = getModel();
        try {
          return getCachedSvg(`${cacheDir}/events.svg`, () => generateEventsPuml(model));
        } finally {
          model.close();
        }
      },

      // Actor diagrams
      "/actors/:file": (req) => {
        const file = req.params.file;
        if (!file.endsWith(".svg")) return new Response("Not found", { status: 404 });
        const slug = file.slice(0, -4);
        const model = getModel();
        try {
          const actors = model.getActors();
          const actor = actors.find(a => toId(a.name) === slug);
          if (!actor) return new Response("Not found", { status: 404 });
          return getCachedSvg(`${cacheDir}/actors/${slug}.svg`, () => generateActorPuml(model, actor.name));
        } finally {
          model.close();
        }
      },

      // Entity detail diagrams
      "/entities/:file": (req) => {
        const file = req.params.file;
        if (!file.endsWith(".svg")) return new Response("Not found", { status: 404 });
        const slug = file.slice(0, -4);
        const model = getModel();
        try {
          const entities = model.getEntities();
          const entity = entities.find(e => toId(e.name) === slug);
          if (!entity) return new Response("Not found", { status: 404 });
          return getCachedSvg(`${cacheDir}/entities/${slug}.svg`, () => generateEntityPuml(model, entity.name));
        } finally {
          model.close();
        }
      },

      // Sequence diagrams
      "/sequences/:file": (req) => {
        const file = req.params.file;
        if (!file.endsWith(".svg")) return new Response("Not found", { status: 404 });
        const slug = file.slice(0, -4);
        const model = getModel();
        try {
          const sequences = model.getSequences();
          const seq = sequences.find(s => toId(s.name) === slug);
          if (!seq) return new Response("Not found", { status: 404 });
          return getCachedSvg(`${cacheDir}/sequences/${slug}.svg`, () => generateSequencePuml(model, seq.name));
        } finally {
          model.close();
        }
      },

      // Document diagrams
      "/documents/:file": (req) => {
        const file = req.params.file;
        if (!file.endsWith(".svg")) return new Response("Not found", { status: 404 });
        const slug = file.slice(0, -4);
        const model = getModel();
        try {
          const documents = model.getDocuments();
          const doc = documents.find(d => toId(d.name) === slug);
          if (!doc) return new Response("Not found", { status: 404 });
          return getCachedSvg(`${cacheDir}/documents/${slug}.svg`, () => generateDocumentPuml(model, doc.name));
        } finally {
          model.close();
        }
      },

      // Document command sequence diagrams
      "/document-commands/:file": (req) => {
        const file = req.params.file;
        if (!file.endsWith(".svg")) return new Response("Not found", { status: 404 });
        const slug = file.slice(0, -4);
        const model = getModel();
        try {
          const documents = model.getDocuments();
          const doc = documents.find(d => toId(d.name) === slug);
          if (!doc) return new Response("Not found", { status: 404 });
          return getCachedSvg(`${cacheDir}/document-commands/${slug}.svg`, () => generateDocumentCommandsPuml(model, doc.name));
        } finally {
          model.close();
        }
      },
    },

    // Fallback for static files
    async fetch(req) {
      const url = new URL(req.url);
      const file = Bun.file(`${cacheDir}${url.pathname}`);
      if (await file.exists()) {
        return new Response(file);
      }
      return new Response("Not found", { status: 404 });
    },
  });

  console.log(`Server running at http://localhost:${port}`);
  console.log(`Watching ${dbPath} for changes...`);

  return server;
}
