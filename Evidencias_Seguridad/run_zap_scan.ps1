$ErrorActionPreference = 'Continue'
$root = 'c:\Users\Quique-\Documents\Tareas UTT\Cuatri 8\Seguridad en desarrollo de apps\Sitio web'
$evidence = Join-Path $root 'Evidencias_Seguridad'
$backendDir = Join-Path $root 'Backend'
$frontendDir = Join-Path $root 'Frontend'
$mongoName = 'sitio-web-mongo-zap'

function Wait-Http($url, $timeoutSec = 180) {
  $start = Get-Date
  while (((Get-Date) - $start).TotalSeconds -lt $timeoutSec) {
    try {
      $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
      if ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500) { return $true }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  return $false
}

$existing = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $mongoName }
if ($existing) {
  docker rm -f $mongoName | Out-Null
}

docker run -d --name $mongoName -p 27017:27017 mongo:7 | Out-Null

$backendOut = Join-Path $evidence '08_backend_server.log'
$backendErr = Join-Path $evidence '08_backend_server.err.log'
$frontendOut = Join-Path $evidence '09_frontend_server.log'
$frontendErr = Join-Path $evidence '09_frontend_server.err.log'

$backendCmd = "Set-Location '$backendDir'; `$env:MONGO_URI='mongodb://127.0.0.1:27017/proyecto_zap'; `$env:JWT_SECRET='zap_scan_secret'; `$env:CORS_ORIGINS='http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000'; `$env:PORT='5000'; npm.cmd run dev"
$frontendCmd = "Set-Location '$frontendDir'; npm.cmd run dev -- --host 0.0.0.0 --port 5173"

$backendProcess = Start-Process -FilePath 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -ArgumentList '-NoProfile','-Command',$backendCmd -PassThru -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr
$frontendProcess = Start-Process -FilePath 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe' -ArgumentList '-NoProfile','-Command',$frontendCmd -PassThru -RedirectStandardOutput $frontendOut -RedirectStandardError $frontendErr

$backendReady = Wait-Http 'http://localhost:5000/api/health' 180
$frontendReady = Wait-Http 'http://localhost:5173' 180

$scanSummary = [ordered]@{
  backendReady = $backendReady
  frontendReady = $frontendReady
  zapFrontendExitCode = $null
  zapBackendExitCode = $null
  generated = @()
}

if ($frontendReady) {
  $frontendConsole = Join-Path $evidence '10_zap_frontend_console.txt'
  docker run --rm -v "${evidence}:/zap/wrk" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t 'http://host.docker.internal:5173' -J '10_zap_frontend.json' -r '10_zap_frontend.html' -w '10_zap_frontend.md' -x '10_zap_frontend.xml' > $frontendConsole 2>&1
  $scanSummary.zapFrontendExitCode = $LASTEXITCODE
  $scanSummary.generated += '10_zap_frontend_console.txt'
  $scanSummary.generated += '10_zap_frontend.json'
  $scanSummary.generated += '10_zap_frontend.html'
  $scanSummary.generated += '10_zap_frontend.md'
  $scanSummary.generated += '10_zap_frontend.xml'
}

if ($backendReady) {
  $backendConsole = Join-Path $evidence '11_zap_backend_console.txt'
  docker run --rm -v "${evidence}:/zap/wrk" ghcr.io/zaproxy/zaproxy:stable zap-baseline.py -t 'http://host.docker.internal:5000/api/health' -J '11_zap_backend.json' -r '11_zap_backend.html' -w '11_zap_backend.md' -x '11_zap_backend.xml' > $backendConsole 2>&1
  $scanSummary.zapBackendExitCode = $LASTEXITCODE
  $scanSummary.generated += '11_zap_backend_console.txt'
  $scanSummary.generated += '11_zap_backend.json'
  $scanSummary.generated += '11_zap_backend.html'
  $scanSummary.generated += '11_zap_backend.md'
  $scanSummary.generated += '11_zap_backend.xml'
}

if ($backendProcess -and !$backendProcess.HasExited) { Stop-Process -Id $backendProcess.Id -Force }
if ($frontendProcess -and !$frontendProcess.HasExited) { Stop-Process -Id $frontendProcess.Id -Force }

docker rm -f $mongoName | Out-Null

$scanSummaryPath = Join-Path $evidence '12_zap_scan_summary.json'
$scanSummary | ConvertTo-Json -Depth 5 | Set-Content -Path $scanSummaryPath -Encoding UTF8
Write-Output $scanSummaryPath
