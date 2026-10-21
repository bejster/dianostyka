param(
  [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'
$ExpectedBranch = 'release/th2-bio-bridge-v2-20261003'
$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

function Step($name, [scriptblock]$action) {
  Write-Host ""
  Write-Host "==> $name" -ForegroundColor Cyan
  & $action
  if ($LASTEXITCODE -ne 0) {
    throw "$name failed with exit code $LASTEXITCODE"
  }
  Write-Host "PASS: $name" -ForegroundColor Green
}

Write-Host "Talerzownik Lead Asset Preflight" -ForegroundColor Yellow
Write-Host "Repo: $RepoRoot"
Write-Host "Expected branch: $ExpectedBranch"

Step "git fetch origin" { git fetch origin }

$currentBranch = (git branch --show-current).Trim()
if ($currentBranch -ne $ExpectedBranch) {
  throw "Wrong branch: $currentBranch. Run: git switch $ExpectedBranch"
}

$trackedDirty = $false
git diff --quiet
if ($LASTEXITCODE -ne 0) { $trackedDirty = $true }
git diff --cached --quiet
if ($LASTEXITCODE -ne 0) { $trackedDirty = $true }
if ($trackedDirty) {
  throw "Tracked local changes detected. Do not deploy from a dirty worktree."
}

$head = (git rev-parse HEAD).Trim()
$remote = (git rev-parse "origin/$ExpectedBranch").Trim()
if ($head -ne $remote) {
  throw "Local HEAD is not origin/$ExpectedBranch. Run: git pull --ff-only"
}

Write-Host "HEAD: $head" -ForegroundColor DarkGray

if (-not $SkipInstall) {
  Step "npm ci" { npm ci }
}

Step "lead asset tests" { npm run test:lead }
Step "full test suite" { npm test }
Step "TypeScript" { npx tsc --noEmit }
Step "targeted ESLint" {
  npx eslint app/api/lead-notify/route.ts app/lib/lead-operator-decision.ts tests/lead-operator-decision.test.ts tests/premium-icp-patch-v1.test.ts tests/th2-bio-bridge.test.ts
}
Step "production build" { npx next build }

Write-Host ""
Write-Host "PREVIEW/LOCAL QUALITY GATES: PASS" -ForegroundColor Green
Write-Host ""
Write-Host "Do NOT deploy production yet unless you are executing the atomic cutover in:" -ForegroundColor Yellow
Write-Host "docs/TALERZOWNIK_LEAD_ASSET_ENTRY.md"
Write-Host ""
Write-Host "Next production order:" -ForegroundColor Cyan
Write-Host "1. APP PROD"
Write-Host "2. general + HiT + TH2 smoke"
Write-Host "3. MAKE mapping"
Write-Host "4. synthetic CRM E2E"
Write-Host "5. Instagram bio"
Write-Host "6. first real lead verification"
