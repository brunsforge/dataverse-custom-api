import { listCustomApis } from "../../services/customApiService.js";

export async function runListCommand(jsonOutput: boolean): Promise<void> {
  const items = await listCustomApis();

  if (jsonOutput) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  if (items.length === 0) {
    console.log("Keine Custom APIs gefunden.");
    return;
  }

  for (const item of items) {
    console.log(`- ${item.uniqueName}`);
  }
}
