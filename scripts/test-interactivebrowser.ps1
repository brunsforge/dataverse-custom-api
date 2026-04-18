param(
    [Parameter(Mandatory = $true)]
    [string]$OrgUrl,

    [string]$ApiName = "ccsm_ReorderSurveyStructureItem"
)

$ErrorActionPreference = "Stop"

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "=== CCDV Custom API CLI | Delegated Test (interactiveBrowser) ===" -ForegroundColor Cyan
Write-Host "ScriptDir:   $ScriptDir"
Write-Host "ProjectRoot: $ProjectRoot"

$SourceAuthFile = Join-Path $ProjectRoot "auth.interactivebrowser.json"
$TargetAuthFile = Join-Path $ProjectRoot "auth.json"

if (-not (Test-Path $SourceAuthFile)) {
    throw "Datei '$SourceAuthFile' wurde nicht gefunden."
}

Copy-Item $SourceAuthFile $TargetAuthFile -Force
Write-Host "auth.interactivebrowser.json -> auth.json kopiert" -ForegroundColor Yellow

Push-Location $ProjectRoot
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build fehlgeschlagen."
    }

    Write-Host "Führe connect aus..." -ForegroundColor Yellow
    node .\dist\cli\index.js connect --url $OrgUrl
    if ($LASTEXITCODE -ne 0) {
        throw "connect fehlgeschlagen. Die CLI hat bereits technische Details ausgegeben."
    }

    Write-Host "Führe list aus..." -ForegroundColor Yellow
    node .\dist\cli\index.js list
    if ($LASTEXITCODE -ne 0) {
        throw "list fehlgeschlagen. Die CLI hat bereits technische Details ausgegeben."
    }

    # Optional später aktivierbar:
    Write-Host "Führe select aus..." -ForegroundColor Yellow
    node .\dist\cli\index.js select --name $ApiName
    if ($LASTEXITCODE -ne 0) {
        throw "select fehlgeschlagen. Die CLI hat bereits technische Details ausgegeben."
    }

    Write-Host "Führe export aus..." -ForegroundColor Yellow
    node .\dist\cli\index.js export
    if ($LASTEXITCODE -ne 0) {
        throw "export fehlgeschlagen. Die CLI hat bereits technische Details ausgegeben."
    }
}
finally {
    Pop-Location
}

Write-Host ""
Write-Host "InteractiveBrowser-Test erfolgreich abgeschlossen." -ForegroundColor Green
Write-Host "Erwartete Dateien:" -ForegroundColor Green
Write-Host " - $ProjectRoot\.cache\environment.json"