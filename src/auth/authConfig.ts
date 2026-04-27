import { fileExists, readJsonFile } from "../utils/fileSystem.js";
import {
  resolveAuthFilePath,
  type RuntimeContext,
} from "../models/runtime-context.js";

export type AuthMode = "deviceCode" | "interactiveBrowser" | "clientSecret";

export interface AuthConfig {
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  authMode?: AuthMode;
}

export async function loadAuthConfig(
  context?: RuntimeContext
): Promise<AuthConfig> {
  const authPath = resolveAuthFilePath(context);

  if (!(await fileExists(authPath))) {
    throw new Error(
      `auth.json not found. Expected path: '${authPath}'.`
    );
  }

  const config = await readJsonFile<AuthConfig>(authPath);

  if (!config || typeof config !== "object") {
    throw new Error("auth.json could not be read as a valid JSON object.");
  }

  const allowedAuthModes: AuthMode[] = [
    "deviceCode",
    "interactiveBrowser",
    "clientSecret",
  ];

  if (config.authMode && !allowedAuthModes.includes(config.authMode)) {
    throw new Error(
      `auth.json contains an invalid authMode '${config.authMode}'. Allowed values: ${allowedAuthModes.join(", ")}.`
    );
  }

  return config;
}
