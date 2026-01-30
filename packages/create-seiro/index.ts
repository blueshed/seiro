#!/usr/bin/env bun
import { $ } from "bun";
import { cp, readFile, writeFile } from "fs/promises";
import { basename, join, resolve } from "path";

const projectArg = process.argv[2];
if (!projectArg) {
  console.error("Usage: bunx create-seiro <project-name>");
  process.exit(1);
}

const targetDir = resolve(projectArg);
const projectName = basename(targetDir);
const templateDir = join(import.meta.dir, "template");

console.log(`Creating ${projectName}...`);

// Copy template
await cp(templateDir, targetDir, { recursive: true });

// Update package.json name
const pkgPath = join(targetDir, "package.json");
const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
pkg.name = projectName;
await writeFile(pkgPath, JSON.stringify(pkg, null, 2));

// Rename test file template
const testTemplatePath = join(targetDir, "server.test.ts.template");
const testPath = join(targetDir, "server.test.ts");
try {
  await Bun.write(testPath, await Bun.file(testTemplatePath).text());
  await Bun.file(testTemplatePath).unlink();
} catch {
  // File might not exist
}

// Install dependencies
console.log("Installing dependencies...");
await $`cd ${targetDir} && bun install`.quiet();

console.log(`
Done! Next steps:

  cd ${projectName}
  docker compose up -d
  bun run dev
`);
