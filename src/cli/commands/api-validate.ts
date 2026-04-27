import { validateLocalCatalog } from "../../services/customApiService.js";
import type { CcdvDiagnostic } from "../../models/diagnosticModels.js";

export async function runApiValidateCommand(
  uniqueNameArg: string | undefined,
  jsonOutput: boolean
): Promise<void> {
  const result = await validateLocalCatalog(uniqueNameArg);

  if (jsonOutput) {
    console.log(JSON.stringify(result.commandResult, null, 2));
    return;
  }

  const { diagnostics, status } = result.commandResult;

  console.log(`Validation for: ${result.uniqueName}`);
  console.log(`Status: ${status}`);

  if (diagnostics.length === 0) {
    console.log("No issues found.");
    return;
  }

  console.log("");

  for (const diag of diagnostics) {
    printDiagnostic(diag);
  }

  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");
  const infos = diagnostics.filter((d) => d.severity === "info");

  console.log("");
  console.log(`Summary: ${errors.length} error(s), ${warnings.length} warning(s), ${infos.length} info(s)`);
}

function printDiagnostic(diag: CcdvDiagnostic): void {
  const level = diag.severity === "error" ? "ERROR" : diag.severity === "warning" ? "WARN " : "INFO ";
  const location = buildLocation(diag);
  const field = diag.field ? `.${diag.field}` : "";

  console.log(`${level} [${diag.code}]${location}${field}`);
  console.log(`      ${diag.message}`);

  if (diag.suggestedFix) {
    console.log(`      Fix: ${diag.suggestedFix.message}`);
  }
}

function buildLocation(diag: CcdvDiagnostic): string {
  const parts: string[] = [];

  if (diag.parentUniqueName) {
    parts.push(diag.parentUniqueName);
  }

  if (diag.uniqueName && diag.uniqueName !== diag.parentUniqueName) {
    parts.push(diag.uniqueName);
  }

  return parts.length > 0 ? ` [${parts.join(" > ")}]` : "";
}
