import type { CcdvDiagnostic } from "../models/diagnosticModels.js";
import { CCDV_CODES } from "../models/diagnosticModels.js";
import type {
  CustomApiCatalogModel,
  CustomApiDefinitionModel,
  CustomApiParameterModel,
  CustomApiResponsePropertyModel,
} from "../models/customApiModels.js";

const VALID_BINDING_TYPES = ["Global", "Entity", "EntityCollection"];
const VALID_PROCESSING_STEP_TYPES = ["None", "AsyncOnly", "SyncAndAsync"];
const VALID_VALUE_TYPES = [
  "Boolean", "DateTime", "Decimal", "Entity", "EntityCollection",
  "EntityReference", "Float", "Integer", "Money", "Picklist",
  "String", "StringArray", "Guid",
];

const IDENTIFIER_PATTERN = /^[a-zA-Z][a-zA-Z0-9_]*$/;

let diagCounter = 0;

function makeDiagId(): string {
  diagCounter += 1;
  return `diag-${String(diagCounter).padStart(4, "0")}`;
}

export function resetDiagCounter(): void {
  diagCounter = 0;
}

function supportsLogicalEntityName(type: string): boolean {
  return type === "Entity" || type === "EntityReference";
}

export interface ValidationResult {
  diagnostics: CcdvDiagnostic[];
  hasBlockingErrors: boolean;
}

export function validateCustomApiCatalog(catalog: CustomApiCatalogModel): ValidationResult {
  resetDiagCounter();
  const diagnostics: CcdvDiagnostic[] = [];

  for (const api of catalog.customApis ?? []) {
    diagnostics.push(...validateCustomApiDefinition(api));
  }

  return {
    diagnostics,
    hasBlockingErrors: diagnostics.some((d) => d.severity === "error" && d.blocking),
  };
}

function validateCustomApiDefinition(api: CustomApiDefinitionModel): CcdvDiagnostic[] {
  const diags: CcdvDiagnostic[] = [];
  const un = api.uniqueName ?? "";

  // uniqueName
  if (!un) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_CUSTOM_API_UNIQUENAME_REQUIRED,
      severity: "error",
      category: "validation",
      message: "Custom API uniqueName is required.",
      entityKind: "customApi",
      uniqueName: "(unknown)",
      field: "uniqueName",
      jsonPath: "$.uniqueName",
      blocking: true,
      suggestedFix: {
        kind: "setField",
        field: "uniqueName",
        message: "Set a unique name including the publisher prefix, e.g. ccsm_MyApi.",
      },
    });
  } else {
    if (un.length > 128) {
      diags.push({
        id: makeDiagId(),
        code: CCDV_CODES.CCDV_CUSTOM_API_UNIQUENAME_TOO_LONG,
        severity: "error",
        category: "validation",
        message: `Custom API uniqueName '${un}' exceeds 128 characters (${un.length}).`,
        entityKind: "customApi",
        uniqueName: un,
        field: "uniqueName",
        jsonPath: "$.uniqueName",
        blocking: true,
      });
    }

    if (!IDENTIFIER_PATTERN.test(un)) {
      diags.push({
        id: makeDiagId(),
        code: CCDV_CODES.CCDV_CUSTOM_API_UNIQUENAME_INVALID,
        severity: "error",
        category: "validation",
        message: `Custom API uniqueName '${un}' contains invalid characters. Only letters, digits, and underscores are allowed; must start with a letter.`,
        entityKind: "customApi",
        uniqueName: un,
        field: "uniqueName",
        jsonPath: "$.uniqueName",
        blocking: true,
      });
    } else if (!un.includes("_")) {
      diags.push({
        id: makeDiagId(),
        code: CCDV_CODES.CCDV_CUSTOM_API_UNIQUENAME_PREFIX_MISSING,
        severity: "error",
        category: "validation",
        message: `Custom API uniqueName '${un}' is missing a publisher prefix (e.g. ccsm_MyApi).`,
        entityKind: "customApi",
        uniqueName: un,
        field: "uniqueName",
        jsonPath: "$.uniqueName",
        blocking: true,
        suggestedFix: {
          kind: "setField",
          field: "uniqueName",
          message: "Prefix the uniqueName with your publisher prefix, e.g. ccsm_MyApi.",
        },
      });
    }
  }

  // name
  if (!api.name) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_CUSTOM_API_NAME_REQUIRED,
      severity: "error",
      category: "validation",
      message: "Custom API name is required.",
      entityKind: "customApi",
      uniqueName: un,
      field: "name",
      jsonPath: "$.name",
      blocking: true,
      suggestedFix: { kind: "setField", field: "name", message: "Set the name field." },
    });
  } else if (api.name.length > 100) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_CUSTOM_API_NAME_TOO_LONG,
      severity: "error",
      category: "validation",
      message: `Custom API name exceeds 100 characters (${api.name.length}).`,
      entityKind: "customApi",
      uniqueName: un,
      field: "name",
      jsonPath: "$.name",
      blocking: true,
    });
  }

  // displayName
  if (!api.displayName) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_CUSTOM_API_DISPLAYNAME_REQUIRED,
      severity: "error",
      category: "validation",
      message: "Custom API displayName is required.",
      entityKind: "customApi",
      uniqueName: un,
      field: "displayName",
      jsonPath: "$.displayName",
      blocking: true,
      suggestedFix: { kind: "setField", field: "displayName", message: "Set the displayName field." },
    });
  } else if (api.displayName.length > 100) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_CUSTOM_API_DISPLAYNAME_TOO_LONG,
      severity: "error",
      category: "validation",
      message: `Custom API displayName exceeds 100 characters (${api.displayName.length}).`,
      entityKind: "customApi",
      uniqueName: un,
      field: "displayName",
      jsonPath: "$.displayName",
      blocking: true,
    });
  }

  // description
  if (api.description && api.description.length > 300) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_CUSTOM_API_DESCRIPTION_TOO_LONG,
      severity: "error",
      category: "validation",
      message: `Custom API description exceeds 300 characters (${api.description.length}).`,
      entityKind: "customApi",
      uniqueName: un,
      field: "description",
      jsonPath: "$.description",
      blocking: true,
    });
  }

  // bindingType
  if (!VALID_BINDING_TYPES.includes(api.bindingType)) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_CUSTOM_API_BINDINGTYPE_INVALID,
      severity: "error",
      category: "validation",
      message: `Custom API bindingType '${api.bindingType}' is invalid. Allowed: ${VALID_BINDING_TYPES.join(", ")}.`,
      entityKind: "customApi",
      uniqueName: un,
      field: "bindingType",
      jsonPath: "$.bindingType",
      blocking: true,
    });
  } else {
    if ((api.bindingType === "Entity" || api.bindingType === "EntityCollection") && !api.boundEntityLogicalName) {
      diags.push({
        id: makeDiagId(),
        code: CCDV_CODES.CCDV_CUSTOM_API_BOUND_ENTITY_REQUIRED,
        severity: "error",
        category: "validation",
        message: `Custom API with bindingType '${api.bindingType}' requires boundEntityLogicalName.`,
        entityKind: "customApi",
        uniqueName: un,
        field: "boundEntityLogicalName",
        jsonPath: "$.boundEntityLogicalName",
        blocking: true,
        suggestedFix: {
          kind: "setField",
          field: "boundEntityLogicalName",
          message: "Set the logical name of the bound table, e.g. account.",
        },
      });
    }

    if (api.bindingType === "Global" && api.boundEntityLogicalName) {
      diags.push({
        id: makeDiagId(),
        code: CCDV_CODES.CCDV_CUSTOM_API_BOUND_ENTITY_NOT_ALLOWED,
        severity: "error",
        category: "validation",
        message: "Custom API with bindingType 'Global' must not have boundEntityLogicalName.",
        entityKind: "customApi",
        uniqueName: un,
        field: "boundEntityLogicalName",
        jsonPath: "$.boundEntityLogicalName",
        blocking: true,
        suggestedFix: {
          kind: "removeField",
          field: "boundEntityLogicalName",
          message: "Remove boundEntityLogicalName for Global binding type.",
        },
      });
    }
  }

  // allowedCustomProcessingStepType
  if (!VALID_PROCESSING_STEP_TYPES.includes(api.allowedCustomProcessingStepType)) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_CUSTOM_API_ALLOWED_STEP_TYPE_INVALID,
      severity: "error",
      category: "validation",
      message: `Custom API allowedCustomProcessingStepType '${api.allowedCustomProcessingStepType}' is invalid. Allowed: ${VALID_PROCESSING_STEP_TYPES.join(", ")}.`,
      entityKind: "customApi",
      uniqueName: un,
      field: "allowedCustomProcessingStepType",
      jsonPath: "$.allowedCustomProcessingStepType",
      blocking: true,
    });
  }

  const requestParameters = api.requestParameters ?? [];
  const responseProperties = api.responseProperties ?? [];

  // Function rules
  if (api.isFunction) {
    if (responseProperties.length === 0) {
      diags.push({
        id: makeDiagId(),
        code: CCDV_CODES.CCDV_CUSTOM_API_FUNCTION_RESPONSE_REQUIRED,
        severity: "error",
        category: "validation",
        message: "A Custom API defined as a Function must have at least one response property.",
        entityKind: "customApi",
        uniqueName: un,
        field: "responseProperties",
        jsonPath: "$.responseProperties",
        blocking: true,
        suggestedFix: {
          kind: "setField",
          field: "responseProperties",
          message: "Add at least one response property.",
        },
      });
    }

    for (const param of requestParameters) {
      const isOpenEntity =
        (param.type === "Entity" || param.type === "EntityCollection") &&
        !param.logicalEntityName;

      if (isOpenEntity) {
        diags.push({
          id: makeDiagId(),
          code: CCDV_CODES.CCDV_CUSTOM_API_FUNCTION_OPEN_REQUEST_NOT_ALLOWED,
          severity: "error",
          category: "validation",
          message: `Function request parameter '${param.uniqueName}' uses an open '${param.type}' type, which is not allowed for Functions.`,
          entityKind: "requestParameter",
          parentUniqueName: un,
          uniqueName: param.uniqueName,
          field: "type",
          jsonPath: `$.requestParameters[?(@.uniqueName=='${param.uniqueName}')].type`,
          blocking: true,
        });
      }
    }
  }

  // Bound API: warn if a request parameter looks like a manual Target duplicate
  if (api.bindingType === "Entity" || api.bindingType === "EntityCollection") {
    const targetParam = requestParameters.find(
      (p) => p.uniqueName.toLowerCase() === "target"
    );

    if (targetParam) {
      diags.push({
        id: makeDiagId(),
        code: CCDV_CODES.CCDV_PARAM_BOUND_TARGET_DUPLICATE,
        severity: "warning",
        category: "validation",
        message: `Request parameter 'Target' appears to duplicate the auto-generated binding parameter for a bound Custom API. Dataverse creates this parameter automatically.`,
        entityKind: "requestParameter",
        parentUniqueName: un,
        uniqueName: targetParam.uniqueName,
        field: "uniqueName",
        jsonPath: `$.requestParameters[?(@.uniqueName=='${targetParam.uniqueName}')]`,
        blocking: false,
        suggestedFix: {
          kind: "removeField",
          message: "Remove the Target parameter — Dataverse generates it automatically for bound APIs.",
        },
      });
    }
  }

  // Request parameters
  for (const [i, param] of requestParameters.entries()) {
    diags.push(...validateRequestParameter(param, un, i));
  }

  // Response properties
  for (const [i, prop] of responseProperties.entries()) {
    diags.push(...validateResponseProperty(prop, un, i));
  }

  return diags;
}

export function validateRequestParameter(
  param: CustomApiParameterModel,
  parentUniqueName: string,
  index?: number
): CcdvDiagnostic[] {
  const diags: CcdvDiagnostic[] = [];
  const pn = param.uniqueName || `(index ${index ?? "?"})`;
  const basePath =
    param.uniqueName
      ? `$.requestParameters[?(@.uniqueName=='${param.uniqueName}')]`
      : `$.requestParameters[${index ?? "?"}]`;

  // uniqueName
  if (!param.uniqueName) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_PARAM_UNIQUENAME_REQUIRED,
      severity: "error",
      category: "validation",
      message: "Request parameter uniqueName is required.",
      entityKind: "requestParameter",
      parentUniqueName,
      uniqueName: pn,
      field: "uniqueName",
      jsonPath: `${basePath}.uniqueName`,
      blocking: true,
    });
  } else if (!IDENTIFIER_PATTERN.test(param.uniqueName)) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_PARAM_UNIQUENAME_INVALID,
      severity: "error",
      category: "validation",
      message: `Request parameter uniqueName '${param.uniqueName}' contains invalid characters. Only letters, digits, and underscores are allowed; must start with a letter.`,
      entityKind: "requestParameter",
      parentUniqueName,
      uniqueName: pn,
      field: "uniqueName",
      jsonPath: `${basePath}.uniqueName`,
      blocking: true,
    });
  }

  // type
  if (!param.type) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_PARAM_TYPE_INVALID,
      severity: "error",
      category: "validation",
      message: `Request parameter '${pn}' is missing a type.`,
      entityKind: "requestParameter",
      parentUniqueName,
      uniqueName: pn,
      field: "type",
      jsonPath: `${basePath}.type`,
      blocking: true,
    });
  } else if (!VALID_VALUE_TYPES.includes(param.type)) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_PARAM_TYPE_INVALID,
      severity: "error",
      category: "validation",
      message: `Request parameter '${pn}' has invalid type '${param.type}'. Allowed: ${VALID_VALUE_TYPES.join(", ")}.`,
      entityKind: "requestParameter",
      parentUniqueName,
      uniqueName: pn,
      field: "type",
      jsonPath: `${basePath}.type`,
      blocking: true,
    });
  }

  // logicalEntityName
  if (param.logicalEntityName) {
    if (!supportsLogicalEntityName(param.type)) {
      diags.push({
        id: makeDiagId(),
        code: CCDV_CODES.CCDV_PARAM_LOGICAL_ENTITY_NAME_NOT_ALLOWED,
        severity: "error",
        category: "validation",
        message: `Request parameter '${pn}' has type '${param.type}' which does not support logicalEntityName. Only Entity and EntityReference are allowed.`,
        technicalMessage: `Parameter '${pn}' has type '${param.type}' but defines logicalEntityName '${param.logicalEntityName}'.`,
        entityKind: "requestParameter",
        parentUniqueName,
        uniqueName: pn,
        field: "logicalEntityName",
        jsonPath: `${basePath}.logicalEntityName`,
        blocking: true,
        suggestedFix: {
          kind: "removeField",
          field: "logicalEntityName",
          message: "Remove logicalEntityName or change the parameter type to Entity or EntityReference.",
        },
        notification: {
          title: "Invalid request parameter",
          message: `'${pn}' uses logicalEntityName with type '${param.type}'.`,
          level: "error",
        },
      });
    }
  } else if (supportsLogicalEntityName(param.type)) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_PARAM_LOGICAL_ENTITY_NAME_RECOMMENDED,
      severity: "info",
      category: "validation",
      message: `Request parameter '${pn}' has type '${param.type}' without logicalEntityName (open type). This is valid but may not be intentional.`,
      entityKind: "requestParameter",
      parentUniqueName,
      uniqueName: pn,
      field: "logicalEntityName",
      jsonPath: `${basePath}.logicalEntityName`,
      blocking: false,
    });
  }

  // name format: must be {customApiUniqueName}.{uniqueName}
  if (param.uniqueName && parentUniqueName) {
    const expected = `${parentUniqueName}.${param.uniqueName}`;
    if (!param.name || param.name !== expected) {
      diags.push({
        id: makeDiagId(),
        code: CCDV_CODES.CCDV_PARAM_NAME_RECOMMENDED_FORMAT,
        severity: "warning",
        category: "validation",
        message: param.name
          ? `Request parameter '${pn}' name '${param.name}' does not match the required format '${expected}'.`
          : `Request parameter '${pn}' is missing the name field. Expected: '${expected}'.`,
        entityKind: "requestParameter",
        parentUniqueName,
        uniqueName: pn,
        field: "name",
        jsonPath: `${basePath}.name`,
        blocking: false,
        suggestedFix: {
          kind: "setField",
          field: "name",
          value: expected,
          message: `Set name to '${expected}'.`,
        },
      });
    }
  }

  return diags;
}

export function validateResponseProperty(
  prop: CustomApiResponsePropertyModel,
  parentUniqueName: string,
  index?: number
): CcdvDiagnostic[] {
  const diags: CcdvDiagnostic[] = [];
  const pn = prop.uniqueName || `(index ${index ?? "?"})`;
  const basePath =
    prop.uniqueName
      ? `$.responseProperties[?(@.uniqueName=='${prop.uniqueName}')]`
      : `$.responseProperties[${index ?? "?"}]`;

  // uniqueName
  if (!prop.uniqueName) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_RESPONSE_UNIQUENAME_REQUIRED,
      severity: "error",
      category: "validation",
      message: "Response property uniqueName is required.",
      entityKind: "responseProperty",
      parentUniqueName,
      uniqueName: pn,
      field: "uniqueName",
      jsonPath: `${basePath}.uniqueName`,
      blocking: true,
    });
  } else if (!IDENTIFIER_PATTERN.test(prop.uniqueName)) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_RESPONSE_UNIQUENAME_INVALID,
      severity: "error",
      category: "validation",
      message: `Response property uniqueName '${prop.uniqueName}' contains invalid characters. Only letters, digits, and underscores are allowed; must start with a letter.`,
      entityKind: "responseProperty",
      parentUniqueName,
      uniqueName: pn,
      field: "uniqueName",
      jsonPath: `${basePath}.uniqueName`,
      blocking: true,
    });
  }

  // type
  if (!prop.type) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_RESPONSE_TYPE_INVALID,
      severity: "error",
      category: "validation",
      message: `Response property '${pn}' is missing a type.`,
      entityKind: "responseProperty",
      parentUniqueName,
      uniqueName: pn,
      field: "type",
      jsonPath: `${basePath}.type`,
      blocking: true,
    });
  } else if (!VALID_VALUE_TYPES.includes(prop.type)) {
    diags.push({
      id: makeDiagId(),
      code: CCDV_CODES.CCDV_RESPONSE_TYPE_INVALID,
      severity: "error",
      category: "validation",
      message: `Response property '${pn}' has invalid type '${prop.type}'. Allowed: ${VALID_VALUE_TYPES.join(", ")}.`,
      entityKind: "responseProperty",
      parentUniqueName,
      uniqueName: pn,
      field: "type",
      jsonPath: `${basePath}.type`,
      blocking: true,
    });
  }

  // logicalEntityName
  if (prop.logicalEntityName) {
    if (!supportsLogicalEntityName(prop.type)) {
      diags.push({
        id: makeDiagId(),
        code: CCDV_CODES.CCDV_RESPONSE_LOGICAL_ENTITY_NAME_NOT_ALLOWED,
        severity: "error",
        category: "validation",
        message: `Response property '${pn}' has type '${prop.type}' which does not support logicalEntityName. Only Entity and EntityReference are allowed.`,
        technicalMessage: `Response property '${pn}' has type '${prop.type}' but defines logicalEntityName '${prop.logicalEntityName}'.`,
        entityKind: "responseProperty",
        parentUniqueName,
        uniqueName: pn,
        field: "logicalEntityName",
        jsonPath: `${basePath}.logicalEntityName`,
        blocking: true,
        suggestedFix: {
          kind: "removeField",
          field: "logicalEntityName",
          message: "Remove logicalEntityName or change the property type to Entity or EntityReference.",
        },
        notification: {
          title: "Invalid response property",
          message: `'${pn}' uses logicalEntityName with type '${prop.type}'.`,
          level: "error",
        },
      });
    }
  }

  // name format: must be {customApiUniqueName}.{uniqueName}
  if (prop.uniqueName && parentUniqueName) {
    const expected = `${parentUniqueName}.${prop.uniqueName}`;
    if (!prop.name || prop.name !== expected) {
      diags.push({
        id: makeDiagId(),
        code: CCDV_CODES.CCDV_RESPONSE_NAME_RECOMMENDED_FORMAT,
        severity: "warning",
        category: "validation",
        message: prop.name
          ? `Response property '${pn}' name '${prop.name}' does not match the required format '${expected}'.`
          : `Response property '${pn}' is missing the name field. Expected: '${expected}'.`,
        entityKind: "responseProperty",
        parentUniqueName,
        uniqueName: pn,
        field: "name",
        jsonPath: `${basePath}.name`,
        blocking: false,
        suggestedFix: {
          kind: "setField",
          field: "name",
          value: expected,
          message: `Set name to '${expected}'.`,
        },
      });
    }
  }

  return diags;
}
