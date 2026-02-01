/**
 * HTML Generation for CQRS Domain Model Viewer
 *
 * Based on modeling2 patterns - clean index with proper navigation.
 */

import { toId } from "./plantuml";
import styles from "./styles.css" with { type: "text" };

export function generateIndexHtml(
  actors: string[],
  documents: string[],
  sequences: string[],
  entities: string[],
  commands: { name: string; documents: string[] }[],
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CQRS Domain Model</title>
  <style>${styles}</style>
</head>
<body>
  <header>
    <h1>CQRS Domain Model</h1>
    <p>Documents, Commands, Events & Sequences</p>
  </header>
  <div class="container">
    <nav id="nav"></nav>
    <main id="main"></main>
  </div>
  <script>
    const actors = ${JSON.stringify(actors)};
    const documents = ${JSON.stringify(documents)};
    const sequences = ${JSON.stringify(sequences)};
    const entities = ${JSON.stringify(entities)};
    const commands = ${JSON.stringify(commands)};
    const stats = {
      actors: ${actors.length},
      entities: ${entities.length},
      sequences: ${sequences.length},
      documents: ${documents.length},
      commands: ${commands.length}
    };

    const sections = {
      overview: { label: 'Overview', items: [
        { id: 'home', label: 'Home' },
        { id: 'use-cases', label: 'Use Cases', svg: 'use-cases.svg' },
        { id: 'entities', label: 'Entities', svg: 'entities.svg' },
        { id: 'commands', label: 'Commands', svg: 'commands.svg' },
        { id: 'events', label: 'Events', svg: 'events.svg' }
      ]},
      actors: { label: 'Actors', items: [] },
      documents: { label: 'Documents', items: [] },
      sequences: { label: 'Sequences', items: [] },
      entityList: { label: 'Entity Details', items: [] }
    };

    actors.forEach(a => sections.actors.items.push({
      id: 'actor-' + a, label: a.replace(/_/g, ' '), svg: 'actors/' + a + '.svg'
    }));
    documents.forEach(d => {
      sections.documents.items.push({
        id: 'doc-' + d, label: d.replace(/_/g, ' '), svg: 'documents/' + d + '.svg'
      });
      // Auto-generated document command sequences
      sections.sequences.items.push({
        id: 'doc-cmd-' + d, label: d.replace(/_/g, ' ') + ' Commands', svg: 'document-commands/' + d + '.svg'
      });
    });
    sequences.forEach(s => sections.sequences.items.push({
      id: 'seq-' + s, label: s.replace(/_/g, ' '), svg: 'sequences/' + s + '.svg'
    }));
    entities.forEach(e => sections.entityList.items.push({
      id: 'entity-' + e, label: e.replace(/_/g, ' '), svg: 'entities/' + e + '.svg'
    }));

    function renderNav() {
      const nav = document.getElementById('nav');
      let html = '';
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
        '<div class="stat"><div class="stat-value">' + stats.actors + '</div><div class="stat-label">Actors</div></div>' +
        '<div class="stat"><div class="stat-value">' + stats.entities + '</div><div class="stat-label">Entities</div></div>' +
        '<div class="stat"><div class="stat-value">' + stats.documents + '</div><div class="stat-label">Documents</div></div>' +
        '<div class="stat"><div class="stat-value">' + stats.sequences + '</div><div class="stat-label">Sequences</div></div>' +
        '<div class="stat"><div class="stat-value">' + stats.commands + '</div><div class="stat-label">Commands</div></div>' +
        '</div>' +
        '<h2 class="diagram-title">Quick Links</h2>' +
        '<div class="home-grid">' +
        '<div class="home-card" onclick="navigate(\\'use-cases\\')"><h3>Use Cases</h3><p>Actor interactions with the system</p></div>' +
        '<div class="home-card" onclick="navigate(\\'entities\\')"><h3>Entities</h3><p>Domain objects and relationships</p></div>' +
        (sequences.length > 0 ? '<div class="home-card" onclick="navigate(\\'seq-' + sequences[0] + '\\')"><h3>Sequences</h3><p>' + stats.sequences + ' CQRS flows</p></div>' : '') +
        (documents.length > 0 ? '<div class="home-card" onclick="navigate(\\'doc-' + documents[0] + '\\')"><h3>Documents</h3><p>' + stats.documents + ' read models</p></div>' : '') +
        '</div>';
    }

    async function renderDiagram(item) {
      const container = document.getElementById('main');
      container.innerHTML = '<h2 class="diagram-title">' + item.label + '</h2>' +
        '<div class="diagram-container" id="diagram-content">Loading...</div>';
      try {
        const response = await fetch(item.svg);
        if (!response.ok) throw new Error('Failed to load');
        const svg = await response.text();
        document.getElementById('diagram-content').innerHTML = svg;
      } catch (e) {
        document.getElementById('diagram-content').innerHTML = '<p style="color:#e74c3c;">Failed to load diagram</p>';
      }
    }

    function findItem(id) {
      for (const section of Object.values(sections)) {
        const item = section.items.find(i => i.id === id);
        if (item) return item;
      }
      return null;
    }

    function navigate(id) { window.location.hash = id; }

    function render() {
      const hash = window.location.hash.slice(1) || 'home';
      const main = document.getElementById('main');
      document.querySelectorAll('nav a').forEach(a => {
        a.classList.toggle('active', a.dataset.id === hash);
      });
      if (hash === 'home') {
        main.innerHTML = renderHome();
      } else {
        const item = findItem(hash);
        if (item && item.svg) {
          renderDiagram(item);
        } else {
          main.innerHTML = '<p>Not found</p>';
        }
      }
    }

    renderNav();
    render();
    window.addEventListener('hashchange', render);
  </script>
</body>
</html>`;
}
