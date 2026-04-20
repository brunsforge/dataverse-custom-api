import { getCurrentCustomApi } from "../../services/customApiService.js";

export async function runApiCurrentCommand(
  jsonOutput: boolean
): Promise<void> {
  const result = await getCurrentCustomApi();

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Aktive API: ${result.uniqueName}`);
  console.log(`Cache-Datei: ${result.activeApiCacheFilePath}`);
}
