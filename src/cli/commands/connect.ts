import { DataverseClient } from "../../api/dataverseClient.js";
import { loadAuthConfig } from "../../auth/authConfig.js";
import type { EnvironmentCache } from "../../models/configModels.js";
import {
    ensureCacheFolders,
    writeJsonFile,
} from "../../utils/fileSystem.js";
import { getEnvironmentCacheFilePath } from "../../utils/paths.js";

export async function runConnectCommand(environmentUrl: string): Promise<void> {
    await ensureCacheFolders();

    const client = new DataverseClient(environmentUrl);
    await client.whoAmI();

    const auth = await loadAuthConfig();

    const cache: EnvironmentCache = {
        environmentUrl,
        authMode: auth.authMode ?? "deviceCode",
        savedAtUtc: new Date().toISOString(),
    };

    if (auth.tenantId) {
        cache.tenantId = auth.tenantId;
    }

    if (auth.clientId) {
        cache.clientId = auth.clientId;
    }

    const environmentCacheFilePath = await getEnvironmentCacheFilePath();
    await writeJsonFile(environmentCacheFilePath, cache);

    console.log(`Verbunden und gecacht: ${environmentUrl}`);
}