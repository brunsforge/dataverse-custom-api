import { DataverseClient } from "../../api/dataverseClient.js";
import { CustomApiRepository } from "../../api/customApiRepository.js";
import type { EnvironmentCache } from "../../models/configModels.js";
import { readJsonFile } from "../../utils/fileSystem.js";
import { getEnvironmentCacheFilePath } from "../../utils/paths.js";

export async function runListCommand(): Promise<void> {
    const environmentCacheFilePath = await getEnvironmentCacheFilePath();
    const env = await readJsonFile<EnvironmentCache>(environmentCacheFilePath);

    const client = new DataverseClient(env.environmentUrl);
    const repository = new CustomApiRepository(client);
    const items = await repository.listCustomApis();

    if (items.length === 0) {
        console.log("Keine Custom APIs gefunden.");
        return;
    }

    for (const item of items) {
        console.log(`- ${item.uniqueName}`);
    }
}