import path from "node:path";
import { unlink } from "node:fs/promises";
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
  SemanticDiffFieldChange,
} from "../models/customApiModels.js";
import type { RuntimeContext } from "../models/runtime-context.js";
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

function getCustomApiArtifactFilePath(
  uniqueName: string,
  outputRoot: string
): string {
  return path.join(outputRoot, `${uniqueName}.json`);
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
    throw new Error("Keine Custom API angegeben und keine aktive API gesetzt.");
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
    throw new Error("Keine Custom API angegeben und keine aktive API gesetzt.");
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
    throw new Error("Keine Custom API angegeben und keine aktive API gesetzt.");
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
  "name",
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
  "name",
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

function incrementCounter(
  counter: CustomApiSemanticDiffCounter,
  kind: CustomApiChangeKind
): void {
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

export async function diffCustomApi(
  uniqueNameArg?: string,
  context?: RuntimeContext
): Promise<CustomApiSemanticDiffResult> {
  const localCatalog = await loadLocalCustomApiCatalog(uniqueNameArg, context);
  const uniqueName = uniqueNameArg ?? (await getActiveCustomApiUniqueName(context));

  if (!uniqueName) {
    throw new Error("Keine Custom API angegeben und keine aktive API gesetzt.");
  }

  const env = await getCurrentEnvironment(context);
  const client = new DataverseClient(env.environmentUrl, context);
  const repository = new CustomApiRepository(client);

  const remoteCatalog = await repository.exportCatalog(uniqueName, {
    environmentUrl: env.environmentUrl,
  });

  const localApi = localCatalog.customApis[0];
  const remoteApi = remoteCatalog.customApis[0];

  if (!localApi) {
    throw new Error(`Lokale JSON-Datei für '${uniqueName}' enthält keine Custom API.`);
  }

  if (!remoteApi) {
    throw new Error(`Remote-Definition für '${uniqueName}' konnte nicht geladen werden.`);
  }

  const customApiDiff = diffSingleObject(
    "customApi",
    localApi,
    remoteApi,
    CUSTOM_API_COMPARE_FIELDS as string[],
    CUSTOM_API_RECREATE_FIELDS as string[]
  );

  const requestParameterDiffs = diffNamedCollection(
    "requestParameter",
    localApi.requestParameters,
    remoteApi.requestParameters,
    REQUEST_PARAMETER_COMPARE_FIELDS as string[],
    REQUEST_PARAMETER_RECREATE_FIELDS as string[]
  );

  const responsePropertyDiffs = diffNamedCollection(
    "responseProperty",
    localApi.responseProperties,
    remoteApi.responseProperties,
    RESPONSE_PROPERTY_COMPARE_FIELDS as string[],
    RESPONSE_PROPERTY_RECREATE_FIELDS as string[]
  );

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
