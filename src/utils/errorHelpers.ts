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
            title: "Authentifizierung fehlgeschlagen",
            message:
                "Der Login wurde von Entra ID abgelehnt oder nicht erfolgreich abgeschlossen. " +
                "Prüfe Public Client Flow, API Permissions, Admin Consent und ob der Login vollständig durchgeführt wurde.",
            technical: `${context ? `[${context}] ` : ""}${rawMessage}`,
        };
    }

    if (lower.includes("invalid_resource")) {
        return {
            title: "Ungültige Zielressource für Tokenanforderung",
            message:
                "Die App Registration darf für die angeforderte Dataverse-Ressource kein Token anfordern. " +
                "Prüfe API Permissions und Consent der verwendeten App Registration.",
            technical: `${context ? `[${context}] ` : ""}${rawMessage}`,
        };
    }

    if (lower.includes("interaction_required")) {
        return {
            title: "Interaktive Anmeldung erforderlich",
            message:
                "Der aktuelle Authentifizierungsfluss benötigt eine Benutzerinteraktion oder erneute Zustimmung.",
            technical: `${context ? `[${context}] ` : ""}${rawMessage}`,
        };
    }

    return {
        title: "Unerwarteter Fehler",
        message: "Der Befehl konnte nicht erfolgreich ausgeführt werden.",
        technical: `${context ? `[${context}] ` : ""}${rawMessage}`,
    };
}

export function formatCliError(error: unknown, context?: string): string {
    const details = normalizeCliError(error, context);

    let output = `${details.title}\n${details.message}`;

    if (details.technical) {
        output += `\nTechnischer Fehler: ${details.technical}`;
    }

    return output;
}