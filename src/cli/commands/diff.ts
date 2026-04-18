import { diffCustomApi } from "../../services/customApiService.js";

export async function runDiffCommand(
  uniqueNameArg: string | undefined,
  jsonOutput: boolean
): Promise<void> {
  const result = await diffCustomApi(uniqueNameArg);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Diff für: ${result.uniqueName}`);
  console.log(`Unterschiede vorhanden: ${result.isDifferent ? "Ja" : "Nein"}`);

  if (result.topLevelChanges.length > 0) {
    console.log("");
    console.log("Top-Level-Änderungen:");
    for (const change of result.topLevelChanges) {
      console.log(`- ${change.field}`);
    }
  }

  if (result.requestParameterChanges.length > 0) {
    console.log("");
    console.log("Request-Parameter-Änderungen:");
    for (const change of result.requestParameterChanges) {
      console.log(`- ${change.kind}: ${change.uniqueName}`);
    }
  }

  if (result.responsePropertyChanges.length > 0) {
    console.log("");
    console.log("Response-Property-Änderungen:");
    for (const change of result.responsePropertyChanges) {
      console.log(`- ${change.kind}: ${change.uniqueName}`);
    }
  }
}
