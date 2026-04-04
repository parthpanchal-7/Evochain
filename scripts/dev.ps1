$projectRoot = Split-Path $PSScriptRoot -Parent
$aiPath = Join-Path $projectRoot "backend\ai-service"
$dashboardPath = Join-Path $projectRoot "frontend\dashboard"

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$aiPath'; if (-not (Test-Path '.venv')) { python -m venv .venv }; .\.venv\Scripts\Activate.ps1; pip install -r requirements.txt; .\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"
)

Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$dashboardPath'; npm install; npm run dev -- --host 0.0.0.0"
)

Write-Host "AI service and dashboard launch commands have been started in new windows."
Write-Host "Run .\\scripts\\run-nodes.ps1 separately to start the Rust nodes."
