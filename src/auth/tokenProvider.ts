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
    scope: string
): Promise<TokenCredential> {
    const auth = await loadAuthConfig();

    if (!auth.tenantId || !auth.clientId) {
        throw new Error(
            "auth.json ist für interactiveBrowser unvollständig. Erwartet werden tenantId und clientId."
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

async function createDeviceCodeCredential(scope: string): Promise<TokenCredential> {
    const auth = await loadAuthConfig();

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
                    "Device-Code-Anmeldung wurde gestartet. Bitte den Anmeldehinweisen folgen."
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

export async function createCredential(scope: string): Promise<TokenCredential> {
    const auth = await loadAuthConfig();
    const fingerprint = `${buildFingerprint(auth)}|${scope}`;

    if (cachedCredential && cachedAuthFingerprint === fingerprint) {
        return cachedCredential;
    }

    const authMode = auth.authMode ?? "deviceCode";
    let credential: TokenCredential;

    if (authMode === "clientSecret") {
        if (!auth.tenantId || !auth.clientId || !auth.clientSecret) {
            throw new Error(
                "auth.json ist für authMode='clientSecret' unvollständig. Erwartet werden tenantId, clientId und clientSecret."
            );
        }

        credential = new ClientSecretCredential(
            auth.tenantId,
            auth.clientId,
            auth.clientSecret
        );
    } else if (authMode === "interactiveBrowser") {
        credential = await createInteractiveBrowserCredential(scope);
    } else {
        credential = await createDeviceCodeCredential(scope);
    }

    cachedCredential = credential;
    cachedAuthFingerprint = fingerprint;
    cachedToken = null;
    cachedTokenScope = null;

    return credential;
}

export async function getDataverseAccessToken(
    environmentUrl: string
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

        const credential = await createCredential(scope);
        const token = await credential.getToken(scope);

        if (!token?.token) {
            throw new Error("Kein Access Token für Dataverse erhalten.");
        }

        cachedToken = token;
        cachedTokenScope = scope;

        return token.token;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        throw new Error(
            `Tokenanforderung für Dataverse fehlgeschlagen. Environment='${environmentUrl}', Details='${message}'`
        );
    }
}