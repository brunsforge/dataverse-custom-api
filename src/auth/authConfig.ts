import path from "node:path";
import { fileExists, readJsonFile } from "../utils/fileSystem.js";

export type AuthMode = "deviceCode" | "interactiveBrowser" | "clientSecret";

export interface AuthConfig {
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    authMode?: AuthMode;
}

export async function loadAuthConfig(): Promise<AuthConfig> {
    const authPath = path.join(process.cwd(), "auth.json");

    if (!(await fileExists(authPath))) {
        throw new Error(
            `auth.json wurde nicht gefunden. Erwarteter Pfad: '${authPath}'.`
        );
    }

    const config = await readJsonFile<AuthConfig>(authPath);

    if (!config || typeof config !== "object") {
        throw new Error("auth.json konnte nicht als gültiges JSON-Objekt gelesen werden.");
    }

    const allowedAuthModes: AuthMode[] = [
        "deviceCode",
        "interactiveBrowser",
        "clientSecret",
    ];

    if (config.authMode && !allowedAuthModes.includes(config.authMode)) {
        throw new Error(
            `auth.json enthält einen ungültigen authMode '${config.authMode}'. Erlaubt sind: ${allowedAuthModes.join(", ")}.`
        );
    }

    return config;
}