# CCDV Custom API CLI

Node-/TypeScript-basierte CLI zum Lesen, Cachen und Exportieren von Dataverse Custom APIs.

Der aktuelle Fokus liegt auf einer schlanken CLI. Die Architektur ist so angelegt, dass dieselben Kernmodule später auch von einer VS-Code-Extension genutzt werden können.

---

## Aktueller Funktionsumfang

Der aktuelle Stand unterstützt vor allem die ersten Basis-Workflows:

* Verbindung zu einem Dataverse-Environment herstellen
* die aktive Umgebung lokal cachen
* Custom APIs aus dem aktuell verbundenen Environment auflisten
* eine Custom API als aktive API markieren
* eine Custom API als JSON-Datei lokal exportieren

Noch nicht enthalten sind zum Beispiel:

* Import / Upsert zurück nach Dataverse
* Diff zwischen lokalem JSON und Dataverse
* Bearbeitung von Solution-Komponenten
* vollständige PluginType-/Metadata-Auflösung

---

## Projektidee

Das Tool verwaltet primär Dataverse-Metadaten rund um:

* `customapi`
* `customapirequestparameter`
* `customapiresponseproperty`

Es geht **nicht** darum, Plugin Assemblies zu deployen. Es wird davon ausgegangen, dass die Assemblies und Plugin Types im Ziel-Environment bereits vorhanden sind.

---

## Verzeichnisstruktur

Beispielhafte Struktur des Projekts:

```text
CCDVCustomAPI/
├─ src/
│  ├─ api/
│  │  ├─ customApiRepository.ts
│  │  └─ dataverseClient.ts
│  ├─ auth/
│  │  ├─ authConfig.ts
│  │  └─ tokenProvider.ts
│  ├─ cli/
│  │  ├─ index.ts
│  │  └─ commands/
│  │     ├─ connect.ts
│  │     ├─ export.ts
│  │     ├─ list.ts
│  │     └─ select.ts
│  ├─ config/
│  │  └─ loadConfig.ts
│  ├─ models/
│  │  ├─ appConfig.ts
│  │  ├─ configModels.ts
│  │  └─ customApiModels.ts
│  └─ utils/
│     ├─ fileSystem.ts
│     └─ paths.ts
├─ config.json
├─ auth.json
├─ package.json
├─ tsconfig.json
└─ .gitignore
```

Nach der ersten Benutzung entstehen zusätzlich Cache-Dateien, typischerweise unterhalb von `.cache/`.

---

## Voraussetzungen

* Node.js
* npm
* TypeScript-Projekt mit ESM-Setup
* `package.json` mit `"type": "module"`
* gültige Azure AD / Dataverse-Authentifizierung
* Zugriff auf das Ziel-Environment

Installierte Kernpakete im aktuellen Stand:

* `@azure/identity`
* `axios`
* `typescript`

Empfohlen für die CLI:

* `commander`
* `@types/node`

---

## Wichtige Konfigurationsdateien

### `config.json`

Diese Datei enthält die **statische Projektkonfiguration** für die CLI.

Beispiel:

```json
{
  "mode": "dev",
  "cachePath": ".cache",
  "customApiOutputPath": ".cache/customapis"
}
```

#### Bedeutung der Felder

* `mode`
  Freie Kennzeichnung des Modus, aktuell eher informativ.

* `cachePath`
  Basisordner für den Laufzeit-Cache der CLI.

* `customApiOutputPath`
  Zielordner für exportierte Custom API JSON-Dateien.

### `auth.json`

Diese Datei enthält die Authentifizierungsdaten bzw. die für die Token-Beschaffung nötigen Angaben.

Beispiel:

```json
{
  "tenantId": "<tenant-guid>",
  "clientId": "<app-registration-client-id>",
  "authMode": "deviceCode"
}
```

Typische `authMode`-Werte:

* `deviceCode`
* `interactiveBrowser`
* `clientSecret`

---

## Cache-Dateien und ihre Bedeutung

Die CLI erzeugt und verwendet lokale Cache-Dateien.

### `environment.json`

Standardpfad:

```text
.cache/environment.json
```

Diese Datei beschreibt das aktuell aktive Dataverse-Environment, mit dem die CLI arbeiten soll.

Beispiel:

```json
{
  "environmentUrl": "https://orgf707a816.crm16.dynamics.com",
  "authMode": "deviceCode",
  "savedAtUtc": "2026-04-18T12:00:00.000Z"
}
```

Optional können auch `tenantId` und `clientId` enthalten sein.

Diese Datei wird aktuell durch den Befehl **`connect`** geschrieben.

### `active-api.json`

Standardpfad:

```text
.cache/active-api.json
```

Diese Datei speichert den Unique Name der aktuell ausgewählten Custom API.

Beispiel:

```json
{
  "uniqueName": "ccsm_ReorderSurveyStructureItem",
  "savedAtUtc": "2026-04-18T12:05:00.000Z"
}
```

Diese Datei wird aktuell durch den Befehl **`select`** geschrieben.

### Exportierte API-Dateien

Standardpfad laut Beispielkonfiguration:

```text
.cache/customapis/
```

Dort legt der Befehl **`export`** pro API eine JSON-Datei ab, zum Beispiel:

```text
.cache/customapis/ccsm_ReorderSurveyStructureItem.json
```

---

## Build und Start

### Build

```bash
npm run build
```

Dadurch wird TypeScript nach `dist/` kompiliert.

### CLI direkt starten

```bash
node dist/cli/index.js --help
```

Wenn der `bin`-Eintrag in `package.json` korrekt gesetzt ist und das Paket global oder lokal verlinkt wurde, kann die CLI später auch direkt über den Bin-Namen gestartet werden, zum Beispiel:

```bash
ccsm --help
```

---

## Unterstützte Befehle im aktuellen Stand

### 1. `connect`

Stellt die Verbindung zu einem Dataverse-Environment her und schreibt den Environment-Kontext in den Cache.

Beispiel:

```bash
node dist/cli/index.js connect --url https://orgf707a816.crm16.dynamics.com
```

#### Was der Befehl macht

1. Liest `auth.json`
2. Baut mit `@azure/identity` ein Credential auf
3. Fordert ein Access Token für das angegebene Dataverse-Environment an
4. Führt einen Testzugriff gegen Dataverse aus, aktuell über `WhoAmI()`
5. Legt die Cache-Verzeichnisse an
6. Schreibt `environment.json`

#### Was der Befehl liest

* `auth.json`
* `config.json`

#### Was der Befehl schreibt

* `<cachePath>/environment.json`

Bei der Beispielkonfiguration also:

```text
.cache/environment.json
```

#### Was der Befehl nicht schreibt

* keine aktive API
* keine exportierte API-Datei

---

### 2. `list`

Listet die verfügbaren Custom APIs aus dem aktuell aktiven Environment auf.

Beispiel:

```bash
node dist/cli/index.js list
```

#### Voraussetzung

Vorher muss `connect` erfolgreich ausgeführt worden sein, damit `environment.json` vorhanden ist.

#### Was der Befehl macht

1. Liest den aktiven Environment-Kontext aus `environment.json`
2. Baut einen Dataverse-Client für dieses Environment auf
3. Liest die `customapi`-Datensätze aus Dataverse
4. Gibt die gefundenen `uniqueName`-Werte in der Konsole aus

#### Was der Befehl liest

* `config.json`
* `<cachePath>/environment.json`
* `auth.json` indirekt, weil zur Dataverse-Anfrage wieder ein Token beschafft wird

#### Was der Befehl schreibt

* aktuell nichts

---

### 3. `select`

Setzt eine bestimmte Custom API als aktive API für Folgeoperationen.

Beispiel:

```bash
node dist/cli/index.js select --name ccsm_ReorderSurveyStructureItem
```

#### Was der Befehl macht

1. Legt die Cache-Verzeichnisse an
2. Schreibt den angegebenen Unique Name in `active-api.json`

#### Was der Befehl liest

* `config.json`

#### Was der Befehl schreibt

* `<cachePath>/active-api.json`

Bei der Beispielkonfiguration also:

```text
.cache/active-api.json
```

#### Wichtiger Hinweis

`select` prüft im aktuellen Stand noch nicht gegen Dataverse, ob die angegebene API tatsächlich existiert. Es wird nur der Name lokal als aktive API gespeichert.

---

### 4. `export`

Exportiert eine Custom API als lokale JSON-Datei.

Beispiel mit explizitem Namen:

```bash
node dist/cli/index.js export --name ccsm_ReorderSurveyStructureItem
```

Beispiel mit zuvor gesetzter aktiver API:

```bash
node dist/cli/index.js export
```

#### Ablauf bei `export --name ...`

1. Liest `environment.json`
2. Baut einen Dataverse-Client auf
3. Liest die gewünschte Custom API über ihren `uniqueName`
4. Liest zugehörige Request Parameters
5. Liest zugehörige Response Properties
6. Baut daraus das lokale JSON-Modell
7. Schreibt die JSON-Datei in den Output-Ordner

#### Ablauf bei `export` ohne `--name`

1. Liest `environment.json`
2. Liest `active-api.json`
3. Verwendet den dort hinterlegten `uniqueName`
4. Führt danach denselben Export wie oben aus

#### Was der Befehl liest

* `config.json`
* `<cachePath>/environment.json`
* optional `<cachePath>/active-api.json`
* `auth.json` indirekt für Token/Zugriff

#### Was der Befehl schreibt

* `<customApiOutputPath>/<uniqueName>.json`

Bei der Beispielkonfiguration also zum Beispiel:

```text
.cache/customapis/ccsm_ReorderSurveyStructureItem.json
```

---

## Typischer Ablauf im Alltag

### Erstverbindung herstellen

```bash
node dist/cli/index.js connect --url https://orgf707a816.crm16.dynamics.com
```

Ergebnis:

* `.cache/` wird angelegt
* `.cache/customapis/` wird angelegt
* `.cache/environment.json` wird geschrieben

### Verfügbare APIs ansehen

```bash
node dist/cli/index.js list
```

Ergebnis:

* liest `.cache/environment.json`
* schreibt nichts

### Eine API als aktiv markieren

```bash
node dist/cli/index.js select --name ccsm_ReorderSurveyStructureItem
```

Ergebnis:

* schreibt `.cache/active-api.json`

### Die aktive API exportieren

```bash
node dist/cli/index.js export
```

Ergebnis:

* liest `.cache/environment.json`
* liest `.cache/active-api.json`
* schreibt `.cache/customapis/ccsm_ReorderSurveyStructureItem.json`

---

## Beispiel für exportiertes JSON

Ein Export kann aktuell ungefähr so aussehen:

```json
{
  "customApis": [
    {
      "uniqueName": "ccsm_ReorderSurveyStructureItem",
      "displayName": "Survey Maker | ReorderSurveyStructureItem",
      "name": "Survey Maker | ReorderSurveyStructureItem",
      "description": "Reorders survey structure items by TargetId, ItemType and Direction.",
      "bindingType": "Global",
      "pluginTypeName": "CcSurveyMaker.Plugins.CustomApi.Survey.ReorderSurveyStructureItemApi",
      "isFunction": false,
      "isPrivate": false,
      "workflowSdkStepEnabled": false,
      "allowedCustomProcessingStepType": "None",
      "requestParameters": [
        {
          "uniqueName": "TargetId",
          "type": "Guid",
          "isOptional": false
        },
        {
          "uniqueName": "ItemType",
          "type": "String",
          "isOptional": false
        },
        {
          "uniqueName": "Direction",
          "type": "String",
          "isOptional": false
        }
      ],
      "responseProperties": [
        {
          "uniqueName": "Success",
          "type": "Boolean"
        },
        {
          "uniqueName": "ResultJson",
          "type": "String"
        }
      ]
    }
  ]
}
```

---

## Interne Zuständigkeiten der Module

### `src/cli/commands/*`

Die einzelnen Commands kapseln die Bedienlogik der CLI.

* `connect.ts`
  Verbindung testen und Environment-Cache schreiben

* `list.ts`
  APIs aus Dataverse lesen und ausgeben

* `select.ts`
  aktive API lokal festlegen

* `export.ts`
  API-Metadaten aus Dataverse lesen und als JSON exportieren

### `src/api/dataverseClient.ts`

Stellt den HTTP-Client für Dataverse bereit und kümmert sich um allgemeine Aufrufe wie `WhoAmI()`.

### `src/api/customApiRepository.ts`

Enthält die eigentliche Logik zum Lesen der Dataverse-Metadaten für:

* `customapi`
* `customapirequestparameter`
* `customapiresponseproperty`

### `src/auth/*`

Lädt Auth-Konfiguration und erzeugt Credentials bzw. Access Tokens.

### `src/utils/paths.ts`

Leitet Pfade aus `config.json` ab, zum Beispiel:

* Cache-Root
* Pfad zu `environment.json`
* Pfad zu `active-api.json`
* Export-Ordner für JSON-Dateien

### `src/utils/fileSystem.ts`

Stellt File-System-Helfer bereit, z. B.:

* Cache-Ordner anlegen
* JSON lesen
* JSON schreiben
* Datei-Existenz prüfen

---

## Aktueller Dateifluss je Command

### `connect`

**liest:**

* `config.json`
* `auth.json`

**schreibt:**

* `<cachePath>/environment.json`

### `list`

**liest:**

* `config.json`
* `<cachePath>/environment.json`
* `auth.json` indirekt

**schreibt:**

* nichts

### `select`

**liest:**

* `config.json`

**schreibt:**

* `<cachePath>/active-api.json`

### `export --name <uniqueName>`

**liest:**

* `config.json`
* `<cachePath>/environment.json`
* `auth.json` indirekt

**schreibt:**

* `<customApiOutputPath>/<uniqueName>.json`

### `export` ohne `--name`

**liest:**

* `config.json`
* `<cachePath>/environment.json`
* `<cachePath>/active-api.json`
* `auth.json` indirekt

**schreibt:**

* `<customApiOutputPath>/<uniqueName>.json`

---

## Bekannte Einschränkungen im aktuellen Stand

* `select` validiert die API noch nicht gegen Dataverse
* Export liest noch keine Solution-Zuordnung aus
* Plugin Type wird noch nicht vollständig robust aufgelöst
* es gibt noch kein `diff`-Kommando
* es gibt noch kein `upsert`-Kommando
* Fehlerbehandlung und Benutzerführung können noch weiter verbessert werden

---

## Empfohlene nächste Schritte

Sobald die Basis stabil läuft, sind die nächsten sinnvollen Ausbaustufen:

1. `status`-Kommando
   Zeigt aktuelles Environment, aktive API und Pfade an.

2. `export --all`
   Exportiert alle Custom APIs des verbundenen Environments.

3. `diff`
   Vergleicht lokales JSON mit Dataverse-Metadaten.

4. `upsert`
   Schreibt geänderte lokale Definitionen zurück nach Dataverse.

5. robustere Typ- und PluginType-Auflösung
   Für vollständigere und belastbarere Metadatenmodelle.

---

## Kurzfassung für die tägliche Nutzung

```bash
npm run build
node dist/cli/index.js connect --url https://orgf707a816.crm16.dynamics.com
node dist/cli/index.js list
node dist/cli/index.js select --name ccsm_ReorderSurveyStructureItem
node dist/cli/index.js export
```

Danach findest du typischerweise:

```text
.cache/
├─ environment.json
├─ active-api.json
└─ customapis/
   └─ ccsm_ReorderSurveyStructureItem.json
```

---

## Hinweis zur Architektur

Die CLI ist bewusst nur die erste Bedienoberfläche. Authentifizierung, Dataverse-Zugriff, Pfadlogik, JSON-Modell und spätere Diff-/Upsert-Logik sollen so modular bleiben, dass darauf später eine VS-Code-Extension mit Sidebar oder Webview aufsetzen kann.

# Authentifizierung für die CCDV Custom API CLI

Diese CLI soll zwei Authentifizierungsarten unterstützen:

1. `deviceCode` oder `interactiveBrowser`  
   Für interaktives lokales Arbeiten als Benutzer.

2. `clientSecret`  
   Für app-basierten Zugriff ohne Benutzer, passend zu einem Dataverse Application User.

Wichtig ist die Trennung:

- **Delegated Flow** (`deviceCode`, `interactiveBrowser`):  
  Es meldet sich ein Benutzer an. Dafür braucht die App Registration typischerweise eine **Delegated Permission** für Dataverse, meist `user_impersonation`, und der angemeldete Benutzer muss im Environment die nötigen Rechte haben. :contentReference[oaicite:1]{index=1}

- **App-only Flow** (`clientSecret`):  
  Es meldet sich kein Benutzer an, sondern die App selbst. Dafür braucht die App Registration ein Secret oder Zertifikat, und im Dataverse-Environment muss ein **Application User** für diese App existieren, dem eine Sicherheitsrolle zugewiesen ist, z. B. System Administrator. :contentReference[oaicite:2]{index=2}

---

## Zielbild

Wir richten **zwei getrennte App Registrations** ein:

- `CCDV Custom API CLI - Delegated`
- `CCDV Custom API CLI - AppOnly`

So lassen sich beide Modi getrennt testen und sauber vergleichen.

---

# 1. App Registration für `deviceCode` / `interactiveBrowser`

## Schritt 1: Neue App Registration anlegen

Im Microsoft Entra Admin Center:

- **Applications**
- **App registrations**
- **New registration**

Empfohlener Name:

- `CCDV Custom API CLI - Delegated`

Die Dataverse-Doku beschreibt das allgemeine Registrieren einer App für Dataverse-Zugriff. :contentReference[oaicite:3]{index=3}

Nach dem Anlegen notieren:

- **Application (client) ID**
- **Directory (tenant) ID** :contentReference[oaicite:4]{index=4}

---

## Schritt 2: Public Client Flow erlauben

Für Device Code und Desktop-/CLI-Szenarien muss die App als Public Client nutzbar sein. Device Code ist ein unterstützter User-Flow der Microsoft Identity Platform. :contentReference[oaicite:5]{index=5}

In der App Registration:

- **Authentication**
- unter **Advanced settings**
- **Allow public client flows** auf **Yes**

Das ist insbesondere für `deviceCode` relevant. :contentReference[oaicite:6]{index=6}

---

## Schritt 3: Dataverse API Permission hinzufügen

In der App Registration:

- **API permissions**
- **Add a permission**
- **APIs my organization uses**
- nach **Dataverse** suchen
- **Delegated permissions**
- **user_impersonation** auswählen
- **Add permissions**

Microsoft beschreibt für Dataverse-Tests genau diesen delegated permission Schritt. :contentReference[oaicite:7]{index=7}

Danach:

- **Grant admin consent**

Ohne Consent scheitern delegated Flows oft trotz korrekt angelegter Berechtigung. :contentReference[oaicite:8]{index=8}

---

## Schritt 4: Sicherstellen, dass der Benutzer im Environment Rechte hat

Da `deviceCode` und `interactiveBrowser` im delegated Modus laufen, zählen im Ergebnis die Rechte des angemeldeten Benutzers. Application User sind dafür nicht der maßgebliche Faktor. Das ist der zentrale Unterschied zwischen delegated und application permissions. :contentReference[oaicite:9]{index=9}

Der Benutzer, mit dem du dich anmeldest, sollte also im Dataverse-Environment mindestens ausreichende Rechte haben, idealerweise vorübergehend System Administrator zum Testen.

---

## Schritt 5: `auth.devicecode.json` anlegen

Beispieldatei:

```json
{
  "tenantId": "<TENANT_ID>",
  "clientId": "<CLIENT_ID_DELEGATED_APP>",
  "authMode": "deviceCode"
}