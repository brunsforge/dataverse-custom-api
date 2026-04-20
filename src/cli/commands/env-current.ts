import { getActiveEnvironment } from "../../services/environmentService.js";

export async function runEnvironmentCurrentCommand(
  jsonOutput: boolean
): Promise<void> {
  const result = await getActiveEnvironment();

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Aktives Environment: ${result.id}`);
  console.log(`Anzeigename: ${result.displayName}`);
  console.log(`URL: ${result.environmentUrl}`);
  console.log(`Auth-Modus: ${result.authMode}`);
}
