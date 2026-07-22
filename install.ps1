# pi-codex-kit - Windows orchestrator
#
# Applies the kit to this machine. ADDITIVE and idempotent per the AGENT
# CONTRACT in README.md. Phases that touch ~/.codex and ~/.cc-switch are
# individually skippable.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File .\install.ps1
#   powershell -ExecutionPolicy Bypass -File .\install.ps1 -SkipMcp -SkipHooks
#
# Switches: -SkipPilens -SkipMcp -SkipHooks -SkipSkills -ForceSkills
param(
  [switch]$SkipPilens,
  [switch]$SkipMcp,
  [switch]$SkipHooks,
  [switch]$SkipSkills,
  [switch]$ForceSkills
)
$ErrorActionPreference = 'Stop'

$KitRoot    = $PSScriptRoot
$CodexDir   = Join-Path $HOME '.codex'
$ConfigToml = Join-Path $CodexDir 'config.toml'
$HooksDir   = Join-Path $CodexDir 'hooks'
$HooksJson  = Join-Path $CodexDir 'hooks.json'
$VendorRoot = Join-Path $CodexDir 'vendor\pi-lens'
$ServerJs   = Join-Path $VendorRoot 'node_modules\pi-lens\dist\mcp\server.js'
$CcSkills   = Join-Path $HOME '.cc-switch\skills'

function ToForwardSlash([string]$p) { return $p -replace '\\', '/' }

Write-Output "=== pi-codex-kit install (Windows) ==="
Write-Output "kit: $KitRoot"

# ---- Phase 0: pre-flight -------------------------------------------------
try { $nv = (& node --version 2>&1) } catch { $nv = $null }
if (-not $nv) { throw "node not found on PATH." }
Write-Output "node: $nv"
try { $gv = (& git --version 2>&1) } catch { $gv = $null }
if (-not $gv) { Write-Warning "git not found (needed for the simplify skill)." } else { Write-Output "$gv" }

$rtk = $null
foreach ($cand in @('rtk.exe', (Join-Path $HOME '.local\bin\rtk.exe'))) {
  $cmd = Get-Command $cand -ErrorAction SilentlyContinue
  if ($cmd) { $rtk = $cmd.Source; break }
}
if ($rtk) { Write-Output "rtk: $rtk" } else { Write-Warning "rtk not found - the PreToolUse hook will no-op until rtk is installed." }

if (-not (Test-Path $ConfigToml)) { Write-Warning "no $ConfigToml yet; MCP append will create it." }

# ---- Phase 1: pi-lens runtime --------------------------------------------
if ($SkipPilens) {
  Write-Output "`n[1/5] pi-lens: SKIPPED"
} else {
  Write-Output "`n[1/5] pi-lens standalone install..."
  & powershell -ExecutionPolicy Bypass -File (Join-Path $KitRoot 'pi-lens\install.ps1')
  if ($LASTEXITCODE -ne 0) { throw "pi-lens install failed." }
}

# ---- Phase 2: MCP registration (additive) --------------------------------
if ($SkipMcp) {
  Write-Output "`n[2/5] MCP registration: SKIPPED"
} else {
  Write-Output "`n[2/5] Registering pi-lens MCP server (additive append)..."
  if (-not (Test-Path $ServerJs)) { throw "server.js missing: $ServerJs (run without -SkipPilens first)." }
  & node (Join-Path $KitRoot 'scripts\append-mcp.mjs') --config $ConfigToml --server $ServerJs
  if ($LASTEXITCODE -ne 0) { throw "append-mcp failed." }
}

# ---- Phase 3: hooks -------------------------------------------------------
if ($SkipHooks) {
  Write-Output "`n[3/5] hooks: SKIPPED"
} else {
  Write-Output "`n[3/5] Installing hooks..."
  New-Item -ItemType Directory -Force -Path $HooksDir | Out-Null
  Copy-Item (Join-Path $KitRoot 'hooks\rtk-pretooluse.mjs') $HooksDir -Force
  Copy-Item (Join-Path $KitRoot 'hooks\lens-reminder.mjs') $HooksDir -Force

  $hooksFwd = ToForwardSlash $HooksDir
  $tpl = Get-Content (Join-Path $KitRoot 'codex-config\hooks.template.json') -Raw
  $rendered = $tpl -replace '\{\{CODEX_HOOKS_DIR\}\}', $hooksFwd
  $renderedPath = Join-Path $env:TEMP 'pi-codex-kit-hooks.rendered.json'
  # Write UTF-8 WITHOUT BOM (Set-Content -Encoding utf8 adds a BOM on PS 5.1,
  # which breaks JSON.parse in the merge script).
  [System.IO.File]::WriteAllText($renderedPath, $rendered, (New-Object System.Text.UTF8Encoding $false))

  & node (Join-Path $KitRoot 'scripts\merge-hooks.mjs') --target $HooksJson --template $renderedPath
  if ($LASTEXITCODE -ne 0) { throw "merge-hooks failed." }
  Remove-Item $renderedPath -ErrorAction SilentlyContinue
  Write-Output "NOTE: open Codex and run /hooks to TRUST the new hooks (one-time)."
}

# ---- Phase 4: skills -> cc-switch SSOT ------------------------------------
if ($SkipSkills) {
  Write-Output "`n[4/5] skills: SKIPPED"
} else {
  Write-Output "`n[4/5] Copying skills into cc-switch SSOT ($CcSkills)..."
  if (-not (Test-Path $CcSkills)) { throw "cc-switch skills dir not found: $CcSkills - is cc-switch installed?" }
  $srcSkills = Join-Path $KitRoot 'skills'
  foreach ($dir in Get-ChildItem $srcSkills -Directory) {
    $dest = Join-Path $CcSkills $dir.Name
    if ((Test-Path $dest) -and -not $ForceSkills) {
      Write-Output "  skip (exists): $($dir.Name)"
      continue
    }
    Copy-Item $dir.FullName $CcSkills -Recurse -Force
    Write-Output "  copied: $($dir.Name)"
  }
  Write-Output "NOTE: in cc-switch, install each new skill TO CODEX (symlink mode)."
}

# ---- Phase 5: manual finish reminders -------------------------------------
Write-Output "`n[5/5] Manual finish:"
Write-Output "  1. cc-switch: install the new skills to Codex (symlink)."
Write-Output "  2. cc-switch prompt manager: APPEND agents-md\coding-glue.md to AGENTS.md."
Write-Output "  3. Codex: run /hooks and trust the new hooks."
Write-Output "`nDone. See README.md for the verification checklist."
