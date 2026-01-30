import { expect, test, beforeAll, afterAll } from "bun:test";
import { mkdtemp, rm } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";
import { $ } from "bun";

let testDir: string;
let projectDir: string;

beforeAll(async () => {
  // Create a temp directory for the test project
  testDir = await mkdtemp(join(tmpdir(), "seiro-test-"));
  projectDir = join(testDir, "test-app");
});

afterAll(async () => {
  // Clean up temp directory
  await rm(testDir, { recursive: true, force: true });
});

test("create-seiro scaffolds a new project", async () => {
  // Run create-seiro
  const result = await $`bun run ${join(import.meta.dir, "index.ts")} ${projectDir}`.quiet();

  expect(result.exitCode).toBe(0);

  // Check that key files exist
  const files = await Array.fromAsync(
    new Bun.Glob("**/*").scan({ cwd: projectDir, dot: true })
  );

  expect(files).toContain("package.json");
  expect(files).toContain("server.ts");
  expect(files).toContain("app.ts");
  expect(files).toContain("types.ts");
  expect(files).toContain("compose.yml");
  expect(files).toContain("auth/server.ts");
  expect(files).toContain("auth/types.ts");
  expect(files).toContain("components/auth.ts");
  expect(files).toContain("init_db/01_extensions.sql");
  expect(files).toContain("init_db/02_auth_tables.sql");
  expect(files).toContain("init_db/03_auth_functions.sql");
  expect(files).toContain(".claude/skills/new-entity.md");
});

test("scaffolded project has correct package name", async () => {
  const pkg = await Bun.file(join(projectDir, "package.json")).json();
  expect(pkg.name).toBe("test-app");
});

test("scaffolded project has seiro dependency", async () => {
  const pkg = await Bun.file(join(projectDir, "package.json")).json();
  expect(pkg.dependencies.seiro).toBeDefined();
});

test("scaffolded project type checks", async () => {
  const result = await $`cd ${projectDir} && bun run check`.quiet().nothrow();
  expect(result.exitCode).toBe(0);
}, 30000);
