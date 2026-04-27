import { connectToEnvironment } from "../../services/customApiService.js";

export async function runConnectCommand(
  environmentUrl: string,
  jsonOutput: boolean
): Promise<void> {
  const result = await connectToEnvironment(environmentUrl);

  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Connected and cached: ${result.environmentUrl}`);
  console.log(`Auth mode: ${result.authMode}`);
  console.log(`Cache file: ${result.environmentCacheFilePath}`);
}
