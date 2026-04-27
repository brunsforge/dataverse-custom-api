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

  console.log(`Active API set: ${result.uniqueName}`);
  console.log(`Cache file: ${result.activeApiCacheFilePath}`);
}
