import { listPublishers } from "../../services/customApiService.js";

export async function runApiListPublishersCommand(jsonOutput: boolean): Promise<void> {
  const publishers = await listPublishers();

  if (jsonOutput) {
    console.log(JSON.stringify({ publishers }, null, 2));
    return;
  }

  if (publishers.length === 0) {
    console.log("No publishers found in the active environment.");
    return;
  }

  const prefixCol = 20;
  const nameCol = 40;
  const header =
    "PREFIX".padEnd(prefixCol) +
    "FRIENDLY NAME".padEnd(nameCol) +
    "UNIQUE NAME";
  console.log(header);
  console.log("─".repeat(header.length));

  for (const p of publishers) {
    console.log(
      p.customizationPrefix.padEnd(prefixCol) +
      p.friendlyName.padEnd(nameCol) +
      p.uniqueName
    );
  }
}
