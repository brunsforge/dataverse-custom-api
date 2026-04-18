import type { AppConfig } from "../models/appConfig.js";
import {
  resolveConfigFilePath,
  type RuntimeContext,
} from "../models/runtime-context.js";
import { fileExists, readJsonFile } from "../utils/fileSystem.js";

const defaultConfig: Required<AppConfig> = {
  mode: "dev",
  cachePath: ".cache",
  customApiOutputPath: ".cache/customapis",
};

export async function loadAppConfig(
  context?: RuntimeContext
): Promise<Required<AppConfig>> {
  const configPath = resolveConfigFilePath(context);

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
