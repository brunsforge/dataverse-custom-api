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

  console.log(`API-Artefakt entfernt: ${result.uniqueName}`);
  console.log(`Datei: ${result.filePath}`);
  console.log(`Datei gelöscht: ${result.fileDeleted ? "Ja" : "Nein"}`);
  console.log(`Aktive API gelöscht: ${result.activeApiCleared ? "Ja" : "Nein"}`);
}
