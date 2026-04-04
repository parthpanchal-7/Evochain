$projectRoot = Split-Path $PSScriptRoot -Parent
$nodePath = Join-Path $projectRoot "evochain"
$ports = @(6000, 6001, 6002)

foreach ($port in $ports) {
    Start-Process powershell -ArgumentList @(
        "-NoExit",
        "-Command",
        "Set-Location '$nodePath'; cargo run -- $port"
    )
}

Write-Host "Started EvoChain nodes on ports 6000, 6001, and 6002."

