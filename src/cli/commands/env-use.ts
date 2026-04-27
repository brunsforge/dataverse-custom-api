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

  console.log(`Active environment set: ${result.environmentId}`);
  console.log(`Display name: ${result.displayName}`);
  console.log(`Store file: ${result.environmentStoreFilePath}`);
}
