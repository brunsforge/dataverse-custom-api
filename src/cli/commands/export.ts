import { exportCustomApi } from "../../services/customApiService.js";

export async function runExportCommand(
  uniqueNameArg: string | undefined,
  jsonOutput: boolean
): Promise<void> {
  const result = await exportCustomApi(uniqueNameArg);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Exportiert: ${result.filePath}`);
}
