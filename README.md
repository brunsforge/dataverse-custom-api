# CCDV Custom API CLI

Eine Node.js/TypeScript-basierte CLI zum Verwalten von Dataverse Custom APIs. Ermöglicht das Lesen, Exportieren, Bearbeiten und Synchronisieren von Custom APIs zwischen lokalen JSON-Dateien und Dataverse-Umgebungen.

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

- **Verbindung zu Dataverse-Umgebungen**: Mehrere Authentifizierungsmethoden (Device Code, Client Secret, Interactive Browser)
- **Environment-Management**: Speichern und Wechseln zwischen verschiedenen Dataverse-Umgebungen
- **Custom API-Verwaltung**:
  - Auflisten vorhandener Custom APIs
  - Exportieren als lokale JSON-Dateien
  - Lokale Bearbeitung der JSON-Definitionen
  - Synchronisation zurück zu Dataverse (Create, Update, Delete)
  - Diff- und Plan-Funktionen für sichere Änderungen
- **JSON- und menschenlesbare Ausgaben**: Alle Befehle unterstützen `--json` für maschinelle Verarbeitung

## Authentifizierung und Verbindung

### Authentifizierungsmethoden

Die CLI unterstützt drei Authentifizierungsmethoden:

1. **Device Code Flow** (empfohlen für interaktive Nutzung)
2. **Client Secret** (für automatisierte Skripte/App-Only-Zugriff)
3. **Interactive Browser** (für Benutzer mit Browser-Zugriff)

#### Konfiguration

Erstelle eine `auth.json` im Projektroot basierend auf den Beispiel-Dateien:

- `auth.devicecode.example.json` → Für Device Code Auth
- `auth.clientsecret.example.json` → Für Client Secret Auth
- `auth.interactivebrowser.example.json` → Für Interactive Browser Auth

##### Device Code Auth

```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "authMode": "deviceCode"
}
```

**App Registration Setup:**
- Erstelle eine App Registration in Azure AD
- Füge die folgenden API-Berechtigungen hinzu:
  - Dynamics CRM > user_impersonation
- Setze die Redirect URI auf: `https://login.microsoftonline.com/common/oauth2/nativeclient`
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
- Erstelle eine App Registration in Azure AD
- Erstelle ein Client Secret
- Füge die folgenden API-Berechtigungen hinzu:
  - Dynamics CRM > user_impersonation (für User-Context) ODER
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
- Ähnlich wie Device Code, aber für Browser-basierte Authentifizierung

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

ISC

## Autor

Andreas Brunsmann