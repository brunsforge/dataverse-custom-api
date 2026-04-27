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

  console.log(`Plan created: ${result.filePath}`);
  console.log(`State file: ${result.stateFilePath}`);
  console.log(`Operations: ${result.plan.operations.length}`);
  console.log(
    `Destructive changes required: ${result.plan.requiresDestructiveChanges ? "yes" : "no"}`
  );

  for (const operation of result.plan.operations) {
    console.log(
      `- [${operation.sequence}] ${operation.action} ${operation.uniqueName} (${operation.reason})`
    );
  }
}
