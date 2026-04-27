import type { CcdvDiagnostic } from "../models/diagnosticModels.js";
import { CCDV_CODES } from "../models/diagnosticModels.js";
import type {
  CustomApiCatalogModel,
  CustomApiDefinitionModel,
  CustomApiParameterModel,
  CustomApiResponsePropertyModel,
} from "../models/customApiModels.js";

export interface NormalizationResult {
  catalog: CustomApiCatalogModel;
  diagnostics: CcdvDiagnostic[];
}

let normCounter = 0;

function makeDiagId(): string {
  normCounter += 1;
  return `norm-${String(normCounter).padStart(4, "0")}`;
}

function resetNormCounter(): void {
  normCounter = 0;
}

function supportsLogicalEntityName(type: string): boolean {
  return type === "Entity" || type === "EntityReference";
}

function getComponentName(customApiUniqueName: string, childUniqueName: string): string {
  return `${customApiUniqueName}.${childUniqueName}`;
}

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function applyOptionalString(obj: Record<string, unknown>, key: string, value: string | undefined): void {
  if (value !== undefined) {
    obj[key] = value;
  } else {
    delete obj[key];
  }
}

function normalizeRequestParameter(
  param: CustomApiParameterModel,
  parentUniqueName: string
): { param: CustomApiParameterModel; diagnostics: CcdvDiagnostic[] } {
  const diags: CcdvDiagnostic[] = [];
  const normalized: CustomApiParameterModel = { ...param };

  if (normalized.logicalEntityName && !supportsLogicalEntityName(normalized.type)) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_PAYLOAD_READONLY_FIELD_REMOVED,
      severity: "warning",
      category: "normalization",
      message: `logicalEntityName removed from request parameter '${param.uniqueName}': type '${param.type}' does not support it.`,
      entityKind: "requestParameter",
      parentUniqueName,
      uniqueName: param.uniqueName,
      field: "logicalEntityName",
      blocking: false,
      suggestedFix: {
        kind: "removeField",
        field: "logicalEntityName",
        message: "logicalEntityName is only valid for Entity and EntityReference parameters.",
      },
    });
    delete normalized.logicalEntityName;
  }

  if (normalized.uniqueName && parentUniqueName) {
    normalized.name = getComponentName(parentUniqueName, normalized.uniqueName);
  }

  const rec = normalized as unknown as Record<string, unknown>;
  applyOptionalString(rec, "displayName", normalizeOptionalString(normalized.displayName));
  applyOptionalString(rec, "description", normalizeOptionalString(normalized.description));

  return { param: normalized, diagnostics: diags };
}

function normalizeResponseProperty(
  prop: CustomApiResponsePropertyModel,
  parentUniqueName: string
): { prop: CustomApiResponsePropertyModel; diagnostics: CcdvDiagnostic[] } {
  const diags: CcdvDiagnostic[] = [];
  const normalized: CustomApiResponsePropertyModel = { ...prop };

  if (normalized.logicalEntityName && !supportsLogicalEntityName(normalized.type)) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_PAYLOAD_READONLY_FIELD_REMOVED,
      severity: "warning",
      category: "normalization",
      message: `logicalEntityName removed from response property '${prop.uniqueName}': type '${prop.type}' does not support it.`,
      entityKind: "responseProperty",
      parentUniqueName,
      uniqueName: prop.uniqueName,
      field: "logicalEntityName",
      blocking: false,
      suggestedFix: {
        kind: "removeField",
        field: "logicalEntityName",
        message: "logicalEntityName is only valid for Entity and EntityReference properties.",
      },
    });
    delete normalized.logicalEntityName;
  }

  if (normalized.uniqueName && parentUniqueName) {
    normalized.name = getComponentName(parentUniqueName, normalized.uniqueName);
  }

  const rec = normalized as unknown as Record<string, unknown>;
  applyOptionalString(rec, "displayName", normalizeOptionalString(normalized.displayName));
  applyOptionalString(rec, "description", normalizeOptionalString(normalized.description));

  return { prop: normalized, diagnostics: diags };
}

function normalizeCustomApiDefinition(
  api: CustomApiDefinitionModel
): { api: CustomApiDefinitionModel; diagnostics: CcdvDiagnostic[] } {
  const diags: CcdvDiagnostic[] = [];
  const normalized: CustomApiDefinitionModel = { ...api };

  const rec = normalized as unknown as Record<string, unknown>;
  applyOptionalString(rec, "description", normalizeOptionalString(normalized.description));
  applyOptionalString(rec, "executePrivilegeName", normalizeOptionalString(normalized.executePrivilegeName));
  applyOptionalString(rec, "boundEntityLogicalName", normalizeOptionalString(normalized.boundEntityLogicalName));

  const normalizedParams: CustomApiParameterModel[] = [];
  for (const param of api.requestParameters ?? []) {
    const result = normalizeRequestParameter(param, api.uniqueName);
    diags.push(...result.diagnostics);
    normalizedParams.push(result.param);
  }
  normalized.requestParameters = normalizedParams;

  const normalizedProps: CustomApiResponsePropertyModel[] = [];
  for (const prop of api.responseProperties ?? []) {
    const result = normalizeResponseProperty(prop, api.uniqueName);
    diags.push(...result.diagnostics);
    normalizedProps.push(result.prop);
  }
  normalized.responseProperties = normalizedProps;

  return { api: normalized, diagnostics: diags };
}

export function normalizeCustomApiCatalog(catalog: CustomApiCatalogModel): NormalizationResult {
  resetNormCounter();
  const allDiags: CcdvDiagnostic[] = [];

  const normalizedApis: CustomApiDefinitionModel[] = [];
  for (const api of catalog.customApis ?? []) {
    const result = normalizeCustomApiDefinition(api);
    allDiags.push(...result.diagnostics);
    normalizedApis.push(result.api);
  }

  return {
    catalog: { ...catalog, customApis: normalizedApis },
    diagnostics: allDiags,
  };
}
