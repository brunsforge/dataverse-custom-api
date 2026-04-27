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

  console.log(`Environment removed: ${result.removedEnvironmentId}`);
  console.log(`Display name: ${result.removedDisplayName}`);
  console.log(`Store file: ${result.environmentStoreFilePath}`);

  if (result.activeEnvironmentId) {
    console.log(`New active environment: ${result.activeEnvironmentId}`);
  } else {
    console.log("No active environment set.");
  }
}
