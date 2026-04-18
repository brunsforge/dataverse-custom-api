#!/usr/bin/env node

import { Command } from "commander";
import { runConnectCommand } from "./commands/connect.js";
import { runListCommand } from "./commands/list.js";
import { runSelectCommand } from "./commands/select.js";
import { runExportCommand } from "./commands/export.js";

const program = new Command();

program
    .name("ccsm")
    .description("CLI für Dataverse Custom API Management")
    .version("0.1.0");

program
    .command("connect")
    .description("Verbindet das CLI mit einem Dataverse Environment und cached die Umgebung")
    .requiredOption("-u, --url <environmentUrl>", "Dataverse Environment URL")
    .action(async (options) => {
        await runConnectCommand(options.url);
    });

program
    .command("list")
    .description("Listet Custom APIs aus dem verbundenen Environment")
    .action(async () => {
        await runListCommand();
    });

program
    .command("select")
    .description("Setzt eine Custom API als aktive API")
    .requiredOption("-n, --name <uniqueName>", "Unique Name der Custom API")
    .action(async (options) => {
        await runSelectCommand(options.name);
    });