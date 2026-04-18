import {
    ClientSecretCredential,
    DeviceCodeCredential,
    InteractiveBrowserCredential,
} from "@azure/identity";
import type { TokenCredential } from "@azure/identity";
import { loadAuthConfig } from "./authConfig.js";

export async function createCredential(): Promise<TokenCredential> {
    const auth = await loadAuthConfig();
    const authMode = auth.authMode ?? "deviceCode";

    if (authMode === "clientSecret") {
        if (!auth.tenantId || !auth.clientId || !auth.clientSecret) {
            throw new Error("auth.json ist für clientSecret unvollständig.");
        }

        return new ClientSecretCredential(
            auth.tenantId,
            auth.clientId,
            auth.clientSecret
        );
    }

    if (authMode === "interactiveBrowser") {
        if (!auth.tenantId || !auth.clientId) {
            throw new Error("auth.json ist für interactiveBrowser unvollständig.");
        }

        return new InteractiveBrowserCredential({
            tenantId: auth.tenantId,
            clientId: auth.clientId,
        });
    }

    const options: ConstructorParameters<typeof DeviceCodeCredential>[0] = {
        userPromptCallback: (info) => {
            console.log(info.message);
        },
    };

    if (auth.tenantId) {
        options.tenantId = auth.tenantId;
    }

    if (auth.clientId) {
        options.clientId = auth.clientId;
    }

    return new DeviceCodeCredential(options);
}

export async function getDataverseAccessToken(
    environmentUrl: string
): Promise<string> {
    const credential = await createCredential();
    const normalizedEnvironmentUrl = environmentUrl.replace(/\/$/, "");
    const scope = `${normalizedEnvironmentUrl}/.default`;

    const token = await credential.getToken(scope);

    if (!token?.token) {
        throw new Error("Kein Access Token für Dataverse erhalten.");
    }

    return token.token;
}