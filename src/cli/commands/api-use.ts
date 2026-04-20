import { setActiveCustomApi } from "../../services/customApiService.js";

export async function runApiUseCommand(
  uniqueName: string,
  jsonOutput: boolean
): Promise<void> {
  const result = await setActiveCustomApi(uniqueName);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Aktive API gesetzt: ${result.uniqueName}`);
  console.log(`Cache-Datei: ${result.activeApiCacheFilePath}`);
}
