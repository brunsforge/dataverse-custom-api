export interface CliErrorDetails {
    title: string;
    message: string;
    technical?: string;
}

function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

export function normalizeCliError(error: unknown, context?: string): CliErrorDetails {
    const rawMessage = getErrorMessage(error);
    const lower = rawMessage.toLowerCase();

    if (lower.includes("invalid_grant")) {
        return {
            title: "Authentication failed",
            message:
                "The login was rejected by Entra ID or not completed successfully. " +
                "Check Public Client Flow, API Permissions, Admin Consent, and whether the login was fully completed.",
            technical: `${context ? `[${context}] ` : ""}${rawMessage}`,
        };
    }

    if (lower.includes("invalid_resource")) {
        return {
            title: "Invalid target resource for token request",
            message:
                "The App Registration is not permitted to request a token for the requested Dataverse resource. " +
                "Check API Permissions and Consent of the App Registration.",
            technical: `${context ? `[${context}] ` : ""}${rawMessage}`,
        };
    }

    if (lower.includes("interaction_required")) {
        return {
            title: "Interactive login required",
            message:
                "The current authentication flow requires user interaction or re-consent.",
            technical: `${context ? `[${context}] ` : ""}${rawMessage}`,
        };
    }

    return {
        title: "Unexpected error",
        message: "The command could not be executed successfully.",
        technical: `${context ? `[${context}] ` : ""}${rawMessage}`,
    };
}

export function formatCliError(error: unknown, context?: string): string {
    const details = normalizeCliError(error, context);

    let output = `${details.title}\n${details.message}`;

    if (details.technical) {
        output += `\nTechnical error: ${details.technical}`;
    }

    return output;
}
