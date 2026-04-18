import path from "node:path";
import { DataverseClient } from "../api/dataverseClient.js";
import { CustomApiRepository } from "../api/customApiRepository.js";
import type { EnvironmentCache, ActiveApiCache } from "../models/configModels.js";
import type {
  CustomApiCatalogModel,
  CustomApiDefinitionModel,
  CustomApiSummaryModel,
} from "../models/customApiModels.js";
import { loadAuthConfig } from "../auth/authConfig.js";
import { ensureCacheFolders, readJsonFile, writeJsonFile } from "../utils/fileSystem.js";
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

export interface ExportResult {
  uniqueName: string;
  filePath: string;
  catalog: CustomApiCatalogModel;
}

export interface DiffFieldChange {
  field: string;
  localValue?: unknown;
  remoteValue?: unknown;
}

export interface DiffItemChange<T> {
  uniqueName: string;
  local?: T;
  remote?: T;
  kind: "added" | "removed" | "changed";
  fieldChanges?: DiffFieldChange[];
}

export interface CustomApiDiffResult {
  uniqueName: string;
  isDifferent: boolean;
  topLevelChanges: DiffFieldChange[];
  requestParameterChanges: DiffItemChange<unknown>[];
  responsePropertyChanges: DiffItemChange<unknown>[];
}

export async function connectToEnvironment(
  environmentUrl: string
): Promise<ConnectResult> {
  await ensureCacheFolders();

  const client = new DataverseClient(environmentUrl);
  await client.whoAmI();

  const auth = await loadAuthConfig();

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

  const environmentCacheFilePath = await getEnvironmentCacheFilePath();
  await writeJsonFile(environmentCacheFilePath, cache);

  return {
    environmentUrl,
    authMode: cache.authMode,
    environmentCacheFilePath,
  };
}

export async function getCurrentEnvironment(): Promise<EnvironmentCache> {
  const environmentCacheFilePath = await getEnvironmentCacheFilePath();
  return readJsonFile<EnvironmentCache>(environmentCacheFilePath);
}

export async function listCustomApis(): Promise<CustomApiSummaryModel[]> {
  const env = await getCurrentEnvironment();
  const client = new DataverseClient(env.environmentUrl);
  const repository = new CustomApiRepository(client);
  return repository.listCustomApis();
}

export async function setActiveCustomApi(uniqueName: string): Promise<SelectResult> {
  await ensureCacheFolders();

  const activeApi: ActiveApiCache = {
    uniqueName,
    savedAtUtc: new Date().toISOString(),
  };

  const activeApiCacheFilePath = await getActiveApiCacheFilePath();
  await writeJsonFile(activeApiCacheFilePath, activeApi);

  return {
    uniqueName,
    activeApiCacheFilePath,
  };
}

export async function getActiveCustomApiUniqueName(): Promise<string> {
  const activeApiCacheFilePath = await getActiveApiCacheFilePath();
  const activeApi = await readJsonFile<ActiveApiCache>(activeApiCacheFilePath);
  return activeApi.uniqueName;
}

export async function exportCustomApi(uniqueNameArg?: string): Promise<ExportResult> {
  await ensureCacheFolders();

  const env = await getCurrentEnvironment();
  const uniqueName = uniqueNameArg ?? (await getActiveCustomApiUniqueName());

  if (!uniqueName) {
    throw new Error("Keine Custom API angegeben und keine aktive API gesetzt.");
  }

  const client = new DataverseClient(env.environmentUrl);
  const repository = new CustomApiRepository(client);
  const catalog = await repository.exportCatalog(uniqueName, {
    environmentUrl: env.environmentUrl,
  });

  const outputRoot = await getCustomApiOutputRootPath();
  const filePath = path.join(outputRoot, `${uniqueName}.json`);
  await writeJsonFile(filePath, catalog);

  return {
    uniqueName,
    filePath,
    catalog,
  };
}

export async function loadLocalCustomApiCatalog(
  uniqueNameArg?: string
): Promise<CustomApiCatalogModel> {
  const uniqueName = uniqueNameArg ?? (await getActiveCustomApiUniqueName());

  if (!uniqueName) {
    throw new Error("Keine Custom API angegeben und keine aktive API gesetzt.");
  }

  const outputRoot = await getCustomApiOutputRootPath();
  const filePath = path.join(outputRoot, `${uniqueName}.json`);
  return readJsonFile<CustomApiCatalogModel>(filePath);
}

function compareSimpleFields(
  localApi: CustomApiDefinitionModel,
  remoteApi: CustomApiDefinitionModel,
  fields: Array<keyof CustomApiDefinitionModel>
): DiffFieldChange[] {
  const changes: DiffFieldChange[] = [];

  for (const field of fields) {
    const localValue = localApi[field];
    const remoteValue = remoteApi[field];

    if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
      changes.push({
        field: String(field),
        localValue,
        remoteValue,
      });
    }
  }

  return changes;
}

function buildItemMap<T extends { uniqueName: string }>(items: T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    map.set(item.uniqueName, item);
  }
  return map;
}

function diffNamedItems<T extends { uniqueName: string }>(
  localItems: T[],
  remoteItems: T[],
  fieldNames: string[]
): DiffItemChange<unknown>[] {
  const changes: DiffItemChange<unknown>[] = [];
  const localMap = buildItemMap(localItems);
  const remoteMap = buildItemMap(remoteItems);

  const uniqueNames = new Set<string>([
    ...localMap.keys(),
    ...remoteMap.keys(),
  ]);

  for (const uniqueName of uniqueNames) {
    const localItem = localMap.get(uniqueName);
    const remoteItem = remoteMap.get(uniqueName);

    if (localItem && !remoteItem) {
      changes.push({
        uniqueName,
        local: localItem,
        kind: "removed",
      });
      continue;
    }

    if (!localItem && remoteItem) {
      changes.push({
        uniqueName,
        remote: remoteItem,
        kind: "added",
      });
      continue;
    }

    if (!localItem || !remoteItem) {
      continue;
    }

    const fieldChanges: DiffFieldChange[] = [];

    for (const fieldName of fieldNames) {
      const localValue = (localItem as Record<string, unknown>)[fieldName];
      const remoteValue = (remoteItem as Record<string, unknown>)[fieldName];

      if (JSON.stringify(localValue) !== JSON.stringify(remoteValue)) {
        fieldChanges.push({
          field: fieldName,
          localValue,
          remoteValue,
        });
      }
    }

    if (fieldChanges.length > 0) {
      changes.push({
        uniqueName,
        local: localItem,
        remote: remoteItem,
        kind: "changed",
        fieldChanges,
      });
    }
  }

  return changes;
}

export async function diffCustomApi(
  uniqueNameArg?: string
): Promise<CustomApiDiffResult> {
  const localCatalog = await loadLocalCustomApiCatalog(uniqueNameArg);
  const uniqueName = uniqueNameArg ?? (await getActiveCustomApiUniqueName());

  if (!uniqueName) {
    throw new Error("Keine Custom API angegeben und keine aktive API gesetzt.");
  }

  const env = await getCurrentEnvironment();
  const client = new DataverseClient(env.environmentUrl);
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

  const topLevelChanges = compareSimpleFields(localApi, remoteApi, [
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
  ]);

  const requestParameterChanges = diffNamedItems(
    localApi.requestParameters,
    remoteApi.requestParameters,
    ["name", "displayName", "description", "type", "isOptional", "logicalEntityName"]
  );

  const responsePropertyChanges = diffNamedItems(
    localApi.responseProperties,
    remoteApi.responseProperties,
    ["name", "displayName", "description", "type", "logicalEntityName"]
  );

  return {
    uniqueName,
    isDifferent:
      topLevelChanges.length > 0 ||
      requestParameterChanges.length > 0 ||
      responsePropertyChanges.length > 0,
    topLevelChanges,
    requestParameterChanges,
    responsePropertyChanges,
  };
}
