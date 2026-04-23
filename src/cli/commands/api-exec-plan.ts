import { executeCustomApiSyncPlan } from "../../services/customApiService.js";

export async function runApiExecutePlanCommand(
  uniqueNameArg: string | undefined,
  simulate: boolean,
  jsonOutput: boolean
): Promise<void> {
  const result = await executeCustomApiSyncPlan(uniqueNameArg, simulate);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Plan ausgeführt für: ${result.uniqueName}`);
  console.log(`Status: ${result.executionState.status}`);
  console.log(`State-Datei: ${result.stateFilePath}`);

  for (const operation of result.executionState.operations) {
    console.log(
      `- [${operation.sequence}] ${operation.action} ${operation.uniqueName}: ${operation.status}`
    );
  }
}
