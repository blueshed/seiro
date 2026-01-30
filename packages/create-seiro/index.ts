#!/usr/bin/env bun
import { $ } from "bun";
import { cp, readFile, writeFile } from "fs/promises";
import { join, resolve } from "path";

const projectName = process.argv[2];
if (!projectName) {
  console.error("Usage: bunx create-seiro <project-name>");
  process.exit(1);
}

const targetDir = resolve(projectName);
const templateDir = join(import.meta.dir, "template");

console.log(`Creating ${projectName}...`);

// Copy template
await cp(templateDir, targetDir, { recursive: true });

// Update package.json name
const pkgPath = join(targetDir, "package.json");
const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
pkg.name = projectName;
await writeFile(pkgPath, JSON.stringify(pkg, null, 2));

// Install dependencies
console.log("Installing dependencies...");
await $`cd ${targetDir} && bun install`.quiet();

console.log(`
Done! Next steps:

  cd ${projectName}
  docker compose up -d
  bun run dev
`);
