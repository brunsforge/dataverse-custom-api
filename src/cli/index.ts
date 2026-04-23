#!/usr/bin/env node

import { Command } from "commander";
import { runConnectCommand } from "./commands/connect.js";
import { runEnvironmentListCommand } from "./commands/env-list.js";
import { runEnvironmentCurrentCommand } from "./commands/env-current.js";
import { runEnvironmentUseCommand } from "./commands/env-use.js";
import { runEnvironmentRemoveCommand } from "./commands/env-remove.js";
import { runApiListCommand } from "./commands/api-list.js";
import { runApiUseCommand } from "./commands/api-use.js";
import { runApiCurrentCommand } from "./commands/api-current.js";
import { runApiRemoveCommand } from "./commands/api-remove.js";
import { runApiExportCommand } from "./commands/api-export.js";
import { runApiDiffCommand } from "./commands/api-diff.js";
import { runApiPlanCommand } from "./commands/api-plan.js";
import { runApiExecuteOperationCommand } from "./commands/api-exec-op.js";
import { runApiExecutePlanCommand } from "./commands/api-exec-plan.js";
import { runApiCheckMetadataCommand } from "./commands/api-check-metadata.js";
import { formatCliError } from "../utils/errorHelpers.js";

const program = new Command();

program
  .name("ccsm")
  .description("CLI für Dataverse Custom API Management")
  .version("0.1.0");

program
  .command("connect")
  .description("Verbindet das CLI mit einem Dataverse Environment und cached die Umgebung")
  .requiredOption("-u, --url <environmentUrl>", "Dataverse Environment URL")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runConnectCommand(options.url, options.json ?? false);
  });

const environmentCommand = program
  .command("env")
  .description("Verwaltet gespeicherte Dataverse Environments");

environmentCommand
  .command("list")
  .description("Listet gespeicherte Environments")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runEnvironmentListCommand(options.json ?? false);
  });

environmentCommand
  .command("current")
  .description("Zeigt das aktuell aktive Environment")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runEnvironmentCurrentCommand(options.json ?? false);
  });

environmentCommand
  .command("use")
  .description("Setzt ein gespeichertes Environment als aktiv")
  .requiredOption("-i, --id <environmentId>", "ID des gespeicherten Environments")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runEnvironmentUseCommand(options.id, options.json ?? false);
  });

environmentCommand
  .command("remove")
  .description("Entfernt ein gespeichertes Environment")
  .requiredOption("-i, --id <environmentId>", "ID des gespeicherten Environments")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runEnvironmentRemoveCommand(options.id, options.json ?? false);
  });

const apiCommand = program
  .command("api")
  .description("Verwaltet Custom APIs im aktiven Environment");

apiCommand
  .command("list")
  .description("Listet Custom APIs aus dem aktiven Environment")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runApiListCommand(options.json ?? false);
  });

apiCommand
  .command("current")
  .description("Zeigt die aktuell aktive Custom API")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runApiCurrentCommand(options.json ?? false);
  });

apiCommand
  .command("use")
  .description("Setzt eine Custom API als aktive API")
  .requiredOption("-n, --name <uniqueName>", "Unique Name der Custom API")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runApiUseCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("remove")
  .description("Entfernt das lokale JSON-Artefakt einer Custom API und löscht ggf. die aktive API-Auswahl")
  .option("-n, --name <uniqueName>", "Unique Name der Custom API")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runApiRemoveCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("export")
  .description("Exportiert eine Custom API als lokales Bearbeitungsartefakt")
  .option("-n, --name <uniqueName>", "Unique Name der Custom API")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runApiExportCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("diff")
  .description("Vergleicht lokale JSON-Definition mit Dataverse")
  .option("-n, --name <uniqueName>", "Unique Name der Custom API")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runApiDiffCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("plan")
  .description("Erzeugt einen Sync-Plan aus dem semantischen Diff")
  .option("-n, --name <uniqueName>", "Unique Name der Custom API")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runApiPlanCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("exec-op")
  .description("Führt genau eine Operation aus einem Sync-Plan aus")
  .requiredOption("-o, --operation-id <operationId>", "Operation ID aus dem Sync-Plan")
  .option("-n, --name <uniqueName>", "Unique Name der Custom API")
  .option("--simulate", "Simulation statt Live-Ausführung")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runApiExecuteOperationCommand(
      options.name,
      options.operationId,
      options.simulate ?? false,
      options.json ?? false
    );
  });

apiCommand
  .command("exec-plan")
  .description("Führt einen kompletten Sync-Plan sequenziell aus")
  .option("-n, --name <uniqueName>", "Unique Name der Custom API")
  .option("--simulate", "Simulation statt Live-Ausführung")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runApiExecutePlanCommand(
      options.name,
      options.simulate ?? false,
      options.json ?? false
    );
  });

apiCommand
  .command("check-metadata")
  .description("Prüft, ob lokale Definition und aktuell gelieferte Dataverse-Metadaten auseinanderlaufen")
  .option("-n, --name <uniqueName>", "Unique Name der Custom API")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runApiCheckMetadataCommand(options.name, options.json ?? false);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(formatCliError(error, "cli"));
  process.exit(1);
});
