import { removeCustomApi } from "../../services/customApiService.js";

export async function runApiRemoveCommand(
  uniqueNameArg: string | undefined,
  jsonOutput: boolean
): Promise<void> {
  const result = await removeCustomApi(uniqueNameArg);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`API artifact removed: ${result.uniqueName}`);
  console.log(`File: ${result.filePath}`);
  console.log(`File deleted: ${result.fileDeleted ? "yes" : "no"}`);
  console.log(`Active API cleared: ${result.activeApiCleared ? "yes" : "no"}`);
}
