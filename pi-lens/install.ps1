# pi-codex-kit — pi-lens standalone installer (Windows)
#
# Installs pi-lens@3.8.71 as a SELF-CONTAINED npm package under
# ~/.codex/vendor/pi-lens (no linkage to ~/.pi). Adds typescript-language-server
# so TS diagnostics work through the MCP server.
#
# Usage: powershell -ExecutionPolicy Bypass -File .\pi-lens\install.ps1
$ErrorActionPreference = 'Stop'

$PinVersion = '3.8.71'
$VendorRoot = Join-Path $HOME '.codex\vendor\pi-lens'
$ServerJs   = Join-Path $VendorRoot 'node_modules\pi-lens\dist\mcp\server.js'

Write-Output "pi-lens vendor root: $VendorRoot"

# 1. Node check
try { $nodeVer = (& node --version 2>&1) } catch { $nodeVer = $null }
if (-not $nodeVer) { throw "node not found on PATH. Install Node.js and re-run." }
Write-Output "node: $nodeVer"

# 2. Install (skip if server already present and smoke-tested)
if (Test-Path $ServerJs) {
    Write-Output "pi-lens already installed at $ServerJs — skipping npm install."
} else {
    New-Item -ItemType Directory -Force -Path $VendorRoot | Out-Null
    Push-Location $VendorRoot
    try {
        if (-not (Test-Path 'package.json')) { npm init -y | Out-Null }
        Write-Output "Installing pi-lens@$PinVersion + typescript-language-server (--omit=peer)..."
        npm install --omit=peer --no-audit --no-fund "pi-lens@$PinVersion" 'typescript-language-server@^5.1.3'
    } finally {
        Pop-Location
    }
    if (-not (Test-Path $ServerJs)) { throw "install finished but server.js missing: $ServerJs" }
}

# 3. Smoke test
$KitRoot  = Split-Path -Parent $PSScriptRoot
$SmokeJs  = Join-Path $KitRoot 'scripts\mcp-smoke.mjs'
Write-Output "Smoke-testing MCP server..."
& node $SmokeJs $ServerJs
if ($LASTEXITCODE -ne 0) { throw "pi-lens MCP smoke test failed." }

Write-Output "pi-lens ready: $ServerJs"
