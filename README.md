# Dataverse Custom API CLI

A Node.js/TypeScript CLI for managing Dataverse Custom APIs. It enables reading, exporting, editing, validating, diffing, planning, and synchronizing Custom API definitions between local JSON files and Dataverse environments.

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
  - **validate local definitions** before syncing — catches type errors, missing fields, and invalid combinations with structured diagnostics
  - compare local definitions with Dataverse metadata
  - create sync plans (validation runs automatically; plan is blocked if errors are found)
  - execute single sync operations
  - execute full sync plans
  - create, update, or delete Custom API metadata in Dataverse
  - **validate privileges** — check which Dataverse privileges the configured App User holds and which features are available or restricted
- **Graceful privilege fallback**: if the App User lacks `prvAppendToPluginType`, `createCustomApi` automatically retries without the PluginType binding and records a `warning` in the sync result instead of failing
- **Simulation mode**: preview operations with `--simulate` before applying changes
- **JSON and human-readable output**: every command supports `--json`
- **Structured diagnostics**: `api validate --json` returns a `CcdvCommandResult` envelope for VS Code extension integration

> **Warning:** Commands that execute without `--simulate` may create, update, or delete Custom API metadata in the connected Dataverse environment.

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
- Add API permissions: Dynamics CRM > user_impersonation
- Add a redirect URI: `https://login.microsoftonline.com/common/oauth2/nativeclient`
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
- Add API permissions: Dynamics CRM > user_impersonation (or Dataverse application permissions for app-only access)
- No redirect URI is required

#### Interactive Browser auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "authMode": "interactiveBrowser"
}
```

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
Display name: Production
URL: https://prod.crm.dynamics.com
Auth mode: deviceCode
```

### Switch environment

```bash
dvc env use -i env-002
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
* ccsm_MyCustomApi
- ccsm_AnotherApi
- sample_CustomFunction
```

### Show active Custom API

```bash
dvc api current
```

**Output:**

```text
Active API: ccsm_MyCustomApi
Cache file: /path/to/cache/active-api.json
```

### Set active Custom API

```bash
dvc api use -n ccsm_MyCustomApi
```

### Export Custom API

Exports the current Dataverse definition to a local JSON catalog file.

```bash
dvc api export
# or with explicit name:
dvc api export -n ccsm_MyCustomApi
```

**Output:**

```text
Exported: /path/to/output/ccsm_MyCustomApi.json
```

### Validate local definition

Validates the local JSON file against Dataverse field rules. Returns structured diagnostics with error codes, field paths, and suggested fixes. No network connection is required.

```bash
dvc api validate
# or with explicit name:
dvc api validate -n ccsm_MyCustomApi
```

**Output — no issues:**

```text
Validation for: ccsm_MyCustomApi
Status: succeeded
No issues found.
```

**Output — with diagnostics:**

```text
Validation for: ccsm_MyCustomApi
Status: validationFailed

ERROR [CCDV_PARAM_LOGICAL_ENTITY_NAME_NOT_ALLOWED] [ccsm_MyCustomApi > NewParameter].logicalEntityName
      Request parameter 'NewParameter' has type 'EntityCollection' which does not support logicalEntityName. Only Entity and EntityReference are allowed.
      Fix: Remove logicalEntityName or change the parameter type to Entity or EntityReference.

WARN  [CCDV_PARAM_NAME_RECOMMENDED_FORMAT] [ccsm_MyCustomApi > InputParam].name
      Request parameter 'InputParam' name 'InputParam' does not follow the recommended format 'ccsm_MyCustomApi.InputParam'.
      Fix: Set name to 'ccsm_MyCustomApi.InputParam'.

Summary: 1 error(s), 1 warning(s), 0 info(s)
```

**JSON output** returns a full `CcdvCommandResult` envelope:

```bash
dvc api validate --json
```

```json
{
  "schemaVersion": "1.0.0",
  "status": "validationFailed",
  "command": "api validate",
  "startedAtUtc": "2025-01-15T10:00:00.000Z",
  "finishedAtUtc": "2025-01-15T10:00:00.001Z",
  "durationMs": 1,
  "diagnostics": [
    {
      "id": "diag-0001",
      "code": "CCDV_PARAM_LOGICAL_ENTITY_NAME_NOT_ALLOWED",
      "severity": "error",
      "category": "validation",
      "message": "Request parameter 'NewParameter' has type 'EntityCollection' which does not support logicalEntityName.",
      "entityKind": "requestParameter",
      "parentUniqueName": "ccsm_MyCustomApi",
      "uniqueName": "NewParameter",
      "field": "logicalEntityName",
      "jsonPath": "$.requestParameters[?(@.uniqueName=='NewParameter')].logicalEntityName",
      "blocking": true,
      "suggestedFix": {
        "kind": "removeField",
        "field": "logicalEntityName",
        "message": "Remove logicalEntityName or change the parameter type to Entity or EntityReference."
      }
    }
  ]
}
```

**Diagnostic severity levels:**

| Severity | Meaning |
|----------|---------|
| `error` | Blocking — Dataverse will reject the payload or the value is structurally invalid. `api plan` will not proceed. |
| `warning` | Non-blocking — the definition is accepted but deviates from recommended practice (e.g. name format). |
| `info` | Informational — e.g. an open Entity type without `logicalEntityName`, which is valid but may be unintentional. |

**Validated rules include:**

- `uniqueName` required, max 128 characters, must contain publisher prefix (e.g. `ccsm_`), only letters/digits/underscores
- `name` and `displayName` required, max 100 characters
- `description` max 300 characters
- `bindingType` must be `Global`, `Entity`, or `EntityCollection`
- `boundEntityLogicalName` required when `bindingType` is `Entity` or `EntityCollection`; must be absent for `Global`
- `allowedCustomProcessingStepType` must be `None`, `AsyncOnly`, or `SyncAndAsync`
- Functions (`isFunction: true`) must have at least one response property
- Functions must not use open Entity/EntityCollection request parameters (without `logicalEntityName`)
- `logicalEntityName` only allowed on parameters/properties with type `Entity` or `EntityReference`; automatically flagged for all other types
- `name` format recommendation: `{customApiUniqueName}.{childUniqueName}`

> **Note:** `api plan` runs the same validation internally. If blocking errors are found, the plan is not created and the error message references `api validate` for the full report. Always run `api validate` first to see all diagnostics before planning.

### Compare local definition with Dataverse

Compares the local JSON file against the current Dataverse metadata and shows field-level differences.

```bash
dvc api diff
# or with explicit name:
dvc api diff -n ccsm_MyCustomApi
```

**Output:**

```text
Diff for: ccsm_MyCustomApi
Differences found: yes
Custom API: update

Request parameter summary:
  none=1, create=1, update=0, delete=0, recreate=0
- create: NewParameter

Response property summary:
  none=2, create=0, update=0, delete=0, recreate=0
```

Use `--json` for the full machine-readable diff output.

### Create sync plan

Compares local vs. Dataverse, generates an ordered operation list, and writes plan and state files. **Validation runs automatically** — if blocking errors exist, the plan is not created.

```bash
dvc api plan
# or with explicit name:
dvc api plan -n ccsm_MyCustomApi
```

**Output:**

```text
Plan created: /path/to/output/ccsm_MyCustomApi.syncplan.json
State file: /path/to/output/ccsm_MyCustomApi.syncstate.json
Operations: 2
Destructive changes required: no
- [10] createRequestParameter NewParameter (new)
- [20] updateCustomApi ccsm_MyCustomApi (changed)
```

If validation fails:

```text
Error: Sync plan blocked by 1 validation error(s). Run 'api validate' for the full report.
First error: [CCDV_PARAM_LOGICAL_ENTITY_NAME_NOT_ALLOWED] Request parameter 'NewParameter' has type 'EntityCollection' which does not support logicalEntityName.
```

### Execute a single operation

```bash
# dry run:
dvc api exec-op -o "op-0010-createRequestParameter-NewParameter-<uuid>" --simulate

# live:
dvc api exec-op -o "op-0010-createRequestParameter-NewParameter-<uuid>"
```

**Output:**

```text
Operation: op-0010-createRequestParameter-NewParameter-<uuid>
Status: succeeded
Message: createRequestParameter for NewParameter completed successfully.
Simulated: no
State file: /path/to/output/ccsm_MyCustomApi.syncstate.json
```

> **Warning:** Without `--simulate`, the operation is executed against the connected Dataverse environment.

### Execute full plan

```bash
# dry run:
dvc api exec-plan --simulate

# live:
dvc api exec-plan
```

**Output:**

```text
Plan executed for: ccsm_MyCustomApi
Status: succeeded
State file: /path/to/output/ccsm_MyCustomApi.syncstate.json
- [10] createRequestParameter NewParameter: succeeded
- [20] updateCustomApi ccsm_MyCustomApi: succeeded
```

> **Warning:** Without `--simulate`, all operations in the sync plan are executed in sequence against the connected Dataverse environment.

### Check metadata consistency

Compares the local definition with current Dataverse metadata and reports field-level mismatches. Requires a network connection.

```bash
dvc api check-metadata
```

**Output:**

```text
Metadata check for: ccsm_MyCustomApi
Status: ok
No metadata mismatches found.
```

### Validate Dataverse privileges

Checks which relevant Dataverse privileges the configured App User holds and reports which features are available or missing. Requires a network connection.

```bash
dvc api validate-privileges
# show all discovered privilege IDs:
dvc api validate-privileges --verbose
# machine-readable output:
dvc api validate-privileges --json
```

**Output:**

```text
Privilege-Validierung für: orgf707a816.crm16.dynamics.com
App-User: CCDV Custom API CLI - AppOnly (6dcbb78d-...)

FEATURE                          PRIVILEGE                           STATUS
──────────────────────────────────────────────────────────────────────────────
Custom API lesen                 prvReadCustomAPI                    ✓ Verfügbar
Custom API anlegen               prvCreateCustomAPI                  ✓ Verfügbar
Custom API bearbeiten            prvWriteCustomAPI                   ✓ Verfügbar
Custom API löschen               prvDeleteCustomAPI                  ✓ Verfügbar
PluginType-Binding               prvAppendToPluginType               ✗ Fehlt
Plugin Steps anlegen             prvCreateSdkMessageProcessingStep   ✗ Fehlt

HINWEISE:
• PluginType-Binding fehlt: Custom APIs werden ohne Plugin-Verknüpfung erstellt.
  Vergib 'prvAppendToPluginType' (AppendTo, plugintype, Org-Ebene) an die Sicherheitsrolle.
• Plugin Steps fehlen: Schrittregistrierungen können nicht automatisch angelegt werden.
  Vergib 'prvCreateSdkMessageProcessingStep' (Create, sdkmessageprocessingstep, Org-Ebene).
```

**Checked privileges:**

| Feature | Privilege | Known ID |
|---------|-----------|----------|
| Read Custom APIs | `prvReadCustomAPI` | resolved via API |
| Create Custom APIs | `prvCreateCustomAPI` | resolved via API |
| Update Custom APIs | `prvWriteCustomAPI` | resolved via API |
| Delete Custom APIs | `prvDeleteCustomAPI` | resolved via API |
| PluginType binding on create | `prvAppendToPluginType` | `574c053e-6488-4bfb-832a-cbc47aff8b32` |
| Create Plugin Steps | `prvCreateSdkMessageProcessingStep` | resolved via API |

**Graceful fallback for `prvAppendToPluginType`:**

When `createCustomApi` is executed and the App User lacks `prvAppendToPluginType`, the CLI automatically retries without the `PluginTypeId@odata.bind` field. The Custom API is created successfully but without the Plugin binding. The sync result (`exec-op`, `exec-plan`) contains a `warning` field explaining what was skipped and how to remediate:

- assign `prvAppendToPluginType` (AppendTo, plugintype, Org level) to the App User's security role, or
- link the Plugin manually in the Maker Portal after creation.

### Remove local artifacts

Removes local cached and exported files. Does not delete the Custom API from Dataverse.

```bash
dvc api remove
# or with explicit name:
dvc api remove -n ccsm_MyCustomApi
```

## Typical workflows

### 1. Setup and connect

```bash
# Create auth configuration
cp auth.devicecode.example.json auth.json
# Edit auth.json with your tenant ID and client ID

# Connect to an environment
dvc connect -u "https://your-org.crm.dynamics.com"

# Optional: verify that the App User has the required privileges
dvc api validate-privileges
```

### 2. Edit an existing Custom API

```bash
# List available APIs
dvc api list

# Set the API as active
dvc api use -n ccsm_ExistingApi

# Export the current Dataverse definition
dvc api export

# Edit the local JSON file
# e.g. add a request parameter, change a description

# Validate the local definition — fix any errors before proceeding
dvc api validate

# Review what changed vs. Dataverse
dvc api diff

# Create a sync plan (also validates internally)
dvc api plan

# Dry run first
dvc api exec-plan --simulate

# Apply after reviewing
dvc api exec-plan
```

### 3. Create a new Custom API

```bash
# Optional: check App User privileges before creating
# If prvAppendToPluginType is missing, the PluginType binding will be skipped on create
dvc api validate-privileges

# Create a new JSON catalog file manually (see structure below)
# e.g. .cache/customapis/ccsm_NewApi.json

# Set the API as active even before it exists in Dataverse
dvc api use -n ccsm_NewApi

# Validate the local definition before planning
dvc api validate

# Create a sync plan
dvc api plan

# Dry run first
dvc api exec-plan --simulate

# Apply after reviewing
dvc api exec-plan
# If the App User lacked prvAppendToPluginType, the createCustomApi result
# will contain a warning — check the output and link the Plugin manually if needed.
```

### Why validate before plan?

`api validate` is a local-only check — no network call, instant feedback. It catches issues that Dataverse would reject with a 400 error (e.g. `logicalEntityName` on an `EntityCollection` parameter, missing publisher prefix, invalid type values).

`api plan` runs the same validation internally and will block if blocking errors are found. Running `api validate` first gives you the full structured diagnostic report — including non-blocking warnings and informational hints — before attempting to build the plan.

## Custom API JSON structure

The catalog file written by `api export` and read by `api plan` / `api validate`:

```json
{
  "schemaVersion": "1.0",
  "source": {
    "exportedAtUtc": "2025-01-15T10:00:00.000Z",
    "environmentUrl": "https://your-org.crm.dynamics.com"
  },
  "customApis": [
    {
      "uniqueName": "ccsm_MyCustomApi",
      "name": "ccsm_MyCustomApi",
      "displayName": "My Custom API",
      "description": "Processes a survey recipient record.",
      "bindingType": "Global",
      "isFunction": false,
      "isPrivate": false,
      "workflowSdkStepEnabled": false,
      "allowedCustomProcessingStepType": "None",
      "requestParameters": [
        {
          "uniqueName": "RecipientId",
          "name": "ccsm_MyCustomApi.RecipientId",
          "displayName": "Recipient ID",
          "description": "ID of the recipient record.",
          "type": "EntityReference",
          "logicalEntityName": "ccsm_surveyrecipient",
          "isOptional": false
        }
      ],
      "responseProperties": [
        {
          "uniqueName": "Success",
          "name": "ccsm_MyCustomApi.Success",
          "displayName": "Success",
          "description": "Whether the operation succeeded.",
          "type": "Boolean"
        }
      ]
    }
  ]
}
```

**Field notes:**

| Field | Values / constraints |
|-------|----------------------|
| `bindingType` | `"Global"`, `"Entity"`, `"EntityCollection"` |
| `allowedCustomProcessingStepType` | `"None"`, `"AsyncOnly"`, `"SyncAndAsync"` |
| `type` (parameter/property) | `"Boolean"`, `"DateTime"`, `"Decimal"`, `"Entity"`, `"EntityCollection"`, `"EntityReference"`, `"Float"`, `"Integer"`, `"Money"`, `"Picklist"`, `"String"`, `"StringArray"`, `"Guid"` |
| `logicalEntityName` | Only set for `Entity` or `EntityReference`; must be absent for all other types |
| `name` (parameter/property) | Recommended format: `{customApiUniqueName}.{childUniqueName}` |
| `uniqueName` (Custom API) | Must include publisher prefix, e.g. `ccsm_MyApi`; only letters, digits, underscores |

## Publishing notes

The package is built from TypeScript. The repository does not need committed `dist/` files; they are generated during build and included in the published npm package.

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

For scoped public packages:

```bash
npm publish --access public
```

## Requirements

- Node.js 16+
- npm
- Access to a Dataverse environment
- Azure AD / Microsoft Entra ID App Registration with the correct permissions
- Sufficient Dataverse privileges to read or modify Custom API metadata — run `dvc api validate-privileges` after connecting to verify which privileges are available

## License

MIT

## Author and contact

Andreas Brunsmann

- Email: oss@andreasbrunsmann.de
- GitHub: https://github.com/brunsforge
- Repository: https://github.com/brunsforge/dataverse-custom-api

---

# Dataverse Custom API CLI

Eine Node.js/TypeScript-basierte CLI zum Verwalten von Dataverse Custom APIs. Sie ermöglicht das Lesen, Exportieren, Bearbeiten, **Validieren**, Vergleichen, Planen und Synchronisieren von Custom-API-Definitionen zwischen lokalen JSON-Dateien und Dataverse-Umgebungen.

## Installation

```bash
npm install -g @brunsforge/dataverse-custom-api
```

## Übersicht der Features

- **Verbindung zu Dataverse-Umgebungen**: Device Code, Client Secret, Interactive Browser
- **Environment-Management**: speichern, auflisten, wechseln, entfernen
- **Custom API-Verwaltung**:
  - vorhandene Custom APIs auflisten
  - als lokale JSON-Artefakte exportieren
  - lokal bearbeiten
  - **lokale Definition validieren** — erkennt Typfehler, fehlende Felder und ungültige Kombinationen mit strukturierten Diagnostics
  - mit Dataverse-Metadaten vergleichen
  - Sync-Pläne erstellen (Validierung läuft automatisch; Plan wird bei Fehlern blockiert)
  - einzelne Sync-Operationen ausführen
  - vollständige Sync-Pläne ausführen
  - **Privileges prüfen** — prüft welche Dataverse-Privileges der konfigurierte App-User besitzt und welche Features verfügbar oder eingeschränkt sind
- **Graceful Privilege-Fallback**: fehlt dem App-User `prvAppendToPluginType`, wird `createCustomApi` automatisch ohne das PluginType-Binding wiederholt und eine `warning` im Sync-Ergebnis eingetragen — statt mit einem Fehler abzubrechen
- **Simulationsmodus**: Operationen mit `--simulate` vorab prüfen
- **JSON und menschenlesbare Ausgaben**: alle Befehle unterstützen `--json`

> **Achtung:** Befehle, die ohne `--simulate` ausgeführt werden, können Custom-API-Metadaten in der verbundenen Dataverse-Umgebung erstellen, ändern oder löschen.

## Verbindung

```bash
dvc connect -u "https://your-org.crm.dynamics.com"
```

```text
Connected and cached: https://your-org.crm.dynamics.com
Auth mode: deviceCode
```

## Environment-Management

```bash
dvc env list       # alle gespeicherten Environments auflisten
dvc env current    # aktives Environment anzeigen
dvc env use -i <id>     # Environment wechseln
dvc env remove -i <id>  # Environment entfernen
```

## Custom API-Management

### Auflisten und auswählen

```bash
dvc api list               # alle Custom APIs auflisten
dvc api current            # aktive API anzeigen
dvc api use -n ccsm_MyApi  # API als aktiv setzen
```

### Exportieren

```bash
dvc api export
dvc api export -n ccsm_MyApi
```

### Lokale Definition validieren

Prüft die lokale JSON-Datei gegen Dataverse-Regeln. Keine Netzwerkverbindung erforderlich.

```bash
dvc api validate
dvc api validate -n ccsm_MyApi
```

**Ausgabe ohne Probleme:**

```text
Validation for: ccsm_MyApi
Status: succeeded
No issues found.
```

**Ausgabe mit Fehlern:**

```text
Validation for: ccsm_MyApi
Status: validationFailed

ERROR [CCDV_PARAM_LOGICAL_ENTITY_NAME_NOT_ALLOWED] [ccsm_MyApi > NewParameter].logicalEntityName
      Request parameter 'NewParameter' has type 'EntityCollection' which does not support logicalEntityName.
      Fix: Remove logicalEntityName or change the parameter type to Entity or EntityReference.

Summary: 1 error(s), 0 warning(s), 0 info(s)
```

Mit `--json` wird ein vollständiges `CcdvCommandResult`-Envelope zurückgegeben (für VS-Code-Extension-Integration).

**Geprüfte Regeln (Auswahl):**

- `uniqueName`: Pflichtfeld, max. 128 Zeichen, muss Publisher-Präfix enthalten (z. B. `ccsm_`), nur Buchstaben/Ziffern/Unterstriche
- `name` und `displayName`: Pflichtfeld, max. 100 Zeichen
- `description`: max. 300 Zeichen
- `bindingType`: `Global`, `Entity` oder `EntityCollection`
- `boundEntityLogicalName`: Pflicht bei `Entity`/`EntityCollection`; muss fehlen bei `Global`
- `logicalEntityName` an Parametern/Properties: nur erlaubt bei Type `Entity` oder `EntityReference`
- Functions (`isFunction: true`): mindestens eine Response Property erforderlich
- Functions: keine offenen Entity-/EntityCollection-Request-Parameter (ohne `logicalEntityName`)

> **Hinweis:** `api plan` läuft dieselbe Validierung intern ab. Bei blockierenden Fehlern wird kein Plan erstellt; die Fehlermeldung verweist auf `api validate` für den vollständigen Report.

### Vergleichen

```bash
dvc api diff
dvc api diff -n ccsm_MyApi
```

### Sync-Plan erstellen

```bash
dvc api plan
dvc api plan -n ccsm_MyApi
```

```text
Plan created: .cache/customapis/ccsm_MyApi.syncplan.json
State file: .cache/customapis/ccsm_MyApi.syncstate.json
Operations: 2
Destructive changes required: no
- [10] createRequestParameter NewParameter (new)
- [20] updateCustomApi ccsm_MyApi (changed)
```

### Ausführen

```bash
dvc api exec-plan --simulate   # Dry Run
dvc api exec-plan              # live ausführen
```

### Einzelne Operation ausführen

```bash
dvc api exec-op -o "<operationId>" --simulate
dvc api exec-op -o "<operationId>"
```

### Metadaten-Konsistenz prüfen

```bash
dvc api check-metadata
```

### Dataverse-Privileges prüfen

Prüft welche relevanten Dataverse-Privileges der konfigurierte App-User besitzt und gibt eine strukturierte Übersicht aus. Erfordert eine Netzwerkverbindung.

```bash
dvc api validate-privileges
# Alle gefundenen Privilege-IDs anzeigen:
dvc api validate-privileges --verbose
# Maschinenlesbare Ausgabe:
dvc api validate-privileges --json
```

**Ausgabe:**

```text
Privilege-Validierung für: orgf707a816.crm16.dynamics.com
App-User: CCDV Custom API CLI - AppOnly (6dcbb78d-...)

FEATURE                          PRIVILEGE                           STATUS
──────────────────────────────────────────────────────────────────────────────
Custom API lesen                 prvReadCustomAPI                    ✓ Verfügbar
Custom API anlegen               prvCreateCustomAPI                  ✓ Verfügbar
Custom API bearbeiten            prvWriteCustomAPI                   ✓ Verfügbar
Custom API löschen               prvDeleteCustomAPI                  ✓ Verfügbar
PluginType-Binding               prvAppendToPluginType               ✗ Fehlt
Plugin Steps anlegen             prvCreateSdkMessageProcessingStep   ✗ Fehlt

HINWEISE:
• PluginType-Binding fehlt: Custom APIs werden ohne Plugin-Verknüpfung erstellt.
  Vergib 'prvAppendToPluginType' (AppendTo, plugintype, Org-Ebene) an die Sicherheitsrolle.
• Plugin Steps fehlen: Schrittregistrierungen können nicht automatisch angelegt werden.
  Vergib 'prvCreateSdkMessageProcessingStep' (Create, sdkmessageprocessingstep, Org-Ebene).
```

**Geprüfte Privileges:**

| Feature | Privilege | Bekannte ID |
|---------|-----------|-------------|
| Custom API lesen | `prvReadCustomAPI` | per API aufgelöst |
| Custom API anlegen | `prvCreateCustomAPI` | per API aufgelöst |
| Custom API bearbeiten | `prvWriteCustomAPI` | per API aufgelöst |
| Custom API löschen | `prvDeleteCustomAPI` | per API aufgelöst |
| PluginType-Binding bei Create | `prvAppendToPluginType` | `574c053e-6488-4bfb-832a-cbc47aff8b32` |
| Plugin Steps anlegen | `prvCreateSdkMessageProcessingStep` | per API aufgelöst |

**Graceful Fallback für `prvAppendToPluginType`:**

Fehlt dem App-User `prvAppendToPluginType`, wiederholt die CLI `createCustomApi` automatisch ohne das `PluginTypeId@odata.bind`-Feld. Die Custom API wird erfolgreich angelegt — jedoch ohne Plugin-Verknüpfung. Das Sync-Ergebnis (`exec-op`, `exec-plan`) enthält ein `warning`-Feld mit der Erklärung und den Handlungsoptionen:

- `prvAppendToPluginType` (AppendTo, plugintype, Org-Ebene) der Sicherheitsrolle des App-Users vergeben, oder
- das Plugin nach der Erstellung manuell im Maker Portal verknüpfen.

### Lokale Artefakte entfernen

```bash
dvc api remove
dvc api remove -n ccsm_MyApi
```

## Typischer Workflow

### Verbindung herstellen und Privileges prüfen

```bash
# Auth-Konfiguration erstellen und Environment verbinden
dvc connect -u "https://your-org.crm.dynamics.com"

# Optional: Privileges des App-Users prüfen
dvc api validate-privileges
```

### Vorhandene Custom API bearbeiten

```bash
dvc api list
dvc api use -n ccsm_ExistingApi

# Aktuelle Definition aus Dataverse holen
dvc api export

# JSON-Datei lokal bearbeiten (z. B. Parameter hinzufügen)

# Lokale Definition validieren — Fehler beheben, bevor der Plan erstellt wird
dvc api validate

# Diff mit Dataverse prüfen
dvc api diff

# Sync-Plan erstellen (validiert intern)
dvc api plan

# Dry Run
dvc api exec-plan --simulate

# Live ausführen nach Prüfung
dvc api exec-plan
```

### Neue Custom API erstellen

```bash
# Optional: Privileges prüfen — fehlt prvAppendToPluginType, wird das
# PluginType-Binding beim Erstellen automatisch weggelassen (+ Warning im Ergebnis)
dvc api validate-privileges

# Neue JSON-Katalog-Datei erstellen (siehe Struktur unten)
# z. B. .cache/customapis/ccsm_NewApi.json

dvc api use -n ccsm_NewApi

# Lokale Definition validieren, bevor der Plan erstellt wird
dvc api validate

# Sync-Plan erstellen
dvc api plan

# Dry Run
dvc api exec-plan --simulate

# Live ausführen
dvc api exec-plan
# Falls prvAppendToPluginType fehlte: das Ergebnis enthält eine warning —
# Plugin anschließend manuell im Maker Portal verknüpfen.
```

### Warum vor dem Plan validieren?

`api validate` ist ein rein lokaler Check — keine Netzwerkverbindung, sofortiges Feedback. Es erkennt alle Probleme, die Dataverse mit einem 400-Fehler ablehnen würde, sowie Warnungen und Hinweise zu empfohlenen Formaten.

`api plan` läuft dieselbe Validierung intern ab und blockiert bei blockierenden Fehlern. Mit `api validate` vorab erhältst du den vollständigen strukturierten Report — inklusive Warnungen und Infos — bevor du versuchst, einen Plan zu erstellen.

## JSON-Struktur der Custom API

```json
{
  "schemaVersion": "1.0",
  "source": {
    "exportedAtUtc": "2025-01-15T10:00:00.000Z",
    "environmentUrl": "https://your-org.crm.dynamics.com"
  },
  "customApis": [
    {
      "uniqueName": "ccsm_MyCustomApi",
      "name": "ccsm_MyCustomApi",
      "displayName": "My Custom API",
      "description": "Processes a survey recipient record.",
      "bindingType": "Global",
      "isFunction": false,
      "isPrivate": false,
      "workflowSdkStepEnabled": false,
      "allowedCustomProcessingStepType": "None",
      "requestParameters": [
        {
          "uniqueName": "RecipientId",
          "name": "ccsm_MyCustomApi.RecipientId",
          "displayName": "Recipient ID",
          "description": "ID of the recipient record.",
          "type": "EntityReference",
          "logicalEntityName": "ccsm_surveyrecipient",
          "isOptional": false
        }
      ],
      "responseProperties": [
        {
          "uniqueName": "Success",
          "name": "ccsm_MyCustomApi.Success",
          "displayName": "Success",
          "description": "Whether the operation succeeded.",
          "type": "Boolean"
        }
      ]
    }
  ]
}
```

## Voraussetzungen

- Node.js 16+
- npm
- Zugriff auf eine Dataverse-Umgebung
- Korrekte Azure AD / Microsoft Entra ID App Registration
- Ausreichende Dataverse-Berechtigungen — nach dem Verbinden mit `dvc api validate-privileges` prüfen, welche Privileges verfügbar sind

## Lizenz

MIT

## Autor und Kontakt

Andreas Brunsmann

- E-Mail: oss@andreasbrunsmann.de
- GitHub: https://github.com/brunsforge
- Repository: https://github.com/brunsforge/dataverse-custom-api
