export const CUSTOM_API_SCHEMA_VERSION = "1.0";

export type CustomApiBindingType = "Global" | "Entity" | "EntityCollection";
export type CustomApiAllowedProcessingStepType =
  | "None"
  | "AsyncOnly"
  | "SyncAndAsync";

export type CustomApiValueType =
  | "Boolean"
  | "DateTime"
  | "Decimal"
  | "Entity"
  | "EntityCollection"
  | "EntityReference"
  | "Float"
  | "Integer"
  | "Money"
  | "Picklist"
  | "String"
  | "StringArray"
  | "Guid";

export interface CustomApiParameterModel {
  uniqueName: string;
  type: CustomApiValueType | string;
  isOptional: boolean;
  name?: string;
  displayName?: string;
  description?: string;
  logicalEntityName?: string;
}

export interface CustomApiResponsePropertyModel {
  uniqueName: string;
  type: CustomApiValueType | string;
  name?: string;
  displayName?: string;
  description?: string;
  logicalEntityName?: string;
}

export interface CustomApiDefinitionModel {
  uniqueName: string;
  displayName: string;
  name: string;
  bindingType: CustomApiBindingType | string;
  isFunction: boolean;
  isPrivate: boolean;
  workflowSdkStepEnabled: boolean;
  allowedCustomProcessingStepType: CustomApiAllowedProcessingStepType | string;
  requestParameters: CustomApiParameterModel[];
  responseProperties: CustomApiResponsePropertyModel[];
  description?: string;
  executePrivilegeName?: string;
  boundEntityLogicalName?: string;
  pluginTypeName?: string;
  pluginTypeId?: string;
  pluginAssemblyName?: string;
  pluginTypeFriendlyName?: string;
  pluginAssemblyVersion?: string;
}

export interface CustomApiCatalogSourceInfo {
  environmentUrl?: string;
  exportedAtUtc: string;
}

export interface CustomApiCatalogModel {
  schemaVersion: string;
  source: CustomApiCatalogSourceInfo;
  customApis: CustomApiDefinitionModel[];
}

export interface CustomApiSummaryModel {
  uniqueName: string;
  displayName: string;
  name: string;
  bindingType: CustomApiBindingType | string;
  isFunction: boolean;
  isPrivate: boolean;
  workflowSdkStepEnabled: boolean;
  allowedCustomProcessingStepType: CustomApiAllowedProcessingStepType | string;
  description?: string;
  boundEntityLogicalName?: string;
  executePrivilegeName?: string;
  pluginTypeName?: string;
}

export type CustomApiChangeKind =
  | "none"
  | "create"
  | "update"
  | "delete"
  | "recreate";

export interface SemanticDiffFieldChange {
  field: string;
  localValue?: unknown;
  remoteValue?: unknown;
  isImmutable: boolean;
}

export interface CustomApiSemanticDiffItem<T> {
  objectType: "customApi" | "requestParameter" | "responseProperty";
  uniqueName: string;
  kind: CustomApiChangeKind;
  requiresRecreate: boolean;
  fieldChanges: SemanticDiffFieldChange[];
  immutableFieldChanges: string[];
  local?: T | null;
  remote?: T | null;
}

export interface CustomApiSemanticDiffCounter {
  none: number;
  create: number;
  update: number;
  delete: number;
  recreate: number;
}

export interface CustomApiSemanticDiffSummary {
  customApiChangeKind: CustomApiChangeKind;
  requiresCustomApiRecreate: boolean;
  requiresAnyRecreate: boolean;
  requestParameterChanges: CustomApiSemanticDiffCounter;
  responsePropertyChanges: CustomApiSemanticDiffCounter;
}

export interface CustomApiSemanticDiffResult {
  schemaVersion: string;
  uniqueName: string;
  isDifferent: boolean;
  summary: CustomApiSemanticDiffSummary;
  customApi: CustomApiSemanticDiffItem<CustomApiDefinitionModel>;
  requestParameters: Array<CustomApiSemanticDiffItem<CustomApiParameterModel>>;
  responseProperties: Array<CustomApiSemanticDiffItem<CustomApiResponsePropertyModel>>;
}
