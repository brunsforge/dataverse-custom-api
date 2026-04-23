import { checkCustomApiMetadataConsistency } from "../../services/customApiService.js";

export async function runApiCheckMetadataCommand(
  uniqueNameArg: string | undefined,
  jsonOutput: boolean
): Promise<void> {
  const result = await checkCustomApiMetadataConsistency(uniqueNameArg);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Metadata-Check für: ${result.uniqueName}`);
  console.log(`Status: ${result.status}`);
  console.log(result.message);

  for (const mismatch of result.mismatches) {
    console.log(
      `- ${mismatch.objectType}:${mismatch.uniqueName} | ${mismatch.field} | local=${JSON.stringify(
        mismatch.localValue
      )} | remote=${JSON.stringify(mismatch.remoteValue)} | recreate=${mismatch.requiresRecreate ? "Ja" : "Nein"}`
    );
  }
}
