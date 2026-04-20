import { setActiveEnvironment } from "../../services/environmentService.js";

export async function runEnvironmentUseCommand(
  environmentId: string,
  jsonOutput: boolean
): Promise<void> {
  const result = await setActiveEnvironment(environmentId);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Aktives Environment gesetzt: ${result.environmentId}`);
  console.log(`Anzeigename: ${result.displayName}`);
  console.log(`Store-Datei: ${result.environmentStoreFilePath}`);
}
