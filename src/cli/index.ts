#!/usr/bin/env node

import { Command } from "commander";
import { runConnectCommand } from "./commands/connect.js";
import { runListCommand } from "./commands/list.js";
import { runSelectCommand } from "./commands/select.js";
import { runExportCommand } from "./commands/export.js";
import { runDiffCommand } from "./commands/diff.js";
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

program
  .command("list")
  .description("Listet Custom APIs aus dem verbundenen Environment")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runListCommand(options.json ?? false);
  });

program
  .command("select")
  .description("Setzt eine Custom API als aktive API")
  .requiredOption("-n, --name <uniqueName>", "Unique Name der Custom API")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runSelectCommand(options.name, options.json ?? false);
  });

program
  .command("export")
  .description("Exportiert eine Custom API als lokales Bearbeitungsartefakt")
  .option("-n, --name <uniqueName>", "Unique Name der Custom API")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runExportCommand(options.name, options.json ?? false);
  });

program
  .command("diff")
  .description("Vergleicht lokale JSON-Definition mit Dataverse")
  .option("-n, --name <uniqueName>", "Unique Name der Custom API")
  .option("--json", "Maschinenlesbare JSON-Ausgabe")
  .action(async (options) => {
    await runDiffCommand(options.name, options.json ?? false);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(formatCliError(error, "cli"));
  process.exit(1);
});
