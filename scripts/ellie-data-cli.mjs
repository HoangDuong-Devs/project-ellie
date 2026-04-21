#!/usr/bin/env node
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "ellie-storage.json");
const TMP = path.join(DATA_DIR, "ellie-storage.tmp.json");

function usage() {
  console.error("Usage:");
  console.error("  node scripts/ellie-data-cli.mjs list");
  console.error("  node scripts/ellie-data-cli.mjs get <key>");
  console.error("  node scripts/ellie-data-cli.mjs set <key> <jsonValue>");
  console.error("  node scripts/ellie-data-cli.mjs delete <key>");
  console.error("  node scripts/ellie-data-cli.mjs export");
}

async function ensureDir() {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readStore() {
  await ensureDir();
  try {
    const raw = await readFile(FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || typeof parsed.values !== "object") {
      return { schemaVersion: 1, updatedAt: new Date().toISOString(), values: {} };
    }
    return parsed;
  } catch {
    return { schemaVersion: 1, updatedAt: new Date().toISOString(), values: {} };
  }
}

async function writeStore(values) {
  await ensureDir();
  const payload = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    values,
  };
  await writeFile(TMP, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  await rename(TMP, FILE);
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd) {
    usage();
    process.exit(1);
  }

  const store = await readStore();
  const values = store.values || {};

  if (cmd === "list") {
    console.log(JSON.stringify(Object.keys(values).sort(), null, 2));
    return;
  }

  if (cmd === "export") {
    console.log(JSON.stringify(store, null, 2));
    return;
  }

  if (cmd === "get") {
    const key = rest[0];
    if (!key) {
      usage();
      process.exit(1);
    }
    if (!(key in values)) {
      console.error(`Key not found: ${key}`);
      process.exit(2);
    }
    console.log(JSON.stringify(values[key], null, 2));
    return;
  }

  if (cmd === "set") {
    const [key, rawValue] = rest;
    if (!key || rawValue == null) {
      usage();
      process.exit(1);
    }

    let parsed;
    try {
      parsed = JSON.parse(rawValue);
    } catch (error) {
      console.error(`Invalid JSON value: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }

    values[key] = parsed;
    await writeStore(values);
    console.log(JSON.stringify({ ok: true, key }, null, 2));
    return;
  }

  if (cmd === "delete") {
    const key = rest[0];
    if (!key) {
      usage();
      process.exit(1);
    }
    delete values[key];
    await writeStore(values);
    console.log(JSON.stringify({ ok: true, key }, null, 2));
    return;
  }

  usage();
  process.exit(1);
}

await main();
