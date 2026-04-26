# Dataverse Custom API CLI

A Node.js/TypeScript CLI for managing Dataverse Custom APIs. It enables reading, exporting, editing, diffing, planning, and synchronizing Custom API definitions between local JSON files and Dataverse environments.

The GitHub repository contains the TypeScript `src/` source code. The compiled `dist/` output is generated during build and included together with `src/` in the published npm package.

## Installation

```bash
npm install -g @brunsforge/dataverse-custom-api
```

Or from source:

```bash
git clone https://github.com/brunsforge/dataverse-custom-api.git
cd dataverse-custom-api
npm install
npm run build
npm link
```

## Features

- **Connect to Dataverse environments**: multiple authentication methods (Device Code, Client Secret, Interactive Browser)
- **Environment management**: save, list, switch, and remove environments
- **Custom API management**:
  - list available Custom APIs
  - export Custom APIs as local JSON artifacts
  - edit Custom API definitions locally
  - compare local definitions with Dataverse metadata
  - create sync plans
  - execute single sync operations
  - execute full sync plans
  - create, update, or delete Custom API metadata in Dataverse
- **Simulation mode**: preview operations with `--simulate` before applying changes
- **JSON and human-readable output**: every command supports `--json`

> Warning: Commands that execute without `--simulate` may create, update, or delete Custom API metadata in the connected Dataverse environment.

## Authentication and connection

### Authentication methods

The CLI supports three authentication methods:

1. **Device Code Flow** (recommended for interactive use)
2. **Client Secret** (for automation / app-only access)
3. **Interactive Browser** (for browser-based login)

### Configuration

Create an `auth.json` file in the repository root based on one of the sample files:

- `auth.devicecode.example.json` → Device Code auth
- `auth.clientsecret.example.json` → Client Secret auth
- `auth.interactivebrowser.example.json` → Interactive Browser auth

#### Device Code auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "authMode": "deviceCode"
}
```

**App registration setup:**

- Create an Azure AD / Microsoft Entra ID App Registration
- Add API permissions:
  - Dynamics CRM > user_impersonation
- Add a redirect URI:
  - `https://login.microsoftonline.com/common/oauth2/nativeclient`
- No client secret is required

#### Client Secret auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-app-only-client-id",
  "clientSecret": "your-client-secret",
  "authMode": "clientSecret"
}
```

**App registration setup:**

- Create an Azure AD / Microsoft Entra ID App Registration
- Create a client secret
- Add API permissions:
  - Dynamics CRM > user_impersonation for delegated access
  - or the required Dataverse application permissions for app-only access
- No redirect URI is required

#### Interactive Browser auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "authMode": "interactiveBrowser"
}
```

**App registration setup:**

- Similar to Device Code auth, but for browser-based authentication

### Connect to an environment

```bash
dvc connect -u "https://your-org.crm.dynamics.com"
```

**Output:**

```text
Connected and cached: https://your-org.crm.dynamics.com
Auth mode: deviceCode
Cache file: /path/to/cache/environment.json
```

With JSON output:

```bash
dvc connect -u "https://your-org.crm.dynamics.com" --json
```

## Environment management

### List environments

```bash
dvc env list
```

**Output:**

```text
* env-001 (Production) -> https://prod.crm.dynamics.com
- env-002 (Development) -> https://dev.crm.dynamics.com
```

### Show current environment

```bash
dvc env current
```

**Output:**

```text
Active environment: env-001
URL: https://prod.crm.dynamics.com
```

### Switch environment

```bash
dvc env use -i env-002
```

**Output:**

```text
Active environment set: env-002
```

### Remove environment

```bash
dvc env remove -i env-001
```

## Custom API management

### List Custom APIs

```bash
dvc api list
```

**Output:**

```text
* ccsm_MyCustomApi (active)
- ccsm_AnotherApi
- sample_CustomFunction
```

With JSON output:

```bash
dvc api list --json
```

### Show active Custom API

```bash
dvc api current
```

**Output:**

```text
Active API: ccsm_MyCustomApi
Cache file: /path/to/cache/api/ccsm_MyCustomApi.json
```

### Set active Custom API

```bash
dvc api use -n ccsm_MyCustomApi
```

**Output:**

```text
Active API set: ccsm_MyCustomApi
Cache file: /path/to/cache/api/ccsm_MyCustomApi.json
```

### Export Custom API

```bash
dvc api export
# or specifically:
dvc api export -n ccsm_MyCustomApi
```

**Output:**

```text
Exported: /path/to/output/ccsm_MyCustomApi.json
```

### Compare local changes

```bash
dvc api diff
# or specifically:
dvc api diff -n ccsm_MyCustomApi
```

**Output:**

```text
Diff for ccsm_MyCustomApi:
- Parameter 'inputParam' added
- Response property 'outputProp' changed
```

Use `--json` for machine-readable diff output.

### Create sync plan

```bash
dvc api plan
# or specifically:
dvc api plan -n ccsm_MyCustomApi
```

**Output:**

```text
Plan generated: /path/to/plans/ccsm_MyCustomApi.syncplan.json
State file: /path/to/state/ccsm_MyCustomApi.syncstate.json
Operations: 3
Requires destructive changes: No

- [1] updateCustomApi ccsm_MyCustomApi (Parameter added)
- [2] createCustomApiRequestParameter inputParam (New parameter)
- [3] updateCustomApiResponseProperty outputProp (Property changed)
```

### Execute a single operation

Use `--simulate` to execute a single operation as a dry run without applying changes:

```bash
dvc api exec-op --operation-id "op-0010-updateCustomApi-ccsm_MyCustomApi-<uuid>" --simulate
```

**Output:**

```text
Operation executed: op-0010-updateCustomApi-ccsm_MyCustomApi-<uuid>
Status: simulated
```

Run the same command without `--simulate` to execute the operation against the connected Dataverse environment:

```bash
dvc api exec-op --operation-id "op-0010-updateCustomApi-ccsm_MyCustomApi-<uuid>"
```

> Warning: Without `--simulate`, the operation is executed against the connected Dataverse environment and may create, update, or delete Custom API metadata.

### Execute full plan

Use `--simulate` to execute the full plan as a dry run without applying changes:

```bash
dvc api exec-plan --simulate
```

**Output:**

```text
Plan executed for: ccsm_MyCustomApi
Status: simulated
State file: /path/to/state/ccsm_MyCustomApi.syncstate.json

- [1] updateCustomApi ccsm_MyCustomApi: simulated
- [2] createCustomApiRequestParameter inputParam: simulated
- [3] updateCustomApiResponseProperty outputProp: simulated
```

Run the command without `--simulate` to execute all pending operations in the plan against the connected Dataverse environment:

```bash
dvc api exec-plan
```

> Warning: Without `--simulate`, all pending operations in the sync plan are executed in sequence and may create, update, or delete Custom API metadata.

### Check metadata

```bash
dvc api check-metadata
```

Checks whether the local definition differs from the current Dataverse metadata.

### Remove local artifacts

```bash
dvc api remove
# or specifically:
dvc api remove -n ccsm_MyCustomApi
```

This removes local cached/exported artifacts. It does not delete the Custom API from Dataverse.

## Typical workflow

### 1. Setup and connect

```bash
# Create auth configuration
cp auth.devicecode.example.json auth.json
# edit auth.json with your tenant ID and client ID

# Connect to an environment
dvc connect -u "https://your-org.crm.dynamics.com"
```

### 2. Edit an existing Custom API

```bash
# list APIs
dvc api list

# set an active API
dvc api use -n ccsm_ExistingApi

# export for editing
dvc api export

# edit the local JSON file
# for example: add a request parameter or change a description

# check diff
dvc api diff

# create a sync plan
dvc api plan

# simulate execution first
dvc api exec-plan --simulate

# execute live after reviewing the plan
dvc api exec-plan
```

### 3. Create a new Custom API

```bash
# create a new local JSON file based on an exported structure
# example: /path/to/output/ccsm_NewApi.json

# set the API as active even if it does not exist in Dataverse yet
dvc api use -n ccsm_NewApi

# create a sync plan
dvc api plan

# simulate execution first
dvc api exec-plan --simulate

# execute live after reviewing the plan
dvc api exec-plan
```

## Custom API JSON structure

A typical Custom API JSON file looks like:

```json
{
  "uniqueName": "ccsm_MyCustomApi",
  "displayName": "My Custom API",
  "description": "Description of the API",
  "bindingType": "Function",
  "boundEntityLogicalName": null,
  "isPrivate": false,
  "allowedCustomProcessingStepType": "None",
  "executePrivilegeName": null,
  "isFunction": true,
  "isComposable": false,
  "pluginType": {
    "uniqueName": "ccsm_MyPluginType"
  },
  "requestParameters": [
    {
      "uniqueName": "inputParam",
      "displayName": "Input Parameter",
      "description": "Description",
      "type": "String",
      "isOptional": false
    }
  ],
  "responseProperties": [
    {
      "uniqueName": "outputProp",
      "displayName": "Output Property",
      "description": "Description",
      "type": "String"
    }
  ]
}
```

## Publishing notes

The package is built from TypeScript.

The repository does not need to contain committed `dist/` files. The compiled `dist/` output is generated during build and included in the published npm package.

Before publishing, verify the package contents:

```bash
npm run build
npm pack --dry-run
```

The dry run should include at least:

```text
dist/
src/
README.md
LICENSE
package.json
```

For scoped public packages, publish with:

```bash
npm publish --access public
```

## Error handling

Commands return structured error information. Unexpected failures print a stack trace.

## Requirements

- Node.js 16+
- npm
- Access to a Dataverse environment
- Correct Azure AD / Microsoft Entra ID App Registration
- Sufficient Dataverse privileges to read or modify Custom API metadata

## License

MIT

## Author and contact

Andreas Brunsmann

- Email: oss@andreasbrunsmann.de
- GitHub: https://github.com/brunsforge
- Repository: https://github.com/brunsforge/dataverse-custom-api

## Contributors

- Andreas Brunsmann

---

# Dataverse Custom API CLI

Eine Node.js/TypeScript-basierte CLI zum Verwalten von Dataverse Custom APIs. Sie ermöglicht das Lesen, Exportieren, Bearbeiten, Vergleichen, Planen und Synchronisieren von Custom-API-Definitionen zwischen lokalen JSON-Dateien und Dataverse-Umgebungen.

Das GitHub-Repository enthält den TypeScript-Quellcode in `src/`. Der kompilierte `dist/`-Output wird beim Build erzeugt und zusammen mit `src/` im veröffentlichten npm-Paket ausgeliefert.

## Installation

```bash
npm install -g @brunsforge/dataverse-custom-api
```

Oder aus dem Quellcode:

```bash
git clone https://github.com/brunsforge/dataverse-custom-api.git
cd dataverse-custom-api
npm install
npm run build
npm link
```

## Übersicht der Features

- **Verbindung zu Dataverse-Umgebungen**: mehrere Authentifizierungsmethoden (Device Code, Client Secret, Interactive Browser)
- **Environment-Management**: Environments speichern, auflisten, wechseln und entfernen
- **Custom API-Verwaltung**:
  - vorhandene Custom APIs auflisten
  - Custom APIs als lokale JSON-Artefakte exportieren
  - Custom API-Definitionen lokal bearbeiten
  - lokale Definitionen mit Dataverse-Metadaten vergleichen
  - Sync-Pläne erstellen
  - einzelne Sync-Operationen ausführen
  - vollständige Sync-Pläne ausführen
  - Custom-API-Metadaten in Dataverse erstellen, ändern oder löschen
- **Simulationsmodus**: Operationen mit `--simulate` vorab prüfen
- **JSON- und menschenlesbare Ausgaben**: alle Befehle unterstützen `--json`

> Achtung: Befehle, die ohne `--simulate` ausgeführt werden, können Custom-API-Metadaten in der verbundenen Dataverse-Umgebung erstellen, ändern oder löschen.

## Authentifizierung und Verbindung

### Authentifizierungsmethoden

Die CLI unterstützt drei Authentifizierungsmethoden:

1. **Device Code Flow** (empfohlen für interaktive Nutzung)
2. **Client Secret** (für Automatisierung/App-Only-Zugriff)
3. **Interactive Browser** (für browserbasiertes Login)

### Konfiguration

Erstelle eine `auth.json`-Datei im Projektstamm basierend auf einer der Beispiel-Dateien:

- `auth.devicecode.example.json` → Device Code Auth
- `auth.clientsecret.example.json` → Client Secret Auth
- `auth.interactivebrowser.example.json` → Interactive Browser Auth

#### Device Code Auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "authMode": "deviceCode"
}
```

**App Registration Setup:**

- Erstelle eine Azure AD / Microsoft Entra ID App Registration
- Füge API-Berechtigungen hinzu:
  - Dynamics CRM > user_impersonation
- Setze eine Redirect URI:
  - `https://login.microsoftonline.com/common/oauth2/nativeclient`
- Kein Client Secret erforderlich

#### Client Secret Auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-app-only-client-id",
  "clientSecret": "your-client-secret",
  "authMode": "clientSecret"
}
```

**App Registration Setup:**

- Erstelle eine Azure AD / Microsoft Entra ID App Registration
- Erstelle ein Client Secret
- Füge API-Berechtigungen hinzu:
  - Dynamics CRM > user_impersonation für delegierten Zugriff
  - oder die erforderlichen Dataverse Application Permissions für App-Only-Zugriff
- Keine Redirect URI erforderlich

#### Interactive Browser Auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "authMode": "interactiveBrowser"
}
```

**App Registration Setup:**

- Ähnlich wie Device Code Auth, aber für browserbasierte Authentifizierung

### Verbindung zu einem Environment

```bash
dvc connect -u "https://your-org.crm.dynamics.com"
```

**Ausgabe:**

```text
Verbunden und gecacht: https://your-org.crm.dynamics.com
Auth-Modus: deviceCode
Cache-Datei: /path/to/cache/environment.json
```

Mit JSON-Ausgabe:

```bash
dvc connect -u "https://your-org.crm.dynamics.com" --json
```

## Environment-Management

### Environments auflisten

```bash
dvc env list
```

**Ausgabe:**

```text
* env-001 (Production) -> https://prod.crm.dynamics.com
- env-002 (Development) -> https://dev.crm.dynamics.com
```

### Aktives Environment anzeigen

```bash
dvc env current
```

**Ausgabe:**

```text
Aktives Environment: env-001
URL: https://prod.crm.dynamics.com
```

### Environment wechseln

```bash
dvc env use -i env-002
```

**Ausgabe:**

```text
Aktives Environment gesetzt: env-002
```

### Environment entfernen

```bash
dvc env remove -i env-001
```

## Custom API-Management

### Custom APIs auflisten

```bash
dvc api list
```

**Ausgabe:**

```text
* ccsm_MyCustomApi (aktiv)
- ccsm_AnotherApi
- sample_CustomFunction
```

Mit JSON-Ausgabe:

```bash
dvc api list --json
```

### Aktive Custom API anzeigen

```bash
dvc api current
```

**Ausgabe:**

```text
Aktive API: ccsm_MyCustomApi
Cache-Datei: /path/to/cache/api/ccsm_MyCustomApi.json
```

### Custom API als aktiv setzen

```bash
dvc api use -n ccsm_MyCustomApi
```

**Ausgabe:**

```text
Aktive API gesetzt: ccsm_MyCustomApi
Cache-Datei: /path/to/cache/api/ccsm_MyCustomApi.json
```

### Custom API exportieren

```bash
dvc api export
# oder spezifisch:
dvc api export -n ccsm_MyCustomApi
```

**Ausgabe:**

```text
Exportiert: /path/to/output/ccsm_MyCustomApi.json
```

### Lokale Änderungen vergleichen

```bash
dvc api diff
# oder spezifisch:
dvc api diff -n ccsm_MyCustomApi
```

**Ausgabe:**

```text
Diff für ccsm_MyCustomApi:
- Parameter 'inputParam' hinzugefügt
- Response Property 'outputProp' geändert
```

Mit `--json` erhältst du eine maschinenlesbare Diff-Ausgabe.

### Sync-Plan erstellen

```bash
dvc api plan
# oder spezifisch:
dvc api plan -n ccsm_MyCustomApi
```

**Ausgabe:**

```text
Plan erzeugt: /path/to/plans/ccsm_MyCustomApi.syncplan.json
State-Datei: /path/to/state/ccsm_MyCustomApi.syncstate.json
Operationen: 3
Destruktive Änderungen erforderlich: Nein

- [1] updateCustomApi ccsm_MyCustomApi (Parameter hinzugefügt)
- [2] createCustomApiRequestParameter inputParam (Neuer Parameter)
- [3] updateCustomApiResponseProperty outputProp (Property geändert)
```

### Einzelne Operation ausführen

Nutze `--simulate`, um eine einzelne Operation als Dry Run auszuführen, ohne Änderungen anzuwenden:

```bash
dvc api exec-op --operation-id "op-0010-updateCustomApi-ccsm_MyCustomApi-<uuid>" --simulate
```

**Ausgabe:**

```text
Operation ausgeführt: op-0010-updateCustomApi-ccsm_MyCustomApi-<uuid>
Status: simulated
```

Führe denselben Befehl ohne `--simulate` aus, um die Operation gegen die verbundene Dataverse-Umgebung auszuführen:

```bash
dvc api exec-op --operation-id "op-0010-updateCustomApi-ccsm_MyCustomApi-<uuid>"
```

> Achtung: Ohne `--simulate` wird die Operation gegen die verbundene Dataverse-Umgebung ausgeführt und kann Custom-API-Metadaten erstellen, ändern oder löschen.

### Kompletten Plan ausführen

Nutze `--simulate`, um den vollständigen Plan als Dry Run auszuführen, ohne Änderungen anzuwenden:

```bash
dvc api exec-plan --simulate
```

**Ausgabe:**

```text
Plan ausgeführt für: ccsm_MyCustomApi
Status: simulated
State-Datei: /path/to/state/ccsm_MyCustomApi.syncstate.json

- [1] updateCustomApi ccsm_MyCustomApi: simulated
- [2] createCustomApiRequestParameter inputParam: simulated
- [3] updateCustomApiResponseProperty outputProp: simulated
```

Führe den Befehl ohne `--simulate` aus, um alle offenen Operationen des Plans gegen die verbundene Dataverse-Umgebung auszuführen:

```bash
dvc api exec-plan
```

> Achtung: Ohne `--simulate` werden alle offenen Operationen des Sync-Plans in Reihenfolge ausgeführt und können Custom-API-Metadaten erstellen, ändern oder löschen.

### Metadaten prüfen

```bash
dvc api check-metadata
```

Prüft, ob lokale Definition mit aktuellen Dataverse-Metadaten übereinstimmt.

### Lokale Artefakte entfernen

```bash
dvc api remove
# oder spezifisch:
dvc api remove -n ccsm_MyCustomApi
```

Dies entfernt lokale gecachte/exportierte Artefakte. Die Custom API wird dadurch nicht aus Dataverse gelöscht.

## Typischer Workflow

### 1. Setup und Verbindung

```bash
# Auth-Konfiguration erstellen
cp auth.devicecode.example.json auth.json
# auth.json bearbeiten mit Tenant-ID und Client-ID

# Mit Environment verbinden
dvc connect -u "https://your-org.crm.dynamics.com"
```

### 2. Vorhandene Custom API bearbeiten

```bash
# APIs auflisten
dvc api list

# API als aktiv setzen
dvc api use -n ccsm_ExistingApi

# Exportieren für Bearbeitung
dvc api export

# Lokale JSON-Datei bearbeiten
# z. B. Parameter hinzufügen oder Beschreibung ändern

# Diff prüfen
dvc api diff

# Plan erstellen
dvc api plan

# zuerst simuliert ausführen
dvc api exec-plan --simulate

# nach Prüfung live ausführen
dvc api exec-plan
```

### 3. Neue Custom API erstellen

```bash
# Neue JSON-Datei manuell erstellen, basierend auf exportierter Struktur
# Beispiel: /path/to/output/ccsm_NewApi.json

# API als aktiv setzen, auch wenn sie noch nicht in Dataverse existiert
dvc api use -n ccsm_NewApi

# Plan erstellen
dvc api plan

# zuerst simuliert ausführen
dvc api exec-plan --simulate

# nach Prüfung live ausführen
dvc api exec-plan
```

## JSON-Struktur der Custom API

Eine typische Custom API JSON-Datei sieht so aus:

```json
{
  "uniqueName": "ccsm_MyCustomApi",
  "displayName": "My Custom API",
  "description": "Beschreibung der API",
  "bindingType": "Function",
  "boundEntityLogicalName": null,
  "isPrivate": false,
  "allowedCustomProcessingStepType": "None",
  "executePrivilegeName": null,
  "isFunction": true,
  "isComposable": false,
  "pluginType": {
    "uniqueName": "ccsm_MyPluginType"
  },
  "requestParameters": [
    {
      "uniqueName": "inputParam",
      "displayName": "Input Parameter",
      "description": "Beschreibung",
      "type": "String",
      "isOptional": false
    }
  ],
  "responseProperties": [
    {
      "uniqueName": "outputProp",
      "displayName": "Output Property",
      "description": "Beschreibung",
      "type": "String"
    }
  ]
}
```

## Publishing notes

Das Paket wird aus TypeScript gebaut.

Das Repository muss keine committed `dist/`-Dateien enthalten. Der kompilierte `dist/`-Output wird beim Build erzeugt und im veröffentlichten npm-Paket ausgeliefert.

Prüfe vor dem Publish den Paketinhalt:

```bash
npm run build
npm pack --dry-run
```

Der Dry Run sollte mindestens enthalten:

```text
dist/
src/
README.md
LICENSE
package.json
```

Für scoped public packages veröffentlichst du mit:

```bash
npm publish --access public
```

## Fehlerbehandlung

Alle Befehle geben strukturierte Fehler aus. Bei unerwarteten Fehlern wird ein Stack-Trace angezeigt.

## Voraussetzungen

- Node.js 16+
- npm
- Zugriff auf Dataverse-Environment
- Korrekte Azure AD / Microsoft Entra ID App Registration
- Ausreichende Dataverse-Berechtigungen zum Lesen oder Ändern von Custom-API-Metadaten

## Lizenz

MIT

## Autor und Kontakt

Andreas Brunsmann

- E-Mail: oss@andreasbrunsmann.de
- GitHub: https://github.com/brunsforge
- Repository: https://github.com/brunsforge/dataverse-custom-api

## Mitwirkende

- Andreas Brunsmann
