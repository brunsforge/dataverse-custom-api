param(
    [Parameter(Mandatory = $true)]
    [string]$OrgUrl,

    [string]$ApiName = "ccsm_ReorderSurveyStructureItem"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "=== CCDV Custom API CLI | App-only Test (clientSecret) ===" -ForegroundColor Cyan
Write-Host "ScriptDir:   $ScriptDir"
Write-Host "ProjectRoot: $ProjectRoot"

if (-not (Test-Path (Join-Path $ProjectRoot "auth.clientsecret.json"))) {
    throw "Datei '$ProjectRoot\auth.clientsecret.json' wurde nicht gefunden."
}

Copy-Item `
(Join-Path $ProjectRoot "auth.clientsecret.json") `
(Join-Path $ProjectRoot "auth.json") `
    -Force

Write-Host "auth.clientsecret.json -> auth.json kopiert" -ForegroundColor Yellow

Push-Location $ProjectRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build fehlgeschlagen."
    }

    node .\dist\cli\index.js connect --url $OrgUrl
    if ($LASTEXITCODE -ne 0) {
        throw "connect fehlgeschlagen."
    }

    node .\dist\cli\index.js list
    if ($LASTEXITCODE -ne 0) {
        throw "list fehlgeschlagen."
    }
    Write-Host "Verwende ApiName: $ApiName" -ForegroundColor Yellow
    node .\dist\cli\index.js export --name $ApiName
    if ($LASTEXITCODE -ne 0) {
        throw "export fehlgeschlagen."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "App-only-Test erfolgreich abgeschlossen." -ForegroundColor Green
Write-Host "Erwartete Dateien:" -ForegroundColor Green
Write-Host " - $ProjectRoot\.cache\environment.json"
Write-Host " - $ProjectRoot\.cache\customapis\$ApiName.json"