# Full local Docker reset → migrate → slim professional seed (Windows wrapper).
# Same as: npm run db:reset:local-professional
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
npm run db:reset:local-professional
