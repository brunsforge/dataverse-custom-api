import path from "node:path";
import {
    deserializeAuthenticationRecord,
    serializeAuthenticationRecord,
    type AuthenticationRecord,
} from "@azure/identity";
import { ensureCacheFolders, fileExists, readJsonFile, writeJsonFile } from "../utils/fileSystem.js";
import { getCacheRootPath } from "../utils/paths.js";

interface StoredAuthenticationRecord {
    serializedRecord: string;
}

async function getAuthenticationRecordFilePath(cacheName: string): Promise<string> {
    const cacheRoot = await getCacheRootPath();
    return path.join(cacheRoot, `${cacheName}.authRecord.json`);
}

export async function loadAuthenticationRecord(
    cacheName: string
): Promise<AuthenticationRecord | undefined> {
    const filePath = await getAuthenticationRecordFilePath(cacheName);

    if (!(await fileExists(filePath))) {
        return undefined;
    }

    const stored = await readJsonFile<StoredAuthenticationRecord>(filePath);

    if (!stored?.serializedRecord) {
        return undefined;
    }

    return deserializeAuthenticationRecord(stored.serializedRecord);
}

export async function saveAuthenticationRecord(
    cacheName: string,
    record: AuthenticationRecord
): Promise<void> {
    await ensureCacheFolders();

    const filePath = await getAuthenticationRecordFilePath(cacheName);

    const stored: StoredAuthenticationRecord = {
        serializedRecord: serializeAuthenticationRecord(record),
    };

    await writeJsonFile(filePath, stored);
}