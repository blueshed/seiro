/**
 * HTML Generation for Domain Model Viewer
 *
 * Generates index page with navigation sidebar and diagram viewer.
 */

import type { ModelDB } from "./db";

export interface NavItem {
  id: string;
  label: string;
  type: "svg" | "html";
  path: string;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

/**
 * Generate navigation data from the model.
 */
export function generateNavData(model: ModelDB): Record<string, NavSection> {
  const documents = model.getDocuments();
  const sequences = model.getSequences();
  const stories = model.getStories();

  return {
    overview: {
      label: "Overview",
      items: [
        { id: "overview", label: "Model Overview", type: "svg", path: "/overview.svg" },
        { id: "entities", label: "Entity Diagram", type: "svg", path: "/entities.svg" },
        { id: "usecases", label: "Use Cases", type: "svg", path: "/usecases.svg" },
      ],
    },
    documents: {
      label: "Documents",
      items: documents.map((d) => ({
        id: `doc-${d.id}`,
        label: d.name,
        type: "svg" as const,
        path: `/documents/${d.id}.svg`,
      })),
    },
    sequences: {
      label: "Sequences",
      items: sequences.map((s) => ({
        id: `seq-${s.id}`,
        label: s.name,
        type: "svg" as const,
        path: `/sequences/${s.id}.svg`,
      })),
    },
    stories: {
      label: "Stories",
      items: stories.map((s) => ({
        id: `story-${s.id}`,
        label: s.title,
        type: "html" as const,
        path: `/stories/${s.id}.html`,
      })),
    },
  };
}

/**
 * Generate the index HTML page with navigation and diagram viewer.
 */
export function generateIndexHtml(model: ModelDB): string {
  const nav = generateNavData(model);
  const stats = {
    entities: model.getEntities().length,
    documents: model.getDocuments().length,
    sequences: model.getSequences().length,
    commands: model.getCommands().length,
    stories: model.getStories().length,
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Domain Model Viewer</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; color: #333; }
    header { background: #2c3e50; color: white; padding: 1.5rem 2rem; position: sticky; top: 0; z-index: 100; }
    header h1 { font-size: 1.5rem; font-weight: 500; }
    header p { opacity: 0.8; font-size: 0.9rem; margin-top: 0.25rem; }
    .container { display: flex; min-height: calc(100vh - 80px); }
    nav { width: 260px; background: white; border-right: 1px solid #ddd; padding: 1rem 0; overflow-y: auto; position: sticky; top: 80px; height: calc(100vh - 80px); flex-shrink: 0; }
    nav h2 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: #666; padding: 0.75rem 1.25rem 0.5rem; margin-top: 0.5rem; }
    nav h2:first-child { margin-top: 0; }
    nav a { display: block; padding: 0.5rem 1.25rem; color: #333; text-decoration: none; font-size: 0.9rem; border-left: 3px solid transparent; }
    nav a:hover { background: #f0f0f0; }
    nav a.active { background: #e8f4fc; border-left-color: #3498db; color: #2980b9; }
    main { flex: 1; padding: 2rem; overflow-x: auto; }
    .diagram-container { background: white; border-radius: 8px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: auto; }
    .diagram-container svg { max-width: 100%; height: auto; }
    .stats { display: flex; gap: 2rem; margin-bottom: 2rem; flex-wrap: wrap; }
    .stat { text-align: center; min-width: 80px; }
    .stat-value { font-size: 2rem; font-weight: 600; color: #3498db; }
    .stat-label { font-size: 0.8rem; color: #666; text-transform: uppercase; }
    .loading { color: #666; font-style: italic; }
    .error { color: #e74c3c; }
    .story { padding: 1rem; }
    .story-meta { font-size: 0.85rem; color: #666; margin-bottom: 0.5rem; }
    .story-narrative { line-height: 1.6; white-space: pre-wrap; }
    .story-actor { margin-top: 1rem; font-size: 0.9rem; color: #2980b9; }
  </style>
</head>
<body>
  <header>
    <h1>Domain Model Viewer</h1>
    <p>CQRS Domain Model Diagrams</p>
  </header>
  <div class="container">
    <nav id="nav"></nav>
    <main id="main"></main>
  </div>
  <script>
    const sections = ${JSON.stringify(nav)};
    const stats = ${JSON.stringify(stats)};

    function renderNav() {
      const nav = document.getElementById('nav');
      let html = '<a href="#home" data-id="home">Home</a>';
      for (const [key, section] of Object.entries(sections)) {
        if (section.items.length === 0) continue;
        html += '<h2>' + section.label + '</h2>';
        section.items.forEach(item => {
          html += '<a href="#' + item.id + '" data-id="' + item.id + '">' + item.label + '</a>';
        });
      }
      nav.innerHTML = html;
    }

    function renderHome() {
      return '<div class="stats">' +
        '<div class="stat"><div class="stat-value">' + stats.entities + '</div><div class="stat-label">Entities</div></div>' +
        '<div class="stat"><div class="stat-value">' + stats.documents + '</div><div class="stat-label">Documents</div></div>' +
        '<div class="stat"><div class="stat-value">' + stats.sequences + '</div><div class="stat-label">Sequences</div></div>' +
        '<div class="stat"><div class="stat-value">' + stats.commands + '</div><div class="stat-label">Commands</div></div>' +
        '<div class="stat"><div class="stat-value">' + stats.stories + '</div><div class="stat-label">Stories</div></div>' +
        '</div>' +
        '<p>Select a diagram from the sidebar to view it.</p>';
    }

    function findItem(id) {
      for (const section of Object.values(sections)) {
        const item = section.items.find(i => i.id === id);
        if (item) return item;
      }
      return null;
    }

    async function render() {
      const hash = window.location.hash.slice(1) || 'home';
      const main = document.getElementById('main');

      // Update active state in nav
      document.querySelectorAll('nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.id === hash);
      });

      if (hash === 'home') {
        main.innerHTML = '<div class="diagram-container">' + renderHome() + '</div>';
        return;
      }

      const item = findItem(hash);
      if (!item) {
        main.innerHTML = '<div class="diagram-container error">Not found</div>';
        return;
      }

      main.innerHTML = '<div class="diagram-container loading">Loading...</div>';

      try {
        const response = await fetch(item.path);
        if (!response.ok) throw new Error('Failed to load');
        const content = await response.text();
        main.innerHTML = '<div class="diagram-container">' + content + '</div>';
      } catch (e) {
        main.innerHTML = '<div class="diagram-container error">Failed to load diagram</div>';
      }
    }

    renderNav();
    render();
    window.addEventListener('hashchange', render);
  </script>
</body>
</html>`;
}

/**
 * Generate HTML for a story page.
 */
export function generateStoryHtml(model: ModelDB, storyId: number): string | null {
  const story = model.getStory(storyId);
  if (!story) return null;

  let html = `<div class="story">`;
  html += `<div class="story-meta">Story #${story.id}${story.created_at ? ` - ${story.created_at}` : ""}</div>`;
  html += `<h2>${escapeHtml(story.title)}</h2>`;
  html += `<div class="story-narrative">${escapeHtml(story.narrative)}</div>`;
  if (story.actor) {
    html += `<div class="story-actor">Actor: ${escapeHtml(story.actor)}</div>`;
  }
  html += `</div>`;
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
