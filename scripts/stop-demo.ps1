$ErrorActionPreference = "Stop"

$projectRoot = Split-Path $PSScriptRoot -Parent
$runtimePath = Join-Path $projectRoot ".runtime"
$pidFile = Join-Path $runtimePath "demo-processes.json"

if (-not (Test-Path $pidFile)) {
    Write-Host "No tracked EvoChain demo processes were found."
    return
}

try {
    $tracked = Get-Content $pidFile -Raw | ConvertFrom-Json
} catch {
    Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
    Write-Host "The process file was invalid and has been removed."
    return
}

foreach ($entry in @($tracked)) {
    if (-not $entry.pid) {
        continue
    }

    $process = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
    if ($process) {
        Stop-Process -Id $entry.pid -Force
        Write-Host "Stopped $($entry.name) (PID $($entry.pid))."
    }
}

Remove-Item $pidFile -Force -ErrorAction SilentlyContinue
Write-Host "EvoChain demo processes stopped."
