/**
 * Domain Model Diagram Server
 *
 * Serves PlantUML diagrams as SVG with caching and live reload.
 */

import { watch, mkdirSync, existsSync, rmSync } from "fs";
import { ModelDB } from "./db";
import { encodePlantUML } from "./encode";
import { generateIndexHtml, generateStoryHtml } from "./html";
import {
  generateEntityDiagram,
  generateDocumentDiagram,
  generateSequenceDiagram,
  generateUseCaseDiagram,
  generateModelOverview,
} from "./plantuml";

export interface ServerOptions {
  dbPath: string;
  port?: number;
  cacheDir?: string;
  plantUmlServer?: string;
}

export function createServer(options: ServerOptions) {
  const {
    dbPath,
    port = 3000,
    cacheDir = ".cache",
    plantUmlServer = "http://localhost:8080/svg/",
  } = options;

  // Ensure cache directories exist
  const cacheDirs = [cacheDir, `${cacheDir}/documents`, `${cacheDir}/sequences`];
  for (const dir of cacheDirs) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }

  // Clear cache function
  function clearCache() {
    for (const dir of cacheDirs) {
      try {
        rmSync(dir, { recursive: true, force: true });
        mkdirSync(dir, { recursive: true });
      } catch {}
    }
    console.log("Cache cleared");
  }

  // Render PUML to SVG via PlantUML server
  async function renderSvg(puml: string): Promise<string> {
    const encoded = encodePlantUML(puml);
    const response = await fetch(plantUmlServer + encoded);
    if (!response.ok) {
      throw new Error(`PlantUML server error: ${response.status}`);
    }
    return response.text();
  }

  // Get or generate cached SVG
  async function getCachedSvg(
    cachePath: string,
    generatePuml: () => string | null
  ): Promise<Response> {
    const file = Bun.file(cachePath);
    if (await file.exists()) {
      return new Response(file, { headers: { "Content-Type": "image/svg+xml" } });
    }

    const puml = generatePuml();
    if (!puml) {
      return new Response("Not found", { status: 404 });
    }

    const svg = await renderSvg(puml);
    await Bun.write(cachePath, svg);
    return new Response(svg, { headers: { "Content-Type": "image/svg+xml" } });
  }

  // Create fresh model connection for each request
  function getModel(): ModelDB {
    return new ModelDB(dbPath);
  }

  // Watch for db changes
  let debounce: Timer | null = null;
  if (existsSync(dbPath)) {
    watch(dbPath, () => {
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        console.log(`${dbPath} changed, clearing cache...`);
        clearCache();
      }, 100);
    });
  }

  // Start server
  return Bun.serve({
    port,
    routes: {
      // Home page
      "/": () => {
        const model = getModel();
        try {
          const html = generateIndexHtml(model);
          return new Response(html, { headers: { "Content-Type": "text/html" } });
        } finally {
          model.close();
        }
      },

      // Overview diagram
      "/overview.svg": async () => {
        const model = getModel();
        try {
          return await getCachedSvg(`${cacheDir}/overview.svg`, () =>
            generateModelOverview(model)
          );
        } finally {
          model.close();
        }
      },

      // Entity diagram
      "/entities.svg": async () => {
        const model = getModel();
        try {
          return await getCachedSvg(`${cacheDir}/entities.svg`, () =>
            generateEntityDiagram(model)
          );
        } finally {
          model.close();
        }
      },

      // Use case diagram
      "/usecases.svg": async () => {
        const model = getModel();
        try {
          return await getCachedSvg(`${cacheDir}/usecases.svg`, () =>
            generateUseCaseDiagram(model)
          );
        } finally {
          model.close();
        }
      },

      // Document diagrams
      "/documents/:id.svg": async (req) => {
        const params = req.params as Record<string, string>;
        const idStr = params["id.svg"]?.replace(".svg", "") ?? params.id;
        const id = parseInt(idStr);
        if (isNaN(id)) return new Response("Not found", { status: 404 });

        const model = getModel();
        try {
          return await getCachedSvg(`${cacheDir}/documents/${id}.svg`, () =>
            generateDocumentDiagram(model, id)
          );
        } finally {
          model.close();
        }
      },

      // Sequence diagrams
      "/sequences/:id.svg": async (req) => {
        const params = req.params as Record<string, string>;
        const idStr = params["id.svg"]?.replace(".svg", "") ?? params.id;
        const id = parseInt(idStr);
        if (isNaN(id)) return new Response("Not found", { status: 404 });

        const model = getModel();
        try {
          return await getCachedSvg(`${cacheDir}/sequences/${id}.svg`, () =>
            generateSequenceDiagram(model, id)
          );
        } finally {
          model.close();
        }
      },

      // Story pages
      "/stories/:id.html": (req) => {
        const params = req.params as Record<string, string>;
        const idStr = params["id.html"]?.replace(".html", "") ?? params.id;
        const id = parseInt(idStr);
        if (isNaN(id)) return new Response("Not found", { status: 404 });

        const model = getModel();
        try {
          const html = generateStoryHtml(model, id);
          if (!html) return new Response("Not found", { status: 404 });
          return new Response(html, { headers: { "Content-Type": "text/html" } });
        } finally {
          model.close();
        }
      },
    },

    // Fallback
    fetch() {
      return new Response("Not found", { status: 404 });
    },
  });
}
