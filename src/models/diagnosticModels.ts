export const CCDV_CODES = {
  // Custom API – uniqueName
  CCDV_CUSTOM_API_UNIQUENAME_REQUIRED: "CCDV_CUSTOM_API_UNIQUENAME_REQUIRED",
  CCDV_CUSTOM_API_UNIQUENAME_TOO_LONG: "CCDV_CUSTOM_API_UNIQUENAME_TOO_LONG",
  CCDV_CUSTOM_API_UNIQUENAME_INVALID: "CCDV_CUSTOM_API_UNIQUENAME_INVALID",
  CCDV_CUSTOM_API_UNIQUENAME_PREFIX_MISSING: "CCDV_CUSTOM_API_UNIQUENAME_PREFIX_MISSING",
  // Custom API – display / meta
  CCDV_CUSTOM_API_NAME_REQUIRED: "CCDV_CUSTOM_API_NAME_REQUIRED",
  CCDV_CUSTOM_API_NAME_TOO_LONG: "CCDV_CUSTOM_API_NAME_TOO_LONG",
  CCDV_CUSTOM_API_DISPLAYNAME_REQUIRED: "CCDV_CUSTOM_API_DISPLAYNAME_REQUIRED",
  CCDV_CUSTOM_API_DISPLAYNAME_TOO_LONG: "CCDV_CUSTOM_API_DISPLAYNAME_TOO_LONG",
  CCDV_CUSTOM_API_DESCRIPTION_TOO_LONG: "CCDV_CUSTOM_API_DESCRIPTION_TOO_LONG",
  // Custom API – structural
  CCDV_CUSTOM_API_BINDINGTYPE_INVALID: "CCDV_CUSTOM_API_BINDINGTYPE_INVALID",
  CCDV_CUSTOM_API_BOUND_ENTITY_REQUIRED: "CCDV_CUSTOM_API_BOUND_ENTITY_REQUIRED",
  CCDV_CUSTOM_API_BOUND_ENTITY_NOT_ALLOWED: "CCDV_CUSTOM_API_BOUND_ENTITY_NOT_ALLOWED",
  CCDV_CUSTOM_API_ALLOWED_STEP_TYPE_INVALID: "CCDV_CUSTOM_API_ALLOWED_STEP_TYPE_INVALID",
  CCDV_CUSTOM_API_IMMUTABLE_FIELD_CHANGED: "CCDV_CUSTOM_API_IMMUTABLE_FIELD_CHANGED",
  // Custom API – function rules
  CCDV_CUSTOM_API_FUNCTION_RESPONSE_REQUIRED: "CCDV_CUSTOM_API_FUNCTION_RESPONSE_REQUIRED",
  CCDV_CUSTOM_API_FUNCTION_OPEN_REQUEST_NOT_ALLOWED: "CCDV_CUSTOM_API_FUNCTION_OPEN_REQUEST_NOT_ALLOWED",
  // Request parameter
  CCDV_PARAM_UNIQUENAME_REQUIRED: "CCDV_PARAM_UNIQUENAME_REQUIRED",
  CCDV_PARAM_UNIQUENAME_INVALID: "CCDV_PARAM_UNIQUENAME_INVALID",
  CCDV_PARAM_TYPE_INVALID: "CCDV_PARAM_TYPE_INVALID",
  CCDV_PARAM_LOGICAL_ENTITY_NAME_NOT_ALLOWED: "CCDV_PARAM_LOGICAL_ENTITY_NAME_NOT_ALLOWED",
  CCDV_PARAM_LOGICAL_ENTITY_NAME_RECOMMENDED: "CCDV_PARAM_LOGICAL_ENTITY_NAME_RECOMMENDED",
  CCDV_PARAM_NAME_RECOMMENDED_FORMAT: "CCDV_PARAM_NAME_RECOMMENDED_FORMAT",
  CCDV_PARAM_IMMUTABLE_FIELD_CHANGED: "CCDV_PARAM_IMMUTABLE_FIELD_CHANGED",
  CCDV_PARAM_BOUND_TARGET_DUPLICATE: "CCDV_PARAM_BOUND_TARGET_DUPLICATE",
  // Response property
  CCDV_RESPONSE_UNIQUENAME_REQUIRED: "CCDV_RESPONSE_UNIQUENAME_REQUIRED",
  CCDV_RESPONSE_UNIQUENAME_INVALID: "CCDV_RESPONSE_UNIQUENAME_INVALID",
  CCDV_RESPONSE_TYPE_INVALID: "CCDV_RESPONSE_TYPE_INVALID",
  CCDV_RESPONSE_LOGICAL_ENTITY_NAME_NOT_ALLOWED: "CCDV_RESPONSE_LOGICAL_ENTITY_NAME_NOT_ALLOWED",
  CCDV_RESPONSE_NAME_RECOMMENDED_FORMAT: "CCDV_RESPONSE_NAME_RECOMMENDED_FORMAT",
  CCDV_RESPONSE_IMMUTABLE_FIELD_CHANGED: "CCDV_RESPONSE_IMMUTABLE_FIELD_CHANGED",
  // Payload / normalization
  CCDV_PAYLOAD_READONLY_FIELD_REMOVED: "CCDV_PAYLOAD_READONLY_FIELD_REMOVED",
  // Configuration
  CCDV_CONFIG_ENVIRONMENT_NOT_SELECTED: "CCDV_CONFIG_ENVIRONMENT_NOT_SELECTED",
  CCDV_CONFIG_ACTIVE_API_NOT_SELECTED: "CCDV_CONFIG_ACTIVE_API_NOT_SELECTED",
  // Dataverse
  CCDV_DATAVERSE_BAD_REQUEST: "CCDV_DATAVERSE_BAD_REQUEST",
  CCDV_DATAVERSE_AUTH_FAILED: "CCDV_DATAVERSE_AUTH_FAILED",
  CCDV_DATAVERSE_FORBIDDEN: "CCDV_DATAVERSE_FORBIDDEN",
  // Filesystem
  CCDV_FILESYSTEM_NOT_FOUND: "CCDV_FILESYSTEM_NOT_FOUND",
} as const;

export type CcdvCode = typeof CCDV_CODES[keyof typeof CCDV_CODES];

export interface CcdvDiagnosticSuggestedFix {
  kind:
    | "removeField"
    | "setField"
    | "changeType"
    | "recreateComponent"
    | "selectEnvironment"
    | "login"
    | "regeneratePlan";
  message: string;
  field?: string;
  value?: unknown;
}

export interface CcdvDiagnosticNotification {
  title: string;
  message: string;
  level: "information" | "warning" | "error";
}

export interface CcdvDiagnosticDataverse {
  httpStatus?: number;
  statusText?: string;
  errorCode?: string;
  errorMessage?: string;
  requestId?: string;
  responseData?: unknown;
}

export interface CcdvDiagnosticRequest {
  method?: string;
  url?: string;
  payload?: unknown;
}

export interface CcdvDiagnostic {
  id: string;
  code: string;
  severity: "info" | "warning" | "error";
  category:
    | "validation"
    | "normalization"
    | "plan"
    | "execution"
    | "dataverse"
    | "filesystem"
    | "auth"
    | "configuration";
  message: string;
  technicalMessage?: string;
  entityKind?:
    | "customApi"
    | "requestParameter"
    | "responseProperty"
    | "environment"
    | "file"
    | "operation";
  parentUniqueName?: string;
  uniqueName?: string;
  field?: string;
  jsonPath?: string;
  operationId?: string;
  action?: string;
  blocking: boolean;
  suggestedFix?: CcdvDiagnosticSuggestedFix;
  notification?: CcdvDiagnosticNotification;
  dataverse?: CcdvDiagnosticDataverse;
  request?: CcdvDiagnosticRequest;
}

export interface CcdvCommandResult<T = unknown> {
  schemaVersion: "1.0.0";
  status: "succeeded" | "failed" | "partial" | "validationFailed";
  command: string;
  startedAtUtc: string;
  finishedAtUtc: string;
  durationMs: number;
  data?: T;
  diagnostics: CcdvDiagnostic[];
}
