import { executeCustomApiSyncOperation } from "../../services/customApiService.js";

export async function runApiExecuteOperationCommand(
  uniqueNameArg: string | undefined,
  operationId: string,
  simulate: boolean,
  jsonOutput: boolean
): Promise<void> {
  const result = await executeCustomApiSyncOperation(
    operationId,
    uniqueNameArg,
    simulate
  );

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Operation: ${result.result.operationId}`);
  console.log(`Status: ${result.result.status}`);
  console.log(`Message: ${result.result.message}`);
  console.log(`Simulated: ${result.result.simulated ? "Ja" : "Nein"}`);
  console.log(`State-Datei: ${result.stateFilePath}`);

  if (result.result.error) {
    console.log(`Fehler: ${result.result.error.name}: ${result.result.error.message}`);
    if (result.result.error.details) {
      console.log(`Details: ${result.result.error.details}`);
    }
  }
}
