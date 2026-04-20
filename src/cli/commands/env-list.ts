import { listEnvironments, getActiveEnvironment } from "../../services/environmentService.js";

export async function runEnvironmentListCommand(jsonOutput: boolean): Promise<void> {
  const items = await listEnvironments();

  if (jsonOutput) {
    let activeEnvironmentId: string | undefined;

    try {
      activeEnvironmentId = (await getActiveEnvironment()).id;
    } catch {
      activeEnvironmentId = undefined;
    }

    console.log(
      JSON.stringify(
        {
          activeEnvironmentId,
          environments: items,
        },
        null,
        2
      )
    );
    return;
  }

  if (items.length === 0) {
    console.log("Keine Environments gespeichert.");
    return;
  }

  let activeEnvironmentId: string | undefined;
  try {
    activeEnvironmentId = (await getActiveEnvironment()).id;
  } catch {
    activeEnvironmentId = undefined;
  }

  for (const item of items) {
    const prefix = item.id === activeEnvironmentId ? "*" : "-";
    console.log(`${prefix} ${item.id} (${item.displayName}) -> ${item.environmentUrl}`);
  }
}
