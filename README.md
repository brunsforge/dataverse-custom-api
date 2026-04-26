# CCDV Custom API CLI

A Node.js/TypeScript CLI for managing Dataverse Custom APIs. It enables reading, exporting, editing, and synchronizing Custom APIs between local JSON files and Dataverse environments.

The published package contains both compiled `dist/` output and the TypeScript `src/` source code.

## Installation

```bash
npm install -g ccdvcustomapi
```

Or from source:

```bash
git clone <repository-url>
cd CCDVCustomAPI
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
  - synchronize changes back to Dataverse (create, update, delete)
  - compute diffs and sync plans
- **JSON and human-readable output**: every command supports `--json`

## Authentication and connection

### Authentication methods

The CLI supports three authentication methods:

1. **Device Code Flow** (recommended for interactive use)
2. **Client Secret** (for automation / app-only access)
3. **Interactive Browser** (for browser-based login)

#### Configuration

Create an `auth.json` file in the repository root based on one of the sample files:

- `auth.devicecode.example.json` → Device Code auth
- `auth.clientsecret.example.json` → Client Secret auth
- `auth.interactivebrowser.example.json` → Interactive Browser auth

##### Device Code auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "authMode": "deviceCode"
}
```

**App registration setup:**
- Create an Azure AD App Registration
- Add API permissions:
  - Dynamics CRM > user_impersonation
- Add a redirect URI:
  - `https://login.microsoftonline.com/common/oauth2/nativeclient`
- No client secret is required

##### Client Secret auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-app-only-client-id",
  "clientSecret": "your-client-secret",
  "authMode": "clientSecret"
}
```

**App registration setup:**
- Create an Azure AD App Registration
- Create a client secret
- Add API permissions:
  - Dynamics CRM > user_impersonation (for user context) OR
  - Dynamics CRM > Organization.ReadWrite.All (for app-only access)
- No redirect URI is required

##### Interactive Browser auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "authMode": "interactiveBrowser"
}
```

**App registration setup:**
- Similar to Device Code, but for browser-based authentication

### Connect to an environment

```bash
ccsm connect -u "https://your-org.crm.dynamics.com"
```

**Output:**

```
Connected and cached: https://your-org.crm.dynamics.com
Auth mode: deviceCode
Cache file: /path/to/cache/environment.json
```

With JSON output:

```bash
ccsm connect -u "https://your-org.crm.dynamics.com" --json
```

## Environment management

### List environments

```bash
ccsm env list
```

**Output:**

```
* env-001 (Production) -> https://prod.crm.dynamics.com
- env-002 (Development) -> https://dev.crm.dynamics.com
```

### Show current environment

```bash
ccsm env current
```

**Output:**

```
Active environment: env-001
URL: https://prod.crm.dynamics.com
```

### Switch environment

```bash
ccsm env use -i env-002
```

**Output:**

```
Active environment set: env-002
```

### Remove environment

```bash
ccsm env remove -i env-001
```

## Custom API management

### List Custom APIs

```bash
ccsm api list
```

**Output:**

```
* ccsm_MyCustomApi (active)
- ccsm_AnotherApi
- sample_CustomFunction
```

With JSON output:

```bash
ccsm api list --json
```

### Show active Custom API

```bash
ccsm api current
```

**Output:**

```
Active API: ccsm_MyCustomApi
Cache file: /path/to/cache/api/ccsm_MyCustomApi.json
```

### Set active Custom API

```bash
ccsm api use -n ccsm_MyCustomApi
```

**Output:**

```
Active API set: ccsm_MyCustomApi
Cache file: /path/to/cache/api/ccsm_MyCustomApi.json
```

### Export Custom API

```bash
ccsm api export
# or specifically:
ccsm api export -n ccsm_MyCustomApi
```

**Output:**

```
Exported: /path/to/output/ccsm_MyCustomApi.json
```

### Compare local changes (diff)

```bash
ccsm api diff
# or specifically:
ccsm api diff -n ccsm_MyCustomApi
```

**Output:**

```
Diff for ccsm_MyCustomApi:
- Parameter 'inputParam' added
- Response property 'outputProp' changed
```

Use `--json` for machine-readable diff output.

### Create sync plan

```bash
ccsm api plan
# or specifically:
ccsm api plan -n ccsm_MyCustomApi
```

**Output:**

```
Plan generated: /path/to/plans/ccsm_MyCustomApi.syncplan.json
State file: /path/to/state/ccsm_MyCustomApi.syncstate.json
Operations: 3
Requires destructive changes: No

- [1] updateCustomApi ccsm_MyCustomApi (Parameter added)
- [2] createCustomApiRequestParameter inputParam (New parameter)
- [3] updateCustomApiResponseProperty outputProp (Property changed)
```

### Execute a single operation

```bash
ccsm api exec-op --operation-id "op-0001-updateCustomApi-ccsm_MyCustomApi" --simulate
```

**Output:**

```
Operation executed: op-0001-updateCustomApi-ccsm_MyCustomApi
Status: simulated
```

Without `--simulate` for real execution (not implemented yet).

### Execute full plan

```bash
ccsm api exec-plan --simulate
```

**Output:**

```
Plan executed for: ccsm_MyCustomApi
Status: simulated
State file: /path/to/state/ccsm_MyCustomApi.syncstate.json

- [1] updateCustomApi ccsm_MyCustomApi: simulated
- [2] createCustomApiRequestParameter inputParam: simulated
- [3] updateCustomApiResponseProperty outputProp: simulated
```

### Check metadata

```bash
ccsm api check-metadata
```

Checks whether the local definition differs from the current Dataverse metadata.

### Remove local artifacts

```bash
ccsm api remove
# or specifically:
ccsm api remove -n ccsm_MyCustomApi
```

## Typical workflow

### 1. Setup and connect

```bash
# Create auth configuration
cp auth.devicecode.example.json auth.json
# edit auth.json with your tenant ID and client ID

# Connect to an environment
ccsm connect -u "https://your-org.crm.dynamics.com"
```

### 2. Edit an existing Custom API

```bash
# list APIs
ccsm api list

# set an active API
ccsm api use -n ccsm_ExistingApi

# export for editing
ccsm api export

# edit the local JSON file (e.g. add a parameter)
# ... edit /path/to/output/ccsm_ExistingApi.json ...

# check diff
ccsm api diff

# create a sync plan
ccsm api plan

# simulate execution
ccsm api exec-plan --simulate
```

### 3. Create a new Custom API

```bash
# create a new local JSON file based on an exported structure
# example: /path/to/output/ccsm_NewApi.json

# set the API as active even if it does not exist in Dataverse yet
ccsm api use -n ccsm_NewApi

# create a sync plan (should include create operations)
ccsm api plan

# simulate execution
ccsm api exec-plan --simulate
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

## Error handling

Commands return structured error information. Unexpected failures print a stack trace.

## Requirements

- Node.js 16+
- npm
- Access to a Dataverse environment
- Correct Azure AD app registration

## License

MIT

## Author and contact

Andreas Brunsmann

- Email: andreas.brunsmann@example.com
- GitHub: https://github.com/andreasbrunsmann

## Contributors

- Andreas Brunsmann

---

# CCDV Custom API CLI

Eine Node.js/TypeScript-basierte CLI zum Verwalten von Dataverse Custom APIs. Sie ermöglicht das Lesen, Exportieren, Bearbeiten und Synchronisieren von Custom APIs zwischen lokalen JSON-Dateien und Dataverse-Umgebungen.

Das veröffentlichte Paket enthält sowohl den kompilierten `dist/`-Output als auch den TypeScript-Quellcode in `src/`.

## Installation

```bash
npm install -g ccdvcustomapi
```

Oder aus dem Quellcode:

```bash
git clone <repository-url>
cd CCDVCustomAPI
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
  - Änderungen zurück nach Dataverse synchronisieren (Create, Update, Delete)
  - Diffs und Sync-Pläne berechnen
- **JSON- und menschenlesbare Ausgaben**: alle Befehle unterstützen `--json`

## Authentifizierung und Verbindung

### Authentifizierungsmethoden

Die CLI unterstützt drei Authentifizierungsmethoden:

1. **Device Code Flow** (empfohlen für interaktive Nutzung)
2. **Client Secret** (für Automatisierung/App-Only-Zugriff)
3. **Interactive Browser** (für browserbasiertes Login)

#### Konfiguration

Erstelle eine `auth.json`-Datei im Projektstamm basierend auf einer der Beispiel-Dateien:

- `auth.devicecode.example.json` → Device Code Auth
- `auth.clientsecret.example.json` → Client Secret Auth
- `auth.interactivebrowser.example.json` → Interactive Browser Auth

##### Device Code Auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "authMode": "deviceCode"
}
```

**App Registration Setup:**
- Erstelle eine Azure AD App Registration
- Füge API-Berechtigungen hinzu:
  - Dynamics CRM > user_impersonation
- Setze eine Redirect URI:
  - `https://login.microsoftonline.com/common/oauth2/nativeclient`
- Kein Client Secret erforderlich

##### Client Secret Auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-app-only-client-id",
  "clientSecret": "your-client-secret",
  "authMode": "clientSecret"
}
```

**App Registration Setup:**
- Erstelle eine Azure AD App Registration
- Erstelle ein Client Secret
- Füge API-Berechtigungen hinzu:
  - Dynamics CRM > user_impersonation (für User-Kontext) ODER
  - Dynamics CRM > Organization.ReadWrite.All (für App-Only-Zugriff)
- Keine Redirect URI erforderlich

##### Interactive Browser Auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "authMode": "interactiveBrowser"
}
```

**App Registration Setup:**
- Ähnlich wie Device Code, aber für browserbasierte Authentifizierung

### Verbindung zu einem Environment

```bash
ccsm connect -u "https://your-org.crm.dynamics.com"
```

**Ausgabe:**

```
Verbunden und gecacht: https://your-org.crm.dynamics.com
Auth-Modus: deviceCode
Cache-Datei: /path/to/cache/environment.json
```

Mit JSON-Ausgabe:

```bash
ccsm connect -u "https://your-org.crm.dynamics.com" --json
```

## Environment-Management

### Environments auflisten

```bash
ccsm env list
```

**Ausgabe:**

```
* env-001 (Production) -> https://prod.crm.dynamics.com
- env-002 (Development) -> https://dev.crm.dynamics.com
```

### Aktives Environment anzeigen

```bash
ccsm env current
```

**Ausgabe:**

```
Aktives Environment: env-001
URL: https://prod.crm.dynamics.com
```

### Environment wechseln

```bash
ccsm env use -i env-002
```

**Ausgabe:**

```
Aktives Environment gesetzt: env-002
```

### Environment entfernen

```bash
ccsm env remove -i env-001
```

## Custom API-Management

### Custom APIs auflisten

```bash
ccsm api list
```

**Ausgabe:**

```
* ccsm_MyCustomApi (aktiv)
- ccsm_AnotherApi
- sample_CustomFunction
```

Mit JSON-Ausgabe:

```bash
ccsm api list --json
```

### Aktive Custom API anzeigen

```bash
ccsm api current
```

**Ausgabe:**

```
Aktive API: ccsm_MyCustomApi
Cache-Datei: /path/to/cache/api/ccsm_MyCustomApi.json
```

### Custom API als aktiv setzen

```bash
ccsm api use -n ccsm_MyCustomApi
```

**Ausgabe:**

```
Aktive API gesetzt: ccsm_MyCustomApi
Cache-Datei: /path/to/cache/api/ccsm_MyCustomApi.json
```

### Custom API exportieren

```bash
ccsm api export
# oder spezifisch:
ccsm api export -n ccsm_MyCustomApi
```

**Ausgabe:**

```
Exportiert: /path/to/output/ccsm_MyCustomApi.json
```

### Lokale Änderungen prüfen (Diff)

```bash
ccsm api diff
# oder spezifisch:
ccsm api diff -n ccsm_MyCustomApi
```

**Ausgabe:**

```
Diff für ccsm_MyCustomApi:
- Parameter 'inputParam' hinzugefügt
- Response Property 'outputProp' geändert
```

Mit JSON-Ausgabe für detaillierte Analyse.

### Sync-Plan erstellen

```bash
ccsm api plan
# oder spezifisch:
ccsm api plan -n ccsm_MyCustomApi
```

**Ausgabe:**

```
Plan erzeugt: /path/to/plans/ccsm_MyCustomApi.syncplan.json
State-Datei: /path/to/state/ccsm_MyCustomApi.syncstate.json
Operationen: 3
Destruktive Änderungen erforderlich: Nein

- [1] updateCustomApi ccsm_MyCustomApi (Parameter hinzugefügt)
- [2] createCustomApiRequestParameter inputParam (Neuer Parameter)
- [3] updateCustomApiResponseProperty outputProp (Property geändert)
```

### Einzelne Operation ausführen

```bash
ccsm api exec-op --operation-id "op-0001-updateCustomApi-ccsm_MyCustomApi" --simulate
```

**Ausgabe:**

```
Operation ausgeführt: op-0001-updateCustomApi-ccsm_MyCustomApi
Status: simulated
```

Ohne `--simulate` für echte Ausführung (noch nicht implementiert).

### Kompletten Plan ausführen

```bash
ccsm api exec-plan --simulate
```

**Ausgabe:**

```
Plan ausgeführt für: ccsm_MyCustomApi
Status: simulated
State-Datei: /path/to/state/ccsm_MyCustomApi.syncstate.json

- [1] updateCustomApi ccsm_MyCustomApi: simulated
- [2] createCustomApiRequestParameter inputParam: simulated
- [3] updateCustomApiResponseProperty outputProp: simulated
```

### Metadaten prüfen

```bash
ccsm api check-metadata
```

Prüft, ob lokale Definition mit aktuellen Dataverse-Metadaten übereinstimmt.

### Lokale Artefakte entfernen

```bash
ccsm api remove
# oder spezifisch:
ccsm api remove -n ccsm_MyCustomApi
```

## Typischer Workflow

### 1. Setup und Verbindung

```bash
# Auth-Konfiguration erstellen
cp auth.devicecode.example.json auth.json
# auth.json bearbeiten mit Tenant-ID und Client-ID

# Mit Environment verbinden
ccsm connect -u "https://your-org.crm.dynamics.com"
```

### 2. Vorhandene Custom API bearbeiten

```bash
# APIs auflisten
ccsm api list

# API als aktiv setzen
ccsm api use -n ccsm_ExistingApi

# Exportieren für Bearbeitung
ccsm api export

# Lokale JSON-Datei bearbeiten (z.B. Parameter hinzufügen)
# ... edit /path/to/output/ccsm_ExistingApi.json ...

# Diff prüfen
ccsm api diff

# Plan erstellen
ccsm api plan

# Simuliert ausführen
ccsm api exec-plan --simulate
```

### 3. Neue Custom API erstellen

```bash
# Neue JSON-Datei manuell erstellen (basierend auf exportierter Struktur)
# Beispiel: /path/to/output/ccsm_NewApi.json

# API als aktiv setzen (auch wenn sie noch nicht in Dataverse existiert)
ccsm api use -n ccsm_NewApi

# Plan erstellen (wird Create-Operationen enthalten)
ccsm api plan

# Simuliert ausführen
ccsm api exec-plan --simulate
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

## Fehlerbehandlung

Alle Befehle geben strukturierte Fehler aus. Bei unerwarteten Fehlern wird ein Stack-Trace angezeigt.

## Voraussetzungen

- Node.js 16+
- npm
- Zugriff auf Dataverse-Environment
- Korrekte Azure AD App Registration

## Lizenz

MIT

## Autor und Kontakt

Andreas Brunsmann

- E-Mail: andreas.brunsmann@example.com
- GitHub: https://github.com/andreasbrunsmann

## Mitwirkende

- Andreas Brunsmann
