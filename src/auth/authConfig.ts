import path from "node:path";
import { fileExists, readJsonFile } from "../utils/fileSystem.js";

export interface AuthConfig {
    tenantId?: string;
    clientId?: string;
    clientSecret?: string;
    authMode?: "deviceCode" | "interactiveBrowser" | "clientSecret";
}

export async function loadAuthConfig(): Promise<AuthConfig> {
    const authPath = path.join(process.cwd(), "auth.json");

    if (!(await fileExists(authPath))) {
        return {};
    }

    return readJsonFile<AuthConfig>(authPath);
}