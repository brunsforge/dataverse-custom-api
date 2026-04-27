import path from "node:path";
import { loadAppConfig } from "../config/loadConfig.js";
import {
  resolveWorkingDirectory,
  type RuntimeContext,
} from "../models/runtime-context.js";

export async function getCacheRootPath(context?: RuntimeContext): Promise<string> {
  if (context?.cacheRootPath) {
    return context.cacheRootPath;
  }

  const config = await loadAppConfig(context);
  return path.join(resolveWorkingDirectory(context), config.cachePath);
}

export async function getEnvironmentStoreFilePath(
  context?: RuntimeContext
): Promise<string> {
  const cacheRoot = await getCacheRootPath(context);
  return path.join(cacheRoot, "environments.json");
}

/** Legacy single-environment cache file. Only used for migration/backwards compatibility. */
export async function getEnvironmentCacheFilePath(
  context?: RuntimeContext
): Promise<string> {
  const cacheRoot = await getCacheRootPath(context);
  return path.join(cacheRoot, "environment.json");
}

export async function getActiveApiCacheFilePath(
  context?: RuntimeContext
): Promise<string> {
  const cacheRoot = await getCacheRootPath(context);
  return path.join(cacheRoot, "active-api.json");
}

export async function getCustomApiOutputRootPath(
  context?: RuntimeContext
): Promise<string> {
  if (context?.customApiOutputRootPath) {
    return context.customApiOutputRootPath;
  }

  const config = await loadAppConfig(context);
  return path.join(resolveWorkingDirectory(context), config.customApiOutputPath);
}
