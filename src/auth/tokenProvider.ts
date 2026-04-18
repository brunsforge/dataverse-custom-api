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
            throw new Error(
                "auth.json ist für authMode='clientSecret' unvollständig. Erwartet werden tenantId, clientId und clientSecret."
            );
        }

        return new ClientSecretCredential(
            auth.tenantId,
            auth.clientId,
            auth.clientSecret
        );
    }

    if (authMode === "interactiveBrowser") {
        if (!auth.tenantId || !auth.clientId) {
            throw new Error(
                "auth.json ist für authMode='interactiveBrowser' unvollständig. Erwartet werden tenantId und clientId."
            );
        }

        return new InteractiveBrowserCredential({
            tenantId: auth.tenantId,
            clientId: auth.clientId,
        });
    }

    const options: ConstructorParameters<typeof DeviceCodeCredential>[0] = {
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
    try {
        const credential = await createCredential();
        const normalizedEnvironmentUrl = environmentUrl.replace(/\/$/, "");
        const scope = `${normalizedEnvironmentUrl}/.default`;

        const token = await credential.getToken(scope);

        if (!token?.token) {
            throw new Error("Kein Access Token für Dataverse erhalten.");
        }

        return token.token;
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        throw new Error(
            `Tokenanforderung für Dataverse fehlgeschlagen. Environment='${environmentUrl}', Details='${message}'`
        );
    }
}