import { createServerFn } from "@tanstack/react-start";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export const getStorageValueServer = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  if (!isRecord(data) || typeof data.key !== "string") {
    throw new Error("Invalid payload for getStorageValueServer");
  }
  const mod = await import("@/services/storage-file.server");
  return mod.getStorageValue(data.key);
});

export const setStorageValueServer = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  if (!isRecord(data) || typeof data.key !== "string") {
    throw new Error("Invalid payload for setStorageValueServer");
  }
  const mod = await import("@/services/storage-file.server");
  await mod.setStorageValue(data.key, data.value);
  return { ok: true };
});

export const deleteStorageValueServer = createServerFn({ method: "POST" }).handler(async ({ data }) => {
  if (!isRecord(data) || typeof data.key !== "string") {
    throw new Error("Invalid payload for deleteStorageValueServer");
  }
  const mod = await import("@/services/storage-file.server");
  await mod.deleteStorageValue(data.key);
  return { ok: true };
});
