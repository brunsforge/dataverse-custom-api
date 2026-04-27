import {
  ClientSecretCredential,
  DeviceCodeCredential,
  InteractiveBrowserCredential,
  useIdentityPlugin,
} from "@azure/identity";
import type {
  AccessToken,
  AuthenticationRecord,
  TokenCredential,
} from "@azure/identity";
import { cachePersistencePlugin } from "@azure/identity-cache-persistence";
import type { RuntimeContext } from "../models/runtime-context.js";
import { loadAuthConfig } from "./authConfig.js";
import {
  loadAuthenticationRecord,
  saveAuthenticationRecord,
} from "./authenticationRecordStore.js";

useIdentityPlugin(cachePersistencePlugin);

const DEVICECODE_CACHE_NAME = "ccdvcustomapi-devicecode";
const INTERACTIVE_CACHE_NAME = "ccdvcustomapi-interactive";

let cachedCredential: TokenCredential | null = null;
let cachedAuthFingerprint: string | null = null;
let cachedToken: AccessToken | null = null;
let cachedTokenScope: string | null = null;

function buildFingerprint(auth: {
  tenantId?: string;
  clientId?: string;
  authMode?: string;
}): string {
  return JSON.stringify({
    tenantId: auth.tenantId ?? null,
    clientId: auth.clientId ?? null,
    authMode: auth.authMode ?? "deviceCode",
  });
}

async function createInteractiveBrowserCredential(
  scope: string,
  context?: RuntimeContext
): Promise<TokenCredential> {
  const auth = await loadAuthConfig(context);

  if (!auth.tenantId || !auth.clientId) {
    throw new Error(
      "auth.json is incomplete for interactiveBrowser. Expected: tenantId and clientId."
    );
  }

  const authenticationRecord = await loadAuthenticationRecord(
    INTERACTIVE_CACHE_NAME
  );

  const options: ConstructorParameters<typeof InteractiveBrowserCredential>[0] = {
    tenantId: auth.tenantId,
    clientId: auth.clientId,
    tokenCachePersistenceOptions: {
      enabled: true,
      name: INTERACTIVE_CACHE_NAME,
    },
  };

  if (authenticationRecord) {
    options.authenticationRecord = authenticationRecord;
  }

  const credential = new InteractiveBrowserCredential(options);

  if (!authenticationRecord) {
    const newRecord = await credential.authenticate([scope]);

    if (newRecord) {
      await saveAuthenticationRecord(INTERACTIVE_CACHE_NAME, newRecord);
    }
  }

  return credential;
}

async function createDeviceCodeCredential(
  scope: string,
  context?: RuntimeContext
): Promise<TokenCredential> {
  const auth = await loadAuthConfig(context);

  const authenticationRecord = await loadAuthenticationRecord(
    DEVICECODE_CACHE_NAME
  );

  const options: ConstructorParameters<typeof DeviceCodeCredential>[0] = {
    tokenCachePersistenceOptions: {
      enabled: true,
      name: DEVICECODE_CACHE_NAME,
    },
    userPromptCallback: (info) => {
      if (info?.message) {
        console.log(info.message);
      } else {
        console.log(
          "Device code authentication started. Please follow the sign-in instructions."
        );
      }
    },
  };

  if (authenticationRecord) {
    options.authenticationRecord = authenticationRecord;
  }

  if (auth.tenantId) {
    options.tenantId = auth.tenantId;
  }

  if (auth.clientId) {
    options.clientId = auth.clientId;
  }

  const credential = new DeviceCodeCredential(options);

  if (!authenticationRecord) {
    const newRecord = await credential.authenticate([scope]);

    if (newRecord) {
      await saveAuthenticationRecord(DEVICECODE_CACHE_NAME, newRecord);
    }
  }

  return credential;
}

export async function createCredential(
  scope: string,
  context?: RuntimeContext
): Promise<TokenCredential> {
  const auth = await loadAuthConfig(context);
  const fingerprint = `${buildFingerprint(auth)}|${scope}`;

  if (cachedCredential && cachedAuthFingerprint === fingerprint) {
    return cachedCredential;
  }

  const authMode = auth.authMode ?? "deviceCode";
  let credential: TokenCredential;

  if (authMode === "clientSecret") {
    if (!auth.tenantId || !auth.clientId || !auth.clientSecret) {
      throw new Error(
        "auth.json is incomplete for authMode='clientSecret'. Expected: tenantId, clientId, and clientSecret."
      );
    }

    credential = new ClientSecretCredential(
      auth.tenantId,
      auth.clientId,
      auth.clientSecret
    );
  } else if (authMode === "interactiveBrowser") {
    credential = await createInteractiveBrowserCredential(scope, context);
  } else {
    credential = await createDeviceCodeCredential(scope, context);
  }

  cachedCredential = credential;
  cachedAuthFingerprint = fingerprint;
  cachedToken = null;
  cachedTokenScope = null;

  return credential;
}

export async function getDataverseAccessToken(
  environmentUrl: string,
  context?: RuntimeContext
): Promise<string> {
  try {
    const normalizedEnvironmentUrl = environmentUrl.replace(/\/$/, "");
    const scope = `${normalizedEnvironmentUrl}/.default`;

    const now = Date.now();
    if (
      cachedToken &&
      cachedTokenScope === scope &&
      cachedToken.expiresOnTimestamp - now > 60_000
    ) {
      return cachedToken.token;
    }

    const credential = await createCredential(scope, context);
    const token = await credential.getToken(scope);

    if (!token?.token) {
      throw new Error("No access token received for Dataverse.");
    }

    cachedToken = token;
    cachedTokenScope = scope;

    return token.token;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    throw new Error(
      `Token request for Dataverse failed. environment='${environmentUrl}', details='${message}'`
    );
  }
}
