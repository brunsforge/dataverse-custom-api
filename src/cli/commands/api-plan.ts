import { buildCustomApiSyncPlan } from "../../services/customApiService.js";

export async function runApiPlanCommand(
  uniqueNameArg: string | undefined,
  jsonOutput: boolean
): Promise<void> {
  const result = await buildCustomApiSyncPlan(uniqueNameArg);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Plan erzeugt: ${result.filePath}`);
  console.log(`State-Datei: ${result.stateFilePath}`);
  console.log(`Operationen: ${result.plan.operations.length}`);
  console.log(
    `Destruktive Änderungen erforderlich: ${result.plan.requiresDestructiveChanges ? "Ja" : "Nein"}`
  );

  for (const operation of result.plan.operations) {
    console.log(
      `- [${operation.sequence}] ${operation.action} ${operation.uniqueName} (${operation.reason})`
    );
  }
}
