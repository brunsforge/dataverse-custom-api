import type { ActiveApiCache } from "../../models/configModels.js";
import {
    ensureCacheFolders,
    writeJsonFile,
} from "../../utils/fileSystem.js";
import { getActiveApiCacheFilePath } from "../../utils/paths.js";

export async function runSelectCommand(uniqueName: string): Promise<void> {
    await ensureCacheFolders();

    const activeApi: ActiveApiCache = {
        uniqueName,
        savedAtUtc: new Date().toISOString(),
    };

    const activeApiCacheFilePath = await getActiveApiCacheFilePath();
    await writeJsonFile(activeApiCacheFilePath, activeApi);

    console.log(`Aktive API gesetzt: ${uniqueName}`);
}