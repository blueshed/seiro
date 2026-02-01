/**
 * @seiro/model - CQRS Domain Modeling
 *
 * A story-driven domain modeling tool for designing CQRS systems.
 * Captures entities, documents, commands, events, and sequences
 * with full traceability back to business stories.
 *
 * Use with PlantUML for visualization and client discussions.
 */

export * from "./db";
export * from "./plantuml";
export * from "./encode";
export * from "./server";
export { generateIndexHtml, generateStoryHtml, generateNavData } from "./html";
export type { NavItem, NavSection } from "./html";
