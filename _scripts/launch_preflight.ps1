Param(
  [string]$ApiBaseUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"

Write-Host "Running NeuralBI launch preflight against $ApiBaseUrl"

function Assert-Env {
  param(
    [string]$Name,
    [bool]$Condition,
    [string]$Failure
  )
  if (-not $Condition) {
    throw "ENV CHECK FAILED [$Name]: $Failure"
  }
  Write-Host "OK  [$Name]"
}

$strict = ($env:NEURALBI_STRICT_PRODUCTION -eq "true")
$secret = "$env:SECRET_KEY"
$dbUrl = "$env:DATABASE_URL"
$origins = "$env:ALLOWED_ORIGINS"
$sim = ($env:ENABLE_LIVE_KPI_SIMULATOR -eq "true")

if ($strict) {
  Assert-Env -Name "SECRET_KEY" -Condition (($secret.Length -ge 32) -and ($secret -notmatch "INSECURE|placeholder|example")) -Failure "Set strong SECRET_KEY"
  Assert-Env -Name "DATABASE_URL" -Condition ($dbUrl -like "postgresql*") -Failure "Strict mode requires PostgreSQL"
  Assert-Env -Name "ENABLE_LIVE_KPI_SIMULATOR" -Condition (-not $sim) -Failure "Must be false in strict mode"
  Assert-Env -Name "ALLOWED_ORIGINS" -Condition (($origins -notmatch "localhost|127.0.0.1|\*|http://")) -Failure "Use explicit HTTPS origins only"
}

function Invoke-Check {
  param(
    [string]$Url,
    [string]$Label
  )
  $resp = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 20
  if ($resp.StatusCode -ne 200) {
    throw "HTTP CHECK FAILED [$Label]: status=$($resp.StatusCode)"
  }
  Write-Host "OK  [$Label] $Url"
  return $resp.Content
}

[void](Invoke-Check -Url "$ApiBaseUrl/health" -Label "health")
$readyBody = Invoke-Check -Url "$ApiBaseUrl/ready" -Label "ready"

if ($strict -and ($readyBody -notmatch '"status"\s*:\s*"ready"')) {
  throw "READINESS CHECK FAILED: strict mode enabled but /ready is not ready"
}

Write-Host "Launch preflight passed."
