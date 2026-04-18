import path from "node:path";
import { loadAppConfig } from "../config/loadConfig.js";

export async function getCacheRootPath(): Promise<string> {
    const config = await loadAppConfig();
    return path.join(process.cwd(), config.cachePath);
}

export async function getEnvironmentCacheFilePath(): Promise<string> {
    const cacheRoot = await getCacheRootPath();
    return path.join(cacheRoot, "environment.json");
}

export async function getActiveApiCacheFilePath(): Promise<string> {
    const cacheRoot = await getCacheRootPath();
    return path.join(cacheRoot, "active-api.json");
}

export async function getCustomApiOutputRootPath(): Promise<string> {
    const config = await loadAppConfig();
    return path.join(process.cwd(), config.customApiOutputPath);
}