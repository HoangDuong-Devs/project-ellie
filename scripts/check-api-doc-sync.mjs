#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import path from "node:path";
import { execSync } from "node:child_process";

const cwd = process.cwd();
const apiDocPath = path.join(cwd, "API.md");

function getApiRouteFiles() {
  const output = execSync("find src/routes/api -type f | sort", { encoding: "utf8" });
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function extractRoutePaths(content) {
  const matches = [...content.matchAll(/createFileRoute\(\"([^\"]+)\"\)/g)];
  return matches.map((m) => m[1]).filter((p) => p.startsWith("/api/"));
}

async function main() {
  const apiDoc = await readFile(apiDocPath, "utf8");
  const files = getApiRouteFiles();

  const paths = [];
  for (const file of files) {
    const content = await readFile(path.join(cwd, file), "utf8");
    paths.push(...extractRoutePaths(content));
  }

  const uniquePaths = [...new Set(paths)].sort();
  const missing = uniquePaths.filter((route) => !apiDoc.includes(route));

  if (missing.length > 0) {
    console.error("API.md is missing route paths:");
    for (const route of missing) console.error(`- ${route}`);
    process.exit(1);
  }

  console.log(`API doc sync check passed (${uniquePaths.length} routes found).`);
}

await main();
