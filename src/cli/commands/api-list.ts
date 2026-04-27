import { getActiveCustomApiUniqueName, listCustomApis } from "../../services/customApiService.js";

export async function runApiListCommand(jsonOutput: boolean): Promise<void> {
  const items = await listCustomApis();

  if (jsonOutput) {
    let activeUniqueName: string | undefined;

    try {
      activeUniqueName = await getActiveCustomApiUniqueName();
    } catch {
      activeUniqueName = undefined;
    }

    console.log(
      JSON.stringify(
        {
          activeUniqueName,
          customApis: items,
        },
        null,
        2
      )
    );
    return;
  }

  if (items.length === 0) {
    console.log("No custom APIs found.");
    return;
  }

  let activeUniqueName: string | undefined;
  try {
    activeUniqueName = await getActiveCustomApiUniqueName();
  } catch {
    activeUniqueName = undefined;
  }

  for (const item of items) {
    const prefix = item.uniqueName === activeUniqueName ? "*" : "-";
    console.log(`${prefix} ${item.uniqueName}`);
  }
}
