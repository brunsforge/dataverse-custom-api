import path from "node:path";
import { unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { DataverseClient } from "../api/dataverseClient.js";
import { CustomApiRepository } from "../api/customApiRepository.js";
import type { EnvironmentCache, ActiveApiCache } from "../models/configModels.js";
import type {
  CustomApiCatalogModel,
  CustomApiChangeKind,
  CustomApiDefinitionModel,
  CustomApiParameterModel,
  CustomApiResponsePropertyModel,
  CustomApiSemanticDiffCounter,
  CustomApiSemanticDiffItem,
  CustomApiSemanticDiffResult,
  CustomApiSummaryModel,
  CustomApiSyncExecutionState,
  CustomApiSyncOperation,
  CustomApiSyncOperationError,
  CustomApiSyncOperationResult,
  CustomApiSyncPlan,
  SemanticDiffFieldChange,
} from "../models/customApiModels.js";
import type { CcdvCommandResult } from "../models/diagnosticModels.js";
import type { RuntimeContext } from "../models/runtime-context.js";
import type {
  CheckCustomApiMetadataResult,
  ListPublishersResult,
  MetadataMismatchItem,
  PrivilegeCheckItem,
  PublisherInfo,
  ValidateCustomApiResult,
  ValidatePrivilegesResult,
} from "../models/public-types.js";
import { validateCustomApiCatalog } from "../validation/customApiValidator.js";
import { loadAuthConfig } from "../auth/authConfig.js";
import { ensureCacheFolders, readJsonFile, writeJsonFile, fileExists } from "../utils/fileSystem.js";
import {
  getActiveApiCacheFilePath,
  getCustomApiOutputRootPath,
  getEnvironmentCacheFilePath,
} from "../utils/paths.js";

export interface ConnectResult {
  environmentUrl: string;
  authMode: string;
  environmentCacheFilePath: string;
}

export interface SelectResult {
  uniqueName: string;
  activeApiCacheFilePath: string;
}

export interface CurrentCustomApiResult {
  uniqueName: string;
  activeApiCacheFilePath: string;
}

export interface RemoveCustomApiResult {
  uniqueName: string;
  filePath: string;
  fileDeleted: boolean;
  activeApiCleared: boolean;
}

export interface ExportResult {
  uniqueName: string;
  filePath: string;
  catalog: CustomApiCatalogModel;
}

export interface BuildSyncPlanResult {
  uniqueName: string;
  filePath: string;
  stateFilePath: string;
  plan: CustomApiSyncPlan;
  executionState: CustomApiSyncExecutionState;
}

export interface ExecuteSyncOperationResult {
  uniqueName: string;
  filePath: string;
  stateFilePath: string;
  result: CustomApiSyncOperationResult;
  executionState: CustomApiSyncExecutionState;
}

export interface ExecuteSyncPlanResult {
  uniqueName: string;
  filePath: string;
  stateFilePath: string;
  executionState: CustomApiSyncExecutionState;
}

function getCustomApiArtifactFilePath(uniqueName: string, outputRoot: string): string {
  return path.join(outputRoot, `${uniqueName}.json`);
}

function getSyncPlanFilePath(uniqueName: string, outputRoot: string): string {
  return path.join(outputRoot, `${uniqueName}.syncplan.json`);
}

function getSyncStateFilePath(uniqueName: string, outputRoot: string): string {
  return path.join(outputRoot, `${uniqueName}.syncstate.json`);
}

export async function connectToEnvironment(
  environmentUrl: string,
  context?: RuntimeContext
): Promise<ConnectResult> {
  await ensureCacheFolders(context);

  const client = new DataverseClient(environmentUrl, context);
  await client.whoAmI();

  const auth = await loadAuthConfig(context);

  const cache: EnvironmentCache = {
    environmentUrl,
    authMode: auth.authMode ?? "deviceCode",
    savedAtUtc: new Date().toISOString(),
  };

  if (auth.tenantId) {
    cache.tenantId = auth.tenantId;
  }

  if (auth.clientId) {
    cache.clientId = auth.clientId;
  }

  const environmentCacheFilePath = await getEnvironmentCacheFilePath(context);
  await writeJsonFile(environmentCacheFilePath, cache);

  return {
    environmentUrl,
    authMode: cache.authMode,
    environmentCacheFilePath,
  };
}

export async function getCurrentEnvironment(
  context?: RuntimeContext
): Promise<EnvironmentCache> {
  const environmentCacheFilePath = await getEnvironmentCacheFilePath(context);
  return readJsonFile<EnvironmentCache>(environmentCacheFilePath);
}

export async function listCustomApis(
  context?: RuntimeContext
): Promise<CustomApiSummaryModel[]> {
  const env = await getCurrentEnvironment(context);
  const client = new DataverseClient(env.environmentUrl, context);
  const repository = new CustomApiRepository(client);
  return repository.listCustomApis();
}

export async function setActiveCustomApi(
  uniqueName: string,
  context?: RuntimeContext
): Promise<SelectResult> {
  await ensureCacheFolders(context);

  const activeApi: ActiveApiCache = {
    uniqueName,
    savedAtUtc: new Date().toISOString(),
  };

  const activeApiCacheFilePath = await getActiveApiCacheFilePath(context);
  await writeJsonFile(activeApiCacheFilePath, activeApi);

  return {
    uniqueName,
    activeApiCacheFilePath,
  };
}

export async function getActiveCustomApiUniqueName(
  context?: RuntimeContext
): Promise<string> {
  const activeApiCacheFilePath = await getActiveApiCacheFilePath(context);
  const activeApi = await readJsonFile<ActiveApiCache>(activeApiCacheFilePath);
  return activeApi.uniqueName;
}

export async function getCurrentCustomApi(
  context?: RuntimeContext
): Promise<CurrentCustomApiResult> {
  const activeApiCacheFilePath = await getActiveApiCacheFilePath(context);
  const activeApi = await readJsonFile<ActiveApiCache>(activeApiCacheFilePath);

  return {
    uniqueName: activeApi.uniqueName,
    activeApiCacheFilePath,
  };
}

export async function removeCustomApi(
  uniqueNameArg?: string,
  context?: RuntimeContext
): Promise<RemoveCustomApiResult> {
  await ensureCacheFolders(context);

  const activeApiCacheFilePath = await getActiveApiCacheFilePath(context);
  const activeUniqueName = await getActiveCustomApiUniqueName(context);
  const uniqueName = uniqueNameArg ?? activeUniqueName;

  if (!uniqueName) {
    throw new Error("No custom API specified and no active API set.");
  }

  const outputRoot = await getCustomApiOutputRootPath(context);
  const filePath = getCustomApiArtifactFilePath(uniqueName, outputRoot);

  let fileDeleted = false;
  if (await fileExists(filePath)) {
    await unlink(filePath);
    fileDeleted = true;
  }

  let activeApiCleared = false;
  if (activeUniqueName === uniqueName && await fileExists(activeApiCacheFilePath)) {
    await unlink(activeApiCacheFilePath);
    activeApiCleared = true;
  }

  return {
    uniqueName,
    filePath,
    fileDeleted,
    activeApiCleared,
  };
}

export async function exportCustomApi(
  uniqueNameArg?: string,
  context?: RuntimeContext
): Promise<ExportResult> {
  await ensureCacheFolders(context);

  const env = await getCurrentEnvironment(context);
  const uniqueName = uniqueNameArg ?? (await getActiveCustomApiUniqueName(context));

  if (!uniqueName) {
    throw new Error("No custom API specified and no active API set.");
  }

  const client = new DataverseClient(env.environmentUrl, context);
  const repository = new CustomApiRepository(client);
  const catalog = await repository.exportCatalog(uniqueName, {
    environmentUrl: env.environmentUrl,
  });

  const outputRoot = await getCustomApiOutputRootPath(context);
  const filePath = getCustomApiArtifactFilePath(uniqueName, outputRoot);
  await writeJsonFile(filePath, catalog);

  return {
    uniqueName,
    filePath,
    catalog,
  };
}

export async function loadLocalCustomApiCatalog(
  uniqueNameArg?: string,
  context?: RuntimeContext
): Promise<CustomApiCatalogModel> {
  const uniqueName = uniqueNameArg ?? (await getActiveCustomApiUniqueName(context));

  if (!uniqueName) {
    throw new Error("No custom API specified and no active API set.");
  }

  const outputRoot = await getCustomApiOutputRootPath(context);
  const filePath = getCustomApiArtifactFilePath(uniqueName, outputRoot);
  return readJsonFile<CustomApiCatalogModel>(filePath);
}

const CUSTOM_API_RECREATE_FIELDS: Array<keyof CustomApiDefinitionModel> = [
  "uniqueName",
  "bindingType",
  "boundEntityLogicalName",
  "isFunction",
];

const CUSTOM_API_COMPARE_FIELDS: Array<keyof CustomApiDefinitionModel> = [
  "uniqueName",
  "displayName",
  "name",
  "description",
  "bindingType",
  "executePrivilegeName",
  "boundEntityLogicalName",
  "pluginTypeName",
  "pluginTypeId",
  "pluginAssemblyName",
  "pluginTypeFriendlyName",
  "pluginAssemblyVersion",
  "isFunction",
  "isPrivate",
  "workflowSdkStepEnabled",
  "allowedCustomProcessingStepType",
];

const REQUEST_PARAMETER_RECREATE_FIELDS: Array<keyof CustomApiParameterModel> = [
  "uniqueName",
  "type",
  "isOptional",
  "logicalEntityName",
];

const REQUEST_PARAMETER_COMPARE_FIELDS: Array<keyof CustomApiParameterModel> = [
  "uniqueName",
  "displayName",
  "description",
  "type",
  "isOptional",
  "logicalEntityName",
];

const RESPONSE_PROPERTY_RECREATE_FIELDS: Array<keyof CustomApiResponsePropertyModel> = [
  "uniqueName",
  "type",
  "logicalEntityName",
];

const RESPONSE_PROPERTY_COMPARE_FIELDS: Array<keyof CustomApiResponsePropertyModel> = [
  "uniqueName",
  "displayName",
  "description",
  "type",
  "logicalEntityName",
];

function valuesEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function compareFields<T extends Record<string, unknown>>(
  localItem: T,
  remoteItem: T,
  fields: string[],
  immutableFields: string[]
): SemanticDiffFieldChange[] {
  const changes: SemanticDiffFieldChange[] = [];

  for (const field of fields) {
    const localValue = localItem[field];
    const remoteValue = remoteItem[field];

    if (!valuesEqual(localValue, remoteValue)) {
      changes.push({
        field,
        localValue,
        remoteValue,
        isImmutable: immutableFields.includes(field),
      });
    }
  }

  return changes;
}

function buildEmptyCounter(): CustomApiSemanticDiffCounter {
  return {
    none: 0,
    create: 0,
    update: 0,
    delete: 0,
    recreate: 0,
  };
}

function incrementCounter(counter: CustomApiSemanticDiffCounter, kind: CustomApiChangeKind): void {
  counter[kind] += 1;
}

function buildMapByUniqueName<T extends { uniqueName: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();

  for (const item of items) {
    map.set(item.uniqueName, item);
  }

  return map;
}

function buildSemanticItem<T extends { uniqueName: string }>(
  objectType: "customApi" | "requestParameter" | "responseProperty",
  uniqueName: string,
  kind: CustomApiChangeKind,
  fieldChanges: SemanticDiffFieldChange[],
  local?: T | null,
  remote?: T | null
): CustomApiSemanticDiffItem<T> {
  const immutableFieldChanges = fieldChanges
    .filter((change) => change.isImmutable)
    .map((change) => change.field);

  const result: CustomApiSemanticDiffItem<T> = {
    objectType,
    uniqueName,
    kind,
    requiresRecreate: kind === "recreate",
    fieldChanges,
    immutableFieldChanges,
  };

  if (local !== undefined) {
    result.local = local;
  }

  if (remote !== undefined) {
    result.remote = remote;
  }

  return result;
}

function diffSingleObject<T extends { uniqueName: string }>(
  objectType: "customApi" | "requestParameter" | "responseProperty",
  localItem: T,
  remoteItem: T,
  fields: string[],
  immutableFields: string[]
): CustomApiSemanticDiffItem<T> {
  const fieldChanges = compareFields(
    localItem as Record<string, unknown>,
    remoteItem as Record<string, unknown>,
    fields,
    immutableFields
  );

  if (fieldChanges.length === 0) {
    return buildSemanticItem(objectType, localItem.uniqueName, "none", [], localItem, remoteItem);
  }

  const hasImmutableChange = fieldChanges.some((change) => change.isImmutable);
  return buildSemanticItem(
    objectType,
    localItem.uniqueName,
    hasImmutableChange ? "recreate" : "update",
    fieldChanges,
    localItem,
    remoteItem
  );
}

function diffNamedCollection<T extends { uniqueName: string }>(
  objectType: "requestParameter" | "responseProperty",
  localItems: T[],
  remoteItems: T[],
  fields: string[],
  immutableFields: string[]
): Array<CustomApiSemanticDiffItem<T>> {
  const results: Array<CustomApiSemanticDiffItem<T>> = [];
  const localMap = buildMapByUniqueName(localItems);
  const remoteMap = buildMapByUniqueName(remoteItems);
  const allUniqueNames = Array.from(new Set<string>([
    ...localMap.keys(),
    ...remoteMap.keys(),
  ])).sort((a, b) => a.localeCompare(b, "de"));

  for (const uniqueName of allUniqueNames) {
    const localItem = localMap.get(uniqueName);
    const remoteItem = remoteMap.get(uniqueName);

    if (localItem && !remoteItem) {
      results.push(buildSemanticItem(objectType, uniqueName, "create", [], localItem, null));
      continue;
    }

    if (!localItem && remoteItem) {
      results.push(buildSemanticItem(objectType, uniqueName, "delete", [], null, remoteItem));
      continue;
    }

    if (!localItem || !remoteItem) {
      continue;
    }

    results.push(
      diffSingleObject(objectType, localItem, remoteItem, fields, immutableFields)
    );
  }

  return results;
}

function ensureUniqueName(
  uniqueNameArg: string | undefined,
  activeUniqueName: string | undefined
): string {
  const uniqueName = uniqueNameArg ?? activeUniqueName;
  if (!uniqueName) {
    throw new Error("No custom API specified and no active API set.");
  }

  return uniqueName;
}

function buildOperationId(sequence: number, action: string, uniqueName: string): string {
  const seq = String(sequence).padStart(4, "0");
  return `op-${seq}-${action}-${uniqueName}-${randomUUID()}`;
}

function createExecutionState(plan: CustomApiSyncPlan): CustomApiSyncExecutionState {
  return {
    schemaVersion: plan.schemaVersion,
    planId: plan.planId,
    uniqueName: plan.uniqueName,
    status: "pending",
    operations: plan.operations.map((operation) => ({
      ...operation,
      status: "pending",
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getRecordProperty(
  value: unknown,
  propertyName: string
): Record<string, unknown> | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const propertyValue = value[propertyName];
  return isRecord(propertyValue) ? propertyValue : undefined;
}

function getStringProperty(value: unknown, propertyName: string): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const propertyValue = value[propertyName];
  return typeof propertyValue === "string" ? propertyValue : undefined;
}

function getNumberProperty(value: unknown, propertyName: string): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const propertyValue = value[propertyName];
  return typeof propertyValue === "number" ? propertyValue : undefined;
}

function parseAxiosPayload(data: unknown): unknown {
  if (typeof data !== "string") {
    return data;
  }

  try {
    return JSON.parse(data);
  } catch {
    return data;
  }
}

function getHeaderValue(headers: unknown, names: string[]): string | undefined {
  if (!isRecord(headers)) {
    return undefined;
  }

  for (const name of names) {
    const directValue = headers[name];
    if (typeof directValue === "string") {
      return directValue;
    }

    const lowerCaseValue = headers[name.toLowerCase()];
    if (typeof lowerCaseValue === "string") {
      return lowerCaseValue;
    }
  }

  return undefined;
}

function buildErrorObject(error: unknown): CustomApiSyncOperationError {
  const errorRecord = isRecord(error) ? error : undefined;
  const response = getRecordProperty(error, "response");
  const config = getRecordProperty(error, "config");
  const responseData = response?.data;
  const dataverseError = getRecordProperty(responseData, "error");

  const name =
    getStringProperty(error, "name") ??
    (error instanceof Error ? error.name : undefined) ??
    "Error";

  const message =
    getStringProperty(error, "message") ??
    (error instanceof Error ? error.message : undefined) ??
    String(error);

  const err: CustomApiSyncOperationError = {
    name,
    message,
  };

  const code = getStringProperty(error, "code");
  if (code) {
    err.code = code;
  }

  const details = getStringProperty(error, "details");
  if (details) {
    err.details = details;
  }

  const httpStatus = getNumberProperty(response, "status");
  if (httpStatus !== undefined) {
    err.httpStatus = httpStatus;
  }

  const statusText = getStringProperty(response, "statusText");
  if (statusText) {
    err.statusText = statusText;
  }

  const dataverseErrorCode = getStringProperty(dataverseError, "code");
  if (dataverseErrorCode) {
    err.dataverseErrorCode = dataverseErrorCode;
  }

  const dataverseErrorMessage = getStringProperty(dataverseError, "message");
  if (dataverseErrorMessage) {
    err.dataverseErrorMessage = dataverseErrorMessage;
  }

  const dataverseInnerError = dataverseError?.innererror;
  if (dataverseInnerError !== undefined) {
    err.dataverseInnerError = dataverseInnerError;
  }

  if (responseData !== undefined) {
    err.responseData = responseData;
  }

  const requestId = getHeaderValue(response?.headers, [
    "x-ms-request-id",
    "req_id",
    "request-id",
    "x-ms-correlation-request-id",
  ]);
  if (requestId) {
    err.requestId = requestId;
  }

  if (config) {
    const method = getStringProperty(config, "method")?.toUpperCase();
    const url = getStringProperty(config, "url");
    const baseURL = getStringProperty(config, "baseURL");
    const payload = parseAxiosPayload(config.data);

    if (method || url || baseURL || payload !== undefined) {
      err.request = {};

      if (method) {
        err.request.method = method;
      }

      if (url) {
        err.request.url = url;
      }

      if (baseURL) {
        err.request.baseURL = baseURL;
      }

      if (payload !== undefined) {
        err.request.payload = payload;
      }
    }
  }

  if (errorRecord?.cause && err.details === undefined) {
    err.details = String(errorRecord.cause);
  }

  return err;
}

function markOverallStatus(state: CustomApiSyncExecutionState): void {
  if (state.operations.some((operation) => operation.status === "failed")) {
    state.status = "failed";
    if (!state.finishedAtUtc) {
      state.finishedAtUtc = new Date().toISOString();
    }
    return;
  }

  if (
    state.operations.length > 0 &&
    state.operations.every((operation) => operation.status === "succeeded")
  ) {
    state.status = "succeeded";
    if (!state.finishedAtUtc) {
      state.finishedAtUtc = new Date().toISOString();
    }
    return;
  }

  if (state.operations.some((operation) => operation.status === "running")) {
    state.status = "running";
    return;
  }

  state.status = "pending";
}

async function loadPlanAndState(
  uniqueName: string,
  context?: RuntimeContext
): Promise<{
  planFilePath: string;
  stateFilePath: string;
  plan: CustomApiSyncPlan;
  executionState: CustomApiSyncExecutionState;
}> {
  const outputRoot = await getCustomApiOutputRootPath(context);
  const planFilePath = getSyncPlanFilePath(uniqueName, outputRoot);
  const stateFilePath = getSyncStateFilePath(uniqueName, outputRoot);

  const plan = await readJsonFile<CustomApiSyncPlan>(planFilePath);
  const executionState = await readJsonFile<CustomApiSyncExecutionState>(stateFilePath);

  return {
    planFilePath,
    stateFilePath,
    plan,
    executionState,
  };
}

function buildPlanFromDiff(diff: CustomApiSemanticDiffResult): CustomApiSyncPlan {
  let sequence = 10;
  const operations: CustomApiSyncOperation[] = [];

  const pushOperation = (
    action: CustomApiSyncOperation["action"],
    objectType: CustomApiSyncOperation["objectType"],
    uniqueName: string,
    reason: CustomApiSyncOperation["reason"],
    requiresDestructiveChange: boolean,
    changedFields?: string[]
  ): void => {
    const operation: CustomApiSyncOperation = {
      operationId: buildOperationId(sequence, action, uniqueName),
      sequence,
      action,
      objectType,
      uniqueName,
      reason,
      requiresDestructiveChange,
    };

    if (changedFields && changedFields.length > 0) {
      operation.changedFields = changedFields;
    }

    operations.push(operation);
    sequence += 10;
  };

  if (diff.customApi.kind === "create") {
    pushOperation("createCustomApi", "customApi", diff.uniqueName, "new", false);

    for (const request of diff.requestParameters) {
      pushOperation("createRequestParameter", "requestParameter", request.uniqueName, "new", false);
    }

    for (const response of diff.responseProperties) {
      pushOperation("createResponseProperty", "responseProperty", response.uniqueName, "new", false);
    }
  } else if (diff.customApi.kind === "recreate") {
    for (const response of diff.responseProperties) {
      if (response.remote) {
        pushOperation("deleteResponseProperty", "responseProperty", response.uniqueName, "parentRecreate", true);
      }
    }

    for (const request of diff.requestParameters) {
      if (request.remote) {
        pushOperation("deleteRequestParameter", "requestParameter", request.uniqueName, "parentRecreate", true);
      }
    }

    pushOperation("deleteCustomApi", "customApi", diff.uniqueName, "recreate", true);
    pushOperation("createCustomApi", "customApi", diff.uniqueName, "recreate", true);

    for (const request of diff.requestParameters) {
      if (request.local) {
        pushOperation(
          "createRequestParameter",
          "requestParameter",
          request.uniqueName,
          request.kind === "create" ? "new" : "parentRecreate",
          true
        );
      }
    }

    for (const response of diff.responseProperties) {
      if (response.local) {
        pushOperation(
          "createResponseProperty",
          "responseProperty",
          response.uniqueName,
          response.kind === "create" ? "new" : "parentRecreate",
          true
        );
      }
    }
  } else {
    if (diff.customApi.kind === "update") {
      pushOperation(
        "updateCustomApi",
        "customApi",
        diff.uniqueName,
        "changed",
        false,
        diff.customApi.fieldChanges.map((change) => change.field)
      );
    }

    for (const item of diff.requestParameters) {
      if (item.kind === "delete" || item.kind === "recreate") {
        pushOperation(
          "deleteRequestParameter",
          "requestParameter",
          item.uniqueName,
          item.kind === "recreate" ? "recreate" : "deleted",
          item.kind === "recreate"
        );
      }
    }

    for (const item of diff.responseProperties) {
      if (item.kind === "delete" || item.kind === "recreate") {
        pushOperation(
          "deleteResponseProperty",
          "responseProperty",
          item.uniqueName,
          item.kind === "recreate" ? "recreate" : "deleted",
          item.kind === "recreate"
        );
      }
    }

    for (const item of diff.requestParameters) {
      if (item.kind === "update") {
        pushOperation(
          "updateRequestParameter",
          "requestParameter",
          item.uniqueName,
          "changed",
          false,
          item.fieldChanges.map((change) => change.field)
        );
      }

      if (item.kind === "create" || item.kind === "recreate") {
        pushOperation(
          "createRequestParameter",
          "requestParameter",
          item.uniqueName,
          item.kind === "create" ? "new" : "recreate",
          item.kind === "recreate"
        );
      }
    }

    for (const item of diff.responseProperties) {
      if (item.kind === "update") {
        pushOperation(
          "updateResponseProperty",
          "responseProperty",
          item.uniqueName,
          "changed",
          false,
          item.fieldChanges.map((change) => change.field)
        );
      }

      if (item.kind === "create" || item.kind === "recreate") {
        pushOperation(
          "createResponseProperty",
          "responseProperty",
          item.uniqueName,
          item.kind === "create" ? "new" : "recreate",
          item.kind === "recreate"
        );
      }
    }
  }

  return {
    schemaVersion: "1.0.0",
    planId: `plan-${randomUUID()}`,
    uniqueName: diff.uniqueName,
    generatedAtUtc: new Date().toISOString(),
    requiresDestructiveChanges:
      diff.summary.requiresCustomApiRecreate ||
      diff.requestParameters.some((item) => item.kind === "delete" || item.kind === "recreate") ||
      diff.responseProperties.some((item) => item.kind === "delete" || item.kind === "recreate"),
    operations,
  };
}

function findLocalCustomApi(catalog: CustomApiCatalogModel, uniqueName: string): CustomApiDefinitionModel {
  const api = catalog.customApis.find((item) => item.uniqueName === uniqueName) ?? catalog.customApis[0];
  if (!api) {
    throw new Error(`Local JSON file for '${uniqueName}' contains no custom API.`);
  }
  return api;
}

function findLocalRequestParameter(
  catalog: CustomApiCatalogModel,
  apiUniqueName: string,
  uniqueName: string
): CustomApiParameterModel {
  const api = findLocalCustomApi(catalog, apiUniqueName);
  const item = (api.requestParameters ?? []).find((p) => p.uniqueName === uniqueName);
  if (!item) {
    throw new Error(`Local request parameter '${uniqueName}' not found.`);
  }
  return item;
}

function findLocalResponseProperty(
  catalog: CustomApiCatalogModel,
  apiUniqueName: string,
  uniqueName: string
): CustomApiResponsePropertyModel {
  const api = findLocalCustomApi(catalog, apiUniqueName);
  const item = (api.responseProperties ?? []).find((p) => p.uniqueName === uniqueName);
  if (!item) {
    throw new Error(`Local response property '${uniqueName}' not found.`);
  }
  return item;
}

export async function diffCustomApi(
  uniqueNameArg?: string,
  context?: RuntimeContext
): Promise<CustomApiSemanticDiffResult> {
  const localCatalog = await loadLocalCustomApiCatalog(uniqueNameArg, context);
  const uniqueName = ensureUniqueName(uniqueNameArg, await getActiveCustomApiUniqueName(context));

  const env = await getCurrentEnvironment(context);
  const client = new DataverseClient(env.environmentUrl, context);
  const repository = new CustomApiRepository(client);

  const remoteApi = await repository.getCustomApiByUniqueName(uniqueName);

  const localApi = localCatalog.customApis[0];

  if (!localApi) {
    throw new Error(`Local JSON file for '${uniqueName}' contains no custom API.`);
  }

  let customApiDiff: CustomApiSemanticDiffItem<CustomApiDefinitionModel>;
  let requestParameterDiffs: Array<CustomApiSemanticDiffItem<CustomApiParameterModel>>;
  let responsePropertyDiffs: Array<CustomApiSemanticDiffItem<CustomApiResponsePropertyModel>>;

  if (!remoteApi) {
    customApiDiff = buildSemanticItem("customApi", uniqueName, "create", [], localApi, null);
    requestParameterDiffs = (localApi.requestParameters ?? []).map((p) =>
      buildSemanticItem("requestParameter", p.uniqueName, "create", [], p, null)
    );
    responsePropertyDiffs = (localApi.responseProperties ?? []).map((p) =>
      buildSemanticItem("responseProperty", p.uniqueName, "create", [], p, null)
    );
  } else {
    customApiDiff = diffSingleObject(
      "customApi",
      localApi,
      remoteApi,
      CUSTOM_API_COMPARE_FIELDS as string[],
      CUSTOM_API_RECREATE_FIELDS as string[]
    );

    requestParameterDiffs = diffNamedCollection(
      "requestParameter",
      localApi.requestParameters ?? [],
      remoteApi.requestParameters ?? [],
      REQUEST_PARAMETER_COMPARE_FIELDS as string[],
      REQUEST_PARAMETER_RECREATE_FIELDS as string[]
    );

    responsePropertyDiffs = diffNamedCollection(
      "responseProperty",
      localApi.responseProperties ?? [],
      remoteApi.responseProperties ?? [],
      RESPONSE_PROPERTY_COMPARE_FIELDS as string[],
      RESPONSE_PROPERTY_RECREATE_FIELDS as string[]
    );
  }

  const requestCounter = buildEmptyCounter();
  for (const item of requestParameterDiffs) {
    incrementCounter(requestCounter, item.kind);
  }

  const responseCounter = buildEmptyCounter();
  for (const item of responsePropertyDiffs) {
    incrementCounter(responseCounter, item.kind);
  }

  const requiresCustomApiRecreate = customApiDiff.requiresRecreate;
  const requiresAnyRecreate =
    requiresCustomApiRecreate ||
    requestParameterDiffs.some((item) => item.requiresRecreate) ||
    responsePropertyDiffs.some((item) => item.requiresRecreate);

  return {
    schemaVersion: "1.0.0",
    uniqueName,
    isDifferent:
      customApiDiff.kind !== "none" ||
      requestParameterDiffs.some((item) => item.kind !== "none") ||
      responsePropertyDiffs.some((item) => item.kind !== "none"),
    summary: {
      customApiChangeKind: customApiDiff.kind,
      requiresCustomApiRecreate,
      requiresAnyRecreate,
      requestParameterChanges: requestCounter,
      responsePropertyChanges: responseCounter,
    },
    customApi: customApiDiff,
    requestParameters: requestParameterDiffs,
    responseProperties: responsePropertyDiffs,
  };
}

export async function checkCustomApiMetadataConsistency(
  uniqueNameArg?: string,
  context?: RuntimeContext
): Promise<CheckCustomApiMetadataResult> {
  try {
    const diff = await diffCustomApi(uniqueNameArg, context);
    const mismatches: MetadataMismatchItem[] = [];

    for (const change of diff.customApi.fieldChanges) {
      mismatches.push({
        objectType: "customApi",
        uniqueName: diff.uniqueName,
        field: change.field,
        localValue: change.localValue,
        remoteValue: change.remoteValue,
        requiresRecreate: change.isImmutable,
      });
    }

    for (const item of diff.requestParameters) {
      for (const change of item.fieldChanges) {
        mismatches.push({
          objectType: "requestParameter",
          uniqueName: item.uniqueName,
          field: change.field,
          localValue: change.localValue,
          remoteValue: change.remoteValue,
          requiresRecreate: change.isImmutable,
        });
      }
    }

    for (const item of diff.responseProperties) {
      for (const change of item.fieldChanges) {
        mismatches.push({
          objectType: "responseProperty",
          uniqueName: item.uniqueName,
          field: change.field,
          localValue: change.localValue,
          remoteValue: change.remoteValue,
          requiresRecreate: change.isImmutable,
        });
      }
    }

    return {
      uniqueName: diff.uniqueName,
      status: mismatches.length === 0 ? "ok" : "warning",
      message:
        mismatches.length === 0
          ? "Keine Metadaten-Abweichungen gefunden."
          : `${mismatches.length} Metadaten-Abweichungen gefunden.`,
      mismatches,
    };
  } catch (error) {
    return {
      uniqueName: uniqueNameArg ?? "unknown",
      status: "error",
      message: error instanceof Error ? error.message : String(error),
      mismatches: [],
    };
  }
}

export async function validateLocalCatalog(
  uniqueNameArg?: string,
  context?: RuntimeContext
): Promise<ValidateCustomApiResult> {
  const startedAtUtc = new Date().toISOString();
  const startedAt = Date.now();

  const uniqueName = ensureUniqueName(uniqueNameArg, await getActiveCustomApiUniqueName(context));
  const outputRoot = await getCustomApiOutputRootPath(context);
  const filePath = getCustomApiArtifactFilePath(uniqueName, outputRoot);

  const catalog = await loadLocalCustomApiCatalog(uniqueNameArg, context);
  const { diagnostics, hasBlockingErrors } = validateCustomApiCatalog(catalog);

  const errors = diagnostics.filter((d) => d.severity === "error");
  const warnings = diagnostics.filter((d) => d.severity === "warning");

  let status: CcdvCommandResult["status"];
  if (hasBlockingErrors) {
    status = "validationFailed";
  } else if (errors.length > 0 || warnings.length > 0) {
    status = "succeeded";
  } else {
    status = "succeeded";
  }

  const finishedAtUtc = new Date().toISOString();
  const commandResult: CcdvCommandResult = {
    schemaVersion: "1.0.0",
    status,
    command: "api validate",
    startedAtUtc,
    finishedAtUtc,
    durationMs: Date.now() - startedAt,
    diagnostics,
  };

  return { uniqueName, filePath, commandResult };
}

export async function buildCustomApiSyncPlan(
  uniqueNameArg?: string,
  context?: RuntimeContext
): Promise<BuildSyncPlanResult> {
  await ensureCacheFolders(context);

  const localCatalog = await loadLocalCustomApiCatalog(uniqueNameArg, context);
  const { diagnostics, hasBlockingErrors } = validateCustomApiCatalog(localCatalog);

  if (hasBlockingErrors) {
    const blocking = diagnostics.filter((d) => d.severity === "error" && d.blocking);
    const first = blocking[0];
    const firstSummary = first ? ` First error: [${first.code}] ${first.message}` : "";
    throw new Error(
      `Sync plan blocked by ${blocking.length} validation error(s). Run 'api validate' for the full report.${firstSummary}`
    );
  }

  const diff = await diffCustomApi(uniqueNameArg, context);
  const plan = buildPlanFromDiff(diff);
  const executionState = createExecutionState(plan);

  const outputRoot = await getCustomApiOutputRootPath(context);
  const filePath = getSyncPlanFilePath(plan.uniqueName, outputRoot);
  const stateFilePath = getSyncStateFilePath(plan.uniqueName, outputRoot);

  await writeJsonFile(filePath, plan);
  await writeJsonFile(stateFilePath, executionState);

  return {
    uniqueName: plan.uniqueName,
    filePath,
    stateFilePath,
    plan,
    executionState,
  };
}

async function executeOperationInternal(
  operation: CustomApiSyncOperation,
  uniqueName: string,
  simulate: boolean,
  context?: RuntimeContext
): Promise<CustomApiSyncOperationResult> {
  const startedAtUtc = new Date().toISOString();
  const startedAt = Date.now();

  if (simulate) {
    const finishedAtUtc = new Date().toISOString();
    return {
      operationId: operation.operationId,
      action: operation.action,
      objectType: operation.objectType,
      uniqueName: operation.uniqueName,
      status: "succeeded",
      startedAtUtc,
      finishedAtUtc,
      durationMs: Date.now() - startedAt,
      message: `Simulated ${operation.action} for ${operation.uniqueName}.`,
      simulated: true,
    };
  }

  const env = await getCurrentEnvironment(context);
  const client = new DataverseClient(env.environmentUrl, context);
  const repository = new CustomApiRepository(client);
  const localCatalog = await loadLocalCustomApiCatalog(uniqueName, context);
  const localApi = findLocalCustomApi(localCatalog, uniqueName);

  let pendingWarning: string | undefined;

  switch (operation.action) {
    case "createCustomApi": {
      const r = await repository.createCustomApi(localApi);
      if (r.warning) pendingWarning = r.warning;
      break;
    }
    case "updateCustomApi":
      await repository.updateCustomApi(localApi, operation.changedFields);
      break;
    case "deleteCustomApi":
      await repository.deleteCustomApi(uniqueName);
      break;
    case "createRequestParameter":
      await repository.createRequestParameter(
        uniqueName,
        findLocalRequestParameter(localCatalog, uniqueName, operation.uniqueName)
      );
      break;
    case "updateRequestParameter":
      await repository.updateRequestParameter(
        uniqueName,
        findLocalRequestParameter(localCatalog, uniqueName, operation.uniqueName),
        operation.changedFields
      );
      break;
    case "deleteRequestParameter":
      await repository.deleteRequestParameter(uniqueName, operation.uniqueName);
      break;
    case "createResponseProperty":
      await repository.createResponseProperty(
        uniqueName,
        findLocalResponseProperty(localCatalog, uniqueName, operation.uniqueName)
      );
      break;
    case "updateResponseProperty":
      await repository.updateResponseProperty(
        uniqueName,
        findLocalResponseProperty(localCatalog, uniqueName, operation.uniqueName),
        operation.changedFields
      );
      break;
    case "deleteResponseProperty":
      await repository.deleteResponseProperty(uniqueName, operation.uniqueName);
      break;
    default: {
      const exhaustive: never = operation.action;
      throw new Error(`Unsupported action '${String(exhaustive)}'.`);
    }
  }

  const finishedAtUtc = new Date().toISOString();
  const result: CustomApiSyncOperationResult = {
    operationId: operation.operationId,
    action: operation.action,
    objectType: operation.objectType,
    uniqueName: operation.uniqueName,
    status: "succeeded",
    startedAtUtc,
    finishedAtUtc,
    durationMs: Date.now() - startedAt,
    message: `${operation.action} for ${operation.uniqueName} completed successfully.`,
    simulated: false,
  };
  if (pendingWarning) result.warning = pendingWarning;
  return result;
}

export async function executeCustomApiSyncOperation(
  operationId: string,
  uniqueNameArg?: string,
  simulate = false,
  context?: RuntimeContext
): Promise<ExecuteSyncOperationResult> {
  await ensureCacheFolders(context);

  const uniqueName = ensureUniqueName(uniqueNameArg, await getActiveCustomApiUniqueName(context));
  const { planFilePath, stateFilePath, plan, executionState } = await loadPlanAndState(uniqueName, context);

  const operation = plan.operations.find((item) => item.operationId === operationId);
  if (!operation) {
    throw new Error(`Operation '${operationId}' not found in sync plan for '${uniqueName}'.`);
  }

  const operationState = executionState.operations.find((item) => item.operationId === operationId);
  if (!operationState) {
    throw new Error(`Operation '${operationId}' not found in sync state for '${uniqueName}'.`);
  }

  const startedAtUtc = new Date().toISOString();
  operationState.status = "running";
  operationState.startedAtUtc = startedAtUtc;

  if (!executionState.startedAtUtc) {
    executionState.startedAtUtc = startedAtUtc;
  }

  executionState.status = "running";
  await writeJsonFile(stateFilePath, executionState);

  try {
    const result = await executeOperationInternal(operation, uniqueName, simulate, context);

    operationState.status = result.status;
    operationState.finishedAtUtc = result.finishedAtUtc;
    operationState.durationMs = result.durationMs;
    operationState.message = result.message;
    operationState.simulated = result.simulated;
    delete operationState.error;
    if (result.warning) operationState.warning = result.warning;

    markOverallStatus(executionState);
    await writeJsonFile(stateFilePath, executionState);

    return {
      uniqueName,
      filePath: planFilePath,
      stateFilePath,
      result,
      executionState,
    };
  } catch (error) {
    const finishedAtUtc = new Date().toISOString();
    const durationMs = new Date(finishedAtUtc).getTime() - new Date(startedAtUtc).getTime();
    const errorObject = buildErrorObject(error);

    const result: CustomApiSyncOperationResult = {
      operationId: operation.operationId,
      action: operation.action,
      objectType: operation.objectType,
      uniqueName: operation.uniqueName,
      status: "failed",
      startedAtUtc,
      finishedAtUtc,
      durationMs,
      message: `Execution failed for ${operation.action}.`,
      simulated: simulate,
      error: errorObject,
    };

    operationState.status = "failed";
    operationState.finishedAtUtc = finishedAtUtc;
    operationState.durationMs = durationMs;
    operationState.message = result.message;
    operationState.simulated = simulate;
    operationState.error = errorObject;
    executionState.status = "failed";
    executionState.finishedAtUtc = finishedAtUtc;

    await writeJsonFile(stateFilePath, executionState);

    return {
      uniqueName,
      filePath: planFilePath,
      stateFilePath,
      result,
      executionState,
    };
  }
}

// ── Publisher list ─────────────────────────────────────────────────────────────

interface PublisherRow {
  publisherid: string;
  uniquename: string;
  friendlyname: string;
  customizationprefix: string;
}

export async function listPublishers(context?: RuntimeContext): Promise<ListPublishersResult> {
  const env = await getCurrentEnvironment(context);
  const client = new DataverseClient(env.environmentUrl, context);
  const http = await client.createHttpClient();

  const response = await http.get<{ value: PublisherRow[] }>(
    "/publishers?$select=publisherid,uniquename,friendlyname,customizationprefix&$orderby=friendlyname"
  );

  return (response.data.value ?? [])
    .filter((row) => row.customizationprefix && row.customizationprefix !== "mscrm")
    .map((row): PublisherInfo => ({
      publisherId: row.publisherid,
      uniqueName: row.uniquename,
      friendlyName: row.friendlyname,
      customizationPrefix: row.customizationprefix,
    }));
}

// ── Privilege validation ───────────────────────────────────────────────────────

interface WhoAmIResponse {
  UserId: string;
}

interface UserPrivilege {
  PrivilegeId: string;
}

interface RetrieveUserPrivilegesResponse {
  RolePrivileges: UserPrivilege[];
}

interface PrivilegeRow {
  privilegeid: string;
  name: string;
}

const PRIVILEGE_CHECKS: Array<{
  feature: string;
  privilegeName: string;
  privilegeId?: string;
  hint?: string;
}> = [
  { feature: "Read Custom API",    privilegeName: "prvReadCustomAPI" },
  { feature: "Create Custom API",  privilegeName: "prvCreateCustomAPI" },
  { feature: "Update Custom API",  privilegeName: "prvWriteCustomAPI" },
  { feature: "Delete Custom API",  privilegeName: "prvDeleteCustomAPI" },
  {
    feature: "PluginType Binding",
    privilegeName: "prvAppendToPluginType",
    privilegeId: "574c053e-6488-4bfb-832a-cbc47aff8b32",
    hint:
      "Custom APIs will be created without a plugin type link. " +
      "Grant 'prvAppendToPluginType' (AppendTo, plugintype, organisation scope) to the app user's security role.",
  },
  {
    feature: "Create Plugin Steps",
    privilegeName: "prvCreateSdkMessageProcessingStep",
    hint:
      "Plugin step registrations cannot be created automatically. " +
      "Grant 'prvCreateSdkMessageProcessingStep' (Create, sdkmessageprocessingstep, organisation scope) to the app user's security role.",
  },
];

export async function validatePrivileges(
  context?: RuntimeContext
): Promise<ValidatePrivilegesResult> {
  const env = await getCurrentEnvironment(context);
  const client = new DataverseClient(env.environmentUrl, context);
  const http = await client.createHttpClient();

  const whoAmI = (await http.get<WhoAmIResponse>("/WhoAmI()")).data;
  const userId = whoAmI.UserId;

  const privilegesResponse = await http.get<RetrieveUserPrivilegesResponse>(
    `/systemusers(${userId})/Microsoft.Dynamics.CRM.RetrieveUserPrivileges()`
  );
  const userPrivilegeIds = new Set(
    (privilegesResponse.data.RolePrivileges ?? []).map((p) => p.PrivilegeId.toLowerCase())
  );

  const resolvedIds = new Map<string, string>();
  for (const p of PRIVILEGE_CHECKS.filter((p) => !p.privilegeId)) {
    try {
      const res = await http.get<{ value: PrivilegeRow[] }>(
        `/privileges?$select=privilegeid,name&$filter=name eq '${p.privilegeName}'`
      );
      const row = res.data.value[0];
      if (row) resolvedIds.set(p.privilegeName, row.privilegeid);
    } catch {
      // leave unresolved — will show as unavailable
    }
  }

  let userName = userId;
  try {
    const userInfo = await http.get<{ fullname?: string }>(
      `/systemusers(${userId})?$select=fullname`
    );
    userName = userInfo.data.fullname ?? userId;
  } catch {
    // fallback to userId
  }

  const privileges: PrivilegeCheckItem[] = PRIVILEGE_CHECKS.map((p) => {
    const id = p.privilegeId ?? resolvedIds.get(p.privilegeName);
    const available = id !== undefined && userPrivilegeIds.has(id.toLowerCase());
    const item: PrivilegeCheckItem = { feature: p.feature, privilegeName: p.privilegeName, available };
    if (id !== undefined) item.privilegeId = id;
    if (p.hint) item.hint = p.hint;
    return item;
  });

  return {
    environmentUrl: env.environmentUrl,
    userId,
    userName,
    privileges,
    allAvailable: privileges.every((p) => p.available),
  };
}

export async function executeCustomApiSyncPlan(
  uniqueNameArg?: string,
  simulate = false,
  context?: RuntimeContext
): Promise<ExecuteSyncPlanResult> {
  await ensureCacheFolders(context);

  const uniqueName = ensureUniqueName(uniqueNameArg, await getActiveCustomApiUniqueName(context));
  const { planFilePath, stateFilePath, plan } = await loadPlanAndState(uniqueName, context);

  for (const operation of [...plan.operations].sort((a, b) => a.sequence - b.sequence)) {
    const opResult = await executeCustomApiSyncOperation(
      operation.operationId,
      uniqueName,
      simulate,
      context
    );

    if (opResult.result.status === "failed") {
      return {
        uniqueName,
        filePath: planFilePath,
        stateFilePath,
        executionState: opResult.executionState,
      };
    }
  }

  const finalState = await readJsonFile<CustomApiSyncExecutionState>(stateFilePath);
  markOverallStatus(finalState);
  await writeJsonFile(stateFilePath, finalState);

  return {
    uniqueName,
    filePath: planFilePath,
    stateFilePath,
    executionState: finalState,
  };
}
