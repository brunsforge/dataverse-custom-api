import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { RuntimeContext } from "../models/runtime-context.js";
import {
  getCacheRootPath,
  getCustomApiOutputRootPath,
} from "./paths.js";

export async function ensureCacheFolders(context?: RuntimeContext): Promise<void> {
  const cacheRoot = await getCacheRootPath(context);
  const customApiOutputRoot = await getCustomApiOutputRootPath(context);

  await mkdir(cacheRoot, { recursive: true });
  await mkdir(customApiOutputRoot, { recursive: true });
}

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  const dir = path.dirname(filePath);
  await mkdir(dir, { recursive: true });
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function readJsonFile<T>(filePath: string): Promise<T> {
  const content = await readFile(filePath, "utf-8");
  return JSON.parse(content) as T;
}
