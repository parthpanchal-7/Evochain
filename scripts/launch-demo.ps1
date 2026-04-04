param(
    [switch]$SkipInstalls,
    [switch]$SkipDockerInfra
)

$ErrorActionPreference = "Stop"

$projectRoot = Split-Path $PSScriptRoot -Parent
$aiPath = Join-Path $projectRoot "backend\ai-service"
$dashboardPath = Join-Path $projectRoot "frontend\dashboard"
$nodePath = Join-Path $projectRoot "evochain"
$runtimePath = Join-Path $projectRoot ".runtime"
$pidFile = Join-Path $runtimePath "demo-processes.json"

function Assert-Command {
    param(
        [string]$Name,
        [string]$Hint
    )

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Missing required command '$Name'. $Hint"
    }
}

function Ensure-File {
    param(
        [string]$TargetPath,
        [string]$TemplatePath
    )

    if (-not (Test-Path $TargetPath) -and (Test-Path $TemplatePath)) {
        Copy-Item $TemplatePath $TargetPath
    }
}

function Stop-TrackedProcesses {
    param([string]$Path)

    if (-not (Test-Path $Path)) {
        return
    }

    try {
        $tracked = Get-Content $Path -Raw | ConvertFrom-Json
    } catch {
        Remove-Item $Path -Force -ErrorAction SilentlyContinue
        return
    }

    foreach ($entry in @($tracked)) {
        if (-not $entry.pid) {
            continue
        }

        $process = Get-Process -Id $entry.pid -ErrorAction SilentlyContinue
        if ($process) {
            Stop-Process -Id $entry.pid -Force
        }
    }

    Remove-Item $Path -Force -ErrorAction SilentlyContinue
}

function Start-Window {
    param(
        [string]$Title,
        [string]$WorkingDirectory,
        [string]$Command
    )

    $windowCommand = @"
`$Host.UI.RawUI.WindowTitle = '$Title'
Set-Location '$WorkingDirectory'
$Command
"@

    $process = Start-Process powershell `
        -ArgumentList @("-NoExit", "-ExecutionPolicy", "Bypass", "-Command", $windowCommand) `
        -PassThru

    return [pscustomobject]@{
        name = $Title
        pid = $process.Id
        path = $WorkingDirectory
    }
}

Assert-Command -Name "python" -Hint "Install Python 3.10+ and ensure it is on PATH."
Assert-Command -Name "npm" -Hint "Install Node.js 20+ and ensure npm is on PATH."
Assert-Command -Name "cargo" -Hint "Install Rust and Cargo from https://rustup.rs/."

$dockerAvailable = $null -ne (Get-Command docker -ErrorAction SilentlyContinue)

if (-not (Test-Path $runtimePath)) {
    New-Item -Path $runtimePath -ItemType Directory | Out-Null
}

Stop-TrackedProcesses -Path $pidFile

Ensure-File -TargetPath (Join-Path $aiPath ".env") -TemplatePath (Join-Path $aiPath ".env.example")
Ensure-File -TargetPath (Join-Path $dashboardPath ".env") -TemplatePath (Join-Path $dashboardPath ".env.example")

if (-not $SkipDockerInfra) {
    if ($dockerAvailable) {
        Write-Host "Starting MongoDB, Redis, and Elasticsearch with Docker Compose..."
        & docker compose up -d mongodb redis elasticsearch
    } else {
        Write-Host "Docker not found. Continuing without containerized database infrastructure."
        Write-Host "The AI service will still run in memory mode unless your .env points to external services."
    }
}

$aiInstallCommand = if ($SkipInstalls) {
    "Write-Host 'Skipping Python dependency installation.'"
} else {
    "pip install -r requirements.txt"
}

$dashboardInstallCommand = if ($SkipInstalls) {
    "Write-Host 'Skipping npm install.'"
} else {
    "npm install"
}

$processes = @()

$processes += Start-Window `
    -Title "EvoChain AI Service" `
    -WorkingDirectory $aiPath `
    -Command @"
if (-not (Test-Path '.venv')) { python -m venv .venv }
.\.venv\Scripts\Activate.ps1
$aiInstallCommand
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"@

$processes += Start-Window `
    -Title "EvoChain Dashboard" `
    -WorkingDirectory $dashboardPath `
    -Command @"
$dashboardInstallCommand
npm run dev -- --host 0.0.0.0
"@

Start-Sleep -Seconds 4

foreach ($port in @(6000, 6001, 6002)) {
    $role = if ($port -eq 6000) { "Miner" } else { "Validator $port" }
    $processes += Start-Window `
        -Title "EvoChain $role" `
        -WorkingDirectory $nodePath `
        -Command @"
`$env:EVOCHAIN_AI_URL = 'http://127.0.0.1:8000'
cargo run -- $port
"@
}

$processes | ConvertTo-Json | Set-Content $pidFile

Write-Host ""
Write-Host "EvoChain demo launcher started."
Write-Host "Dashboard: http://localhost:5173 or the URL printed by Vite"
Write-Host "AI service: http://localhost:8000"
Write-Host "Tracked process list: $pidFile"
Write-Host "To stop everything started by this launcher, run .\scripts\stop-demo.ps1"
