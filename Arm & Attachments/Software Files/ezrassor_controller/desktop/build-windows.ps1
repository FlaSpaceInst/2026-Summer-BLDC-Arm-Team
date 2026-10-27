# Builds the Expo app as a standalone Windows Electron app.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest
$ProjectRoot = Split-Path $PSScriptRoot -Parent
$ExportDir = Join-Path $ProjectRoot 'web-build'
$DesktopExportDir = Join-Path $PSScriptRoot 'web-build'

function Invoke-Step([string]$Program, [string[]]$Arguments) {
    Write-Host "`n> $Program $($Arguments -join ' ')" -ForegroundColor Cyan
    & $Program @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed ($LASTEXITCODE): $Program $($Arguments -join ' ')"
    }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js is missing. Install Node.js 22 LTS and reopen PowerShell.'
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'npm is missing. Install Node.js 22 LTS and reopen PowerShell.'
}

Push-Location $ProjectRoot
try {
    Write-Host 'Installing original Expo controller dependencies...' -ForegroundColor Cyan
    Invoke-Step 'npm.cmd' @('install', '--legacy-peer-deps', '--no-audit', '--no-fund')
    if (Test-Path $ExportDir) {
        Remove-Item -LiteralPath $ExportDir -Recurse -Force
    }
    Write-Host 'Exporting original UI for production web...' -ForegroundColor Cyan
    # Call the local Expo CLI directly instead of the Windows .cmd shim.
    # The repository path contains an ampersand, which can confuse cmd.exe shims.
    $ExpoCli = Join-Path $ProjectRoot 'node_modules\expo\bin\cli'
    if (-not (Test-Path -LiteralPath $ExpoCli)) {
        throw "Local Expo CLI missing: $ExpoCli. Run npm install first."
    }
    Invoke-Step 'node.exe' @($ExpoCli, 'export:web')

    if (-not (Test-Path (Join-Path $ExportDir 'index.html'))) {
        $Alternative = Join-Path $ProjectRoot 'dist'
        if (Test-Path (Join-Path $Alternative 'index.html')) {
            $ExportDir = $Alternative
        } else {
            throw 'Expo did not generate web-build/index.html or dist/index.html. Check Expo output above.'
        }
    }
    if (Test-Path $DesktopExportDir) {
        Remove-Item -LiteralPath $DesktopExportDir -Recurse -Force
    }
    New-Item -ItemType Directory -Path $DesktopExportDir | Out-Null
    Copy-Item -Path (Join-Path $ExportDir '*') -Destination $DesktopExportDir -Recurse -Force

    Push-Location $PSScriptRoot
    try {
        Write-Host 'Installing Electron packaging dependencies...' -ForegroundColor Cyan
        Invoke-Step 'npm.cmd' @('install', '--no-audit', '--no-fund')
        Invoke-Step 'npm.cmd' @('test')
        Write-Host 'Building Windows setup and portable executables...' -ForegroundColor Cyan
        Invoke-Step 'npm.cmd' @('run', 'package:win')
    } finally {
        Pop-Location
    }

    $ReleasePath = Join-Path $ProjectRoot 'release'
    Write-Host "`nBuild output: $ReleasePath" -ForegroundColor Green
    Get-ChildItem -Path $ReleasePath -Filter '*.exe' | Select-Object Name, Length
} finally {
    Pop-Location
}
