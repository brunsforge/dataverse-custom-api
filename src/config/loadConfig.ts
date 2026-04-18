import path from "node:path";
import type { AppConfig } from "../models/appConfig.js";
import { fileExists, readJsonFile } from "../utils/fileSystem.js";

const defaultConfig: Required<AppConfig> = {
    mode: "dev",
    cachePath: ".cache",
    customApiOutputPath: ".cache/customapis",
};

export async function loadAppConfig(): Promise<Required<AppConfig>> {
    const configPath = path.join(process.cwd(), "config.json");

    if (!(await fileExists(configPath))) {
        return defaultConfig;
    }

    const raw = await readJsonFile<AppConfig>(configPath);

    return {
        mode: raw.mode ?? defaultConfig.mode,
        cachePath: raw.cachePath ?? defaultConfig.cachePath,
        customApiOutputPath:
            raw.customApiOutputPath ?? defaultConfig.customApiOutputPath,
    };
}