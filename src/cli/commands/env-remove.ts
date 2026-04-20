import { removeEnvironment } from "../../services/environmentService.js";

export async function runEnvironmentRemoveCommand(
  environmentId: string,
  jsonOutput: boolean
): Promise<void> {
  const result = await removeEnvironment(environmentId);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Environment entfernt: ${result.removedEnvironmentId}`);
  console.log(`Anzeigename: ${result.removedDisplayName}`);
  console.log(`Store-Datei: ${result.environmentStoreFilePath}`);

  if (result.activeEnvironmentId) {
    console.log(`Neues aktives Environment: ${result.activeEnvironmentId}`);
  } else {
    console.log("Es ist kein aktives Environment mehr gesetzt.");
  }
}
