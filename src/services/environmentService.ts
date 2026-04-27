import { loadAuthConfig } from "../auth/authConfig.js";
import { DataverseClient } from "../api/dataverseClient.js";
import type { EnvironmentCache } from "../models/configModels.js";
import type { RuntimeContext } from "../models/runtime-context.js";
import { fileExists, readJsonFile, writeJsonFile, ensureCacheFolders } from "../utils/fileSystem.js";
import {
  getEnvironmentCacheFilePath,
  getEnvironmentStoreFilePath,
} from "../utils/paths.js";

export interface EnvironmentProfile extends EnvironmentCache {
  id: string;
  displayName: string;
}

export interface EnvironmentStore {
  activeEnvironmentId?: string | undefined;
  environments: EnvironmentProfile[];
}

export interface ConnectEnvironmentResult {
  environmentId: string;
  displayName: string;
  environmentUrl: string;
  authMode: string;
  environmentStoreFilePath: string;
  environmentCacheFilePath: string;
}

export interface RemoveEnvironmentResult {
  removedEnvironmentId: string;
  removedDisplayName: string;
  environmentStoreFilePath: string;
  activeEnvironmentId?: string;
}

export interface SetActiveEnvironmentResult {
  environmentId: string;
  displayName: string;
  environmentStoreFilePath: string;
}

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function tryGetDisplayNameFromUrl(environmentUrl: string): string {
  try {
    const url = new URL(environmentUrl);
    const host = url.hostname;
    const firstLabel = host.split(".")[0];

    if (firstLabel) {
      return firstLabel;
    }

    return host;
  } catch {
    return environmentUrl;
  }
}

function buildPreferredSlug(displayName: string, environmentUrl: string): string {
  const displaySlug = slugify(displayName);
  if (displaySlug) {
    return displaySlug;
  }

  const fallback = tryGetDisplayNameFromUrl(environmentUrl);
  const fallbackSlug = slugify(fallback);

  if (fallbackSlug) {
    return fallbackSlug;
  }

  return "environment";
}

function ensureUniqueSlug(preferredSlug: string, existingIds: string[], currentId?: string): string {
  const normalizedExisting = new Set(
    existingIds.filter((id) => id !== currentId).map((id) => id.toLowerCase())
  );

  if (!normalizedExisting.has(preferredSlug.toLowerCase())) {
    return preferredSlug;
  }

  let counter = 2;
  while (true) {
    const candidate = `${preferredSlug}-${counter}`;
    if (!normalizedExisting.has(candidate.toLowerCase())) {
      return candidate;
    }

    counter += 1;
  }
}

async function readEnvironmentStoreInternal(
  context?: RuntimeContext
): Promise<{ store: EnvironmentStore; environmentStoreFilePath: string }> {
  await ensureCacheFolders(context);

  const environmentStoreFilePath = await getEnvironmentStoreFilePath(context);

  if (await fileExists(environmentStoreFilePath)) {
    const store = await readJsonFile<EnvironmentStore>(environmentStoreFilePath);

    return {
      store: {
        activeEnvironmentId: store.activeEnvironmentId ?? undefined,
        environments: Array.isArray(store.environments) ? store.environments : [],
      },
      environmentStoreFilePath,
    };
  }

  // Legacy migration from single environment cache.
  const legacyEnvironmentCacheFilePath = await getEnvironmentCacheFilePath(context);

  if (await fileExists(legacyEnvironmentCacheFilePath)) {
    const legacy = await readJsonFile<EnvironmentCache>(legacyEnvironmentCacheFilePath);
    const displayName = tryGetDisplayNameFromUrl(legacy.environmentUrl);
    const environmentId = buildPreferredSlug(displayName, legacy.environmentUrl);

    const migrated: EnvironmentProfile = {
      id: environmentId,
      displayName,
      environmentUrl: legacy.environmentUrl,
      authMode: legacy.authMode,
      savedAtUtc: legacy.savedAtUtc,
    };

    if (legacy.tenantId) {
      migrated.tenantId = legacy.tenantId;
    }

    if (legacy.clientId) {
      migrated.clientId = legacy.clientId;
    }

    const store: EnvironmentStore = {
      activeEnvironmentId: environmentId,
      environments: [migrated],
    };

    await writeJsonFile(environmentStoreFilePath, store);

    return {
      store,
      environmentStoreFilePath,
    };
  }

  return {
    store: {
      environments: [],
    },
    environmentStoreFilePath,
  };
}

async function writeEnvironmentStore(
  store: EnvironmentStore,
  context?: RuntimeContext
): Promise<string> {
  const environmentStoreFilePath = await getEnvironmentStoreFilePath(context);
  await writeJsonFile(environmentStoreFilePath, store);
  return environmentStoreFilePath;
}

export async function listEnvironments(
  context?: RuntimeContext
): Promise<EnvironmentProfile[]> {
  const result = await readEnvironmentStoreInternal(context);
  const activeEnvironmentId = result.store.activeEnvironmentId;

  return [...result.store.environments].sort((a, b) => {
    if (a.id === activeEnvironmentId && b.id !== activeEnvironmentId) {
      return -1;
    }

    if (b.id === activeEnvironmentId && a.id !== activeEnvironmentId) {
      return 1;
    }

    return a.displayName.localeCompare(b.displayName, "de");
  });
}

export async function getActiveEnvironment(
  context?: RuntimeContext
): Promise<EnvironmentProfile> {
  const result = await readEnvironmentStoreInternal(context);

  const activeEnvironmentId = result.store.activeEnvironmentId;
  if (!activeEnvironmentId) {
    throw new Error(
      "No active environment set. Use 'dvc connect' or 'dvc env use'."
    );
  }

  const match = result.store.environments.find(
    (environment) => environment.id === activeEnvironmentId
  );

  if (!match) {
    throw new Error(
      `Active environment '${activeEnvironmentId}' was not found in the environment store.`
    );
  }

  return match;
}

export async function connectEnvironment(
  environmentUrl: string,
  displayNameArg?: string,
  context?: RuntimeContext
): Promise<ConnectEnvironmentResult> {
  await ensureCacheFolders(context);

  const client = new DataverseClient(environmentUrl, context);
  await client.whoAmI();

  const auth = await loadAuthConfig(context);
  const readResult = await readEnvironmentStoreInternal(context);
  const store = readResult.store;

  const displayName = (displayNameArg ?? tryGetDisplayNameFromUrl(environmentUrl)).trim();
  const existingByUrl = store.environments.find(
    (environment) => environment.environmentUrl.toLowerCase() === environmentUrl.toLowerCase()
  );

  const preferredSlug = buildPreferredSlug(displayName, environmentUrl);
  const environmentId = ensureUniqueSlug(
    preferredSlug,
    store.environments.map((environment) => environment.id),
    existingByUrl?.id
  );

  const profile: EnvironmentProfile = {
    id: environmentId,
    displayName,
    environmentUrl,
    authMode: auth.authMode ?? "deviceCode",
    savedAtUtc: new Date().toISOString(),
  };

  if (auth.tenantId) {
    profile.tenantId = auth.tenantId;
  }

  if (auth.clientId) {
    profile.clientId = auth.clientId;
  }

  const environments = store.environments.filter(
    (environment) => environment.id !== existingByUrl?.id
  );
  environments.push(profile);

  const nextStore: EnvironmentStore = {
    activeEnvironmentId: profile.id,
    environments,
  };

  const environmentStoreFilePath = await writeEnvironmentStore(nextStore, context);

  return {
    environmentId: profile.id,
    displayName: profile.displayName,
    environmentUrl: profile.environmentUrl,
    authMode: profile.authMode,
    environmentStoreFilePath,
    environmentCacheFilePath: environmentStoreFilePath,
  };
}

export async function setActiveEnvironment(
  environmentId: string,
  context?: RuntimeContext
): Promise<SetActiveEnvironmentResult> {
  const result = await readEnvironmentStoreInternal(context);
  const match = result.store.environments.find((environment) => environment.id === environmentId);

  if (!match) {
    throw new Error(`Environment '${environmentId}' not found.`);
  }

  const nextStore: EnvironmentStore = {
    activeEnvironmentId: match.id,
    environments: result.store.environments,
  };

  const environmentStoreFilePath = await writeEnvironmentStore(nextStore, context);

  return {
    environmentId: match.id,
    displayName: match.displayName,
    environmentStoreFilePath,
  };
}

export async function removeEnvironment(
  environmentId: string,
  context?: RuntimeContext
): Promise<RemoveEnvironmentResult> {
  const result = await readEnvironmentStoreInternal(context);
  const match = result.store.environments.find((environment) => environment.id === environmentId);

  if (!match) {
    throw new Error(`Environment '${environmentId}' not found.`);
  }

  const remaining = result.store.environments.filter(
    (environment) => environment.id !== environmentId
  );

  let activeEnvironmentId = result.store.activeEnvironmentId;

  if (activeEnvironmentId === environmentId) {
    activeEnvironmentId = remaining[0]?.id;
  }

  const nextStore: EnvironmentStore = {
    environments: remaining,
  };

  if (activeEnvironmentId) {
    nextStore.activeEnvironmentId = activeEnvironmentId;
  }

  const environmentStoreFilePath = await writeEnvironmentStore(nextStore, context);

  const r2: RemoveEnvironmentResult = {
    removedEnvironmentId: match.id,
    removedDisplayName: match.displayName,
    environmentStoreFilePath,
  };

  if (activeEnvironmentId) {
    r2.activeEnvironmentId = activeEnvironmentId;
  }

  return r2;
}
