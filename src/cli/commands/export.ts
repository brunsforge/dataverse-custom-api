import path from "node:path";
import { DataverseClient } from "../../api/dataverseClient.js";
import { CustomApiRepository } from "../../api/customApiRepository.js";
import type {
    ActiveApiCache,
    EnvironmentCache,
} from "../../models/configModels.js";
import {
    ensureCacheFolders,
    readJsonFile,
    writeJsonFile,
} from "../../utils/fileSystem.js";
import {
    getActiveApiCacheFilePath,
    getCustomApiOutputRootPath,
    getEnvironmentCacheFilePath,
} from "../../utils/paths.js";

export async function runExportCommand(uniqueNameArg?: string): Promise<void> {
    await ensureCacheFolders();

    const environmentCacheFilePath = await getEnvironmentCacheFilePath();
    const env = await readJsonFile<EnvironmentCache>(environmentCacheFilePath);

    let uniqueName = uniqueNameArg;

    if (!uniqueName) {
        const activeApiCacheFilePath = await getActiveApiCacheFilePath();
        const activeApi = await readJsonFile<ActiveApiCache>(activeApiCacheFilePath);
        uniqueName = activeApi.uniqueName;
    }

    if (!uniqueName) {
        throw new Error("Keine Custom API angegeben und keine aktive API gesetzt.");
    }

    const client = new DataverseClient(env.environmentUrl);
    const repository = new CustomApiRepository(client);
    const catalog = await repository.exportCatalog(uniqueName);

    const outputRoot = await getCustomApiOutputRootPath();
    const filePath = path.join(outputRoot, `${uniqueName}.json`);

    await writeJsonFile(filePath, catalog);

    console.log(`Exportiert: ${filePath}`);
}