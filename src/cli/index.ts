#!/usr/bin/env node

import { Command } from "commander";
import { createRequire } from "module";
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
import { runApiValidateCommand } from "./commands/api-validate.js";
import { runValidatePrivilegesCommand } from "./commands/validatePrivileges.js";
import { formatCliError } from "../utils/errorHelpers.js";

const require = createRequire(import.meta.url);

function getPackageVersion(): string {
  try {
    const packageJson = require("../../package.json");
    return packageJson.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const program = new Command();

program
  .name("dvc")
  .description("CLI for Dataverse Custom API Management")
  .version(getPackageVersion());

program
  .command("connect")
  .description("Connect the CLI to a Dataverse environment and cache it")
  .requiredOption("-u, --url <environmentUrl>", "Dataverse environment URL")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runConnectCommand(options.url, options.json ?? false);
  });

const environmentCommand = program
  .command("env")
  .description("Manage saved Dataverse environments");

environmentCommand
  .command("list")
  .description("List saved environments")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runEnvironmentListCommand(options.json ?? false);
  });

environmentCommand
  .command("current")
  .description("Show the currently active environment")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runEnvironmentCurrentCommand(options.json ?? false);
  });

environmentCommand
  .command("use")
  .description("Set a saved environment as active")
  .requiredOption("-i, --id <environmentId>", "ID of the saved environment")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runEnvironmentUseCommand(options.id, options.json ?? false);
  });

environmentCommand
  .command("remove")
  .description("Remove a saved environment")
  .requiredOption("-i, --id <environmentId>", "ID of the saved environment")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runEnvironmentRemoveCommand(options.id, options.json ?? false);
  });

const apiCommand = program
  .command("api")
  .description("Manage custom APIs in the active environment");

apiCommand
  .command("list")
  .description("List custom APIs from the active environment")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runApiListCommand(options.json ?? false);
  });

apiCommand
  .command("current")
  .description("Show the currently active custom API")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runApiCurrentCommand(options.json ?? false);
  });

apiCommand
  .command("use")
  .description("Set a custom API as the active API")
  .requiredOption("-n, --name <uniqueName>", "Unique name of the custom API")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runApiUseCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("remove")
  .description("Remove the local JSON artifact of a custom API and optionally clear the active API selection")
  .option("-n, --name <uniqueName>", "Unique name of the custom API")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runApiRemoveCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("export")
  .description("Export a custom API as a local editing artifact")
  .option("-n, --name <uniqueName>", "Unique name of the custom API")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runApiExportCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("diff")
  .description("Compare local JSON definition with Dataverse")
  .option("-n, --name <uniqueName>", "Unique name of the custom API")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runApiDiffCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("plan")
  .description("Generate a sync plan from the semantic diff")
  .option("-n, --name <uniqueName>", "Unique name of the custom API")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runApiPlanCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("exec-op")
  .description("Execute exactly one operation from a sync plan")
  .requiredOption("-o, --operation-id <operationId>", "Operation ID from the sync plan")
  .option("-n, --name <uniqueName>", "Unique name of the custom API")
  .option("--simulate", "Simulate instead of live execution")
  .option("--json", "Machine-readable JSON output")
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
  .description("Execute a complete sync plan sequentially")
  .option("-n, --name <uniqueName>", "Unique name of the custom API")
  .option("--simulate", "Simulate instead of live execution")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runApiExecutePlanCommand(
      options.name,
      options.simulate ?? false,
      options.json ?? false
    );
  });

apiCommand
  .command("check-metadata")
  .description("Check whether local definition and current Dataverse metadata are in sync")
  .option("-n, --name <uniqueName>", "Unique name of the custom API")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runApiCheckMetadataCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("validate")
  .description("Validate the local custom API definition and report diagnostics")
  .option("-n, --name <uniqueName>", "Unique name of the custom API")
  .option("--json", "Machine-readable JSON output (CcdvCommandResult envelope)")
  .action(async (options) => {
    await runApiValidateCommand(options.name, options.json ?? false);
  });

apiCommand
  .command("validate-privileges")
  .description("Prüft relevante Dataverse-Privileges des konfigurierten App-Users")
  .option("--verbose", "Zeigt alle gefundenen Privileges, nicht nur relevante")
  .option("--json", "Machine-readable JSON output")
  .action(async (options) => {
    await runValidatePrivilegesCommand({
      verbose: options.verbose ?? false,
      json: options.json ?? false,
    });
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(formatCliError(error, "cli"));
  process.exit(1);
});
