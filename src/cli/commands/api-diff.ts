import { diffCustomApi } from "../../services/customApiService.js";

export async function runApiDiffCommand(
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
  console.log(`Custom API: ${result.customApi.kind}`);

  if (result.summary.requiresCustomApiRecreate) {
    console.log("Custom API muss neu angelegt werden: Ja");
  }

  if (result.summary.requiresAnyRecreate) {
    console.log("Mindestens ein Objekt erfordert Delete + Recreate: Ja");
  }

  console.log("");
  console.log("Request-Parameter-Summary:");
  console.log(
    `  none=${result.summary.requestParameterChanges.none}, create=${result.summary.requestParameterChanges.create}, update=${result.summary.requestParameterChanges.update}, delete=${result.summary.requestParameterChanges.delete}, recreate=${result.summary.requestParameterChanges.recreate}`
  );

  const requestChanges = result.requestParameters.filter((item) => item.kind !== "none");
  if (requestChanges.length > 0) {
    for (const item of requestChanges) {
      const immutableSuffix =
        item.immutableFieldChanges.length > 0
          ? ` | immutable: ${item.immutableFieldChanges.join(", ")}`
          : "";

      console.log(`- ${item.kind}: ${item.uniqueName}${immutableSuffix}`);
    }
  }

  console.log("");
  console.log("Response-Property-Summary:");
  console.log(
    `  none=${result.summary.responsePropertyChanges.none}, create=${result.summary.responsePropertyChanges.create}, update=${result.summary.responsePropertyChanges.update}, delete=${result.summary.responsePropertyChanges.delete}, recreate=${result.summary.responsePropertyChanges.recreate}`
  );

  const responseChanges = result.responseProperties.filter((item) => item.kind !== "none");
  if (responseChanges.length > 0) {
    for (const item of responseChanges) {
      const immutableSuffix =
        item.immutableFieldChanges.length > 0
          ? ` | immutable: ${item.immutableFieldChanges.join(", ")}`
          : "";

      console.log(`- ${item.kind}: ${item.uniqueName}${immutableSuffix}`);
    }
  }
}
