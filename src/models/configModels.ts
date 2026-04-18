export interface EnvironmentCache {
    environmentUrl: string;
    tenantId?: string;
    clientId?: string;
    authMode: "deviceCode" | "interactiveBrowser" | "clientSecret";
    savedAtUtc: string;
}

export interface ActiveApiCache {
    uniqueName: string;
    savedAtUtc: string;
}