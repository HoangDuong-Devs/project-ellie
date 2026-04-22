import "@tanstack/react-start/server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

type StorageSnapshot = {
  schemaVersion: number;
  updatedAt: string;
  values: Record<string, unknown>;
};

const STORAGE_DIR = path.join(process.cwd(), "data");
const LEGACY_STORAGE_FILE = path.join(STORAGE_DIR, "ellie-storage.json");

const EMPTY_SNAPSHOT: StorageSnapshot = {
  schemaVersion: 1,
  updatedAt: new Date(0).toISOString(),
  values: {},
};

const DOMAIN_FILE_MAP: Array<{ test: (key: string) => boolean; file: string }> = [
  { test: (key) => key.startsWith("ellie:calendar") || key.startsWith("ellie:todos"), file: "calendar.json" },
  {
    test: (key) =>
      key.startsWith("ellie:transaction") ||
      key.startsWith("ellie:savings") ||
      key.startsWith("ellie:monthly-budget"),
    file: "finance.json",
  },
  { test: (key) => key.startsWith("ellie:work"), file: "work.json" },
  {
    test: (key) =>
      key.startsWith("ellie:focus") || key.startsWith("ellie:pomodoro") || key.startsWith("ellie:goal"),
    file: "settings.json",
  },
  {
    test: (key) => key.startsWith("ellie:notification") || key.startsWith("ellie:scheduler"),
    file: "general.json",
  },
];

function getDomainFileForKey(key: string) {
  const hit = DOMAIN_FILE_MAP.find((x) => x.test(key));
  const file = hit?.file ?? "general.json";
  return path.join(STORAGE_DIR, file);
}

async function ensureStorageDir() {
  await mkdir(STORAGE_DIR, { recursive: true });
}

function sanitizeSnapshot(value: unknown): StorageSnapshot {
  if (!value || typeof value !== "object") return EMPTY_SNAPSHOT;
  const snapshot = value as Partial<StorageSnapshot>;
  const values =
    snapshot.values && typeof snapshot.values === "object"
      ? (snapshot.values as Record<string, unknown>)
      : {};

  return {
    schemaVersion:
      typeof snapshot.schemaVersion === "number" && Number.isFinite(snapshot.schemaVersion)
        ? snapshot.schemaVersion
        : 1,
    updatedAt:
      typeof snapshot.updatedAt === "string" && snapshot.updatedAt.length > 0
        ? snapshot.updatedAt
        : new Date().toISOString(),
    values,
  };
}

async function readSnapshotFrom(filePath: string): Promise<StorageSnapshot> {
  await ensureStorageDir();
  try {
    const raw = await readFile(filePath, "utf8");
    return sanitizeSnapshot(JSON.parse(raw));
  } catch {
    return EMPTY_SNAPSHOT;
  }
}

async function writeSnapshotTo(filePath: string, values: Record<string, unknown>): Promise<void> {
  await ensureStorageDir();
  const payload: StorageSnapshot = {
    schemaVersion: 1,
    updatedAt: new Date().toISOString(),
    values,
  };

  const tempFile = path.join(
    STORAGE_DIR,
    `${path.basename(filePath, ".json")}.tmp-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.json`,
  );
  const content = `${JSON.stringify(payload, null, 2)}\n`;
  await writeFile(tempFile, content, "utf8");
  await rename(tempFile, filePath);
}

async function getLegacyValue(key: string): Promise<{ found: boolean; value?: unknown }> {
  const legacy = await readSnapshotFrom(LEGACY_STORAGE_FILE);
  if (!(key in legacy.values)) return { found: false };
  return { found: true, value: legacy.values[key] };
}

export async function getStorageValue(key: string): Promise<{ found: boolean; value?: unknown }> {
  const filePath = getDomainFileForKey(key);
  const snapshot = await readSnapshotFrom(filePath);
  if (key in snapshot.values) {
    return { found: true, value: snapshot.values[key] };
  }

  // Backward compatibility: migrate-on-read from legacy single-file storage.
  const legacy = await getLegacyValue(key);
  if (legacy.found) {
    snapshot.values[key] = legacy.value;
    await writeSnapshotTo(filePath, snapshot.values);
    return legacy;
  }

  return { found: false };
}

export async function setStorageValue(key: string, value: unknown): Promise<void> {
  const filePath = getDomainFileForKey(key);
  const snapshot = await readSnapshotFrom(filePath);
  snapshot.values[key] = value;
  await writeSnapshotTo(filePath, snapshot.values);
}

export async function deleteStorageValue(key: string): Promise<void> {
  const filePath = getDomainFileForKey(key);
  const snapshot = await readSnapshotFrom(filePath);
  delete snapshot.values[key];
  await writeSnapshotTo(filePath, snapshot.values);
}
