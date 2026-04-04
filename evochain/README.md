# EvoChain Rust Node

This crate is the blockchain execution layer for EvoChain AI.

## Current Modules

- `block.rs` block data structure and hashing
- `blockchain.rs` chain management and persistence
- `mempool.rs` transaction staging
- `network.rs` peer-to-peer messaging
- `config.rs` blockchain parameters
- `telemetry.rs` chain metrics
- `peers.rs` peer registry

## Run

```powershell
Set-Location s:\code\Evochain\Evochain\evochain
cargo run -- 6000
```

Use ports `6001` and `6002` for validator instances.

## AI Reconnect

The miner now posts live telemetry to the FastAPI optimizer after each mined
block and applies the returned `block_size` and `gas_price` settings to the
next block.

By default the node targets `http://127.0.0.1:8000`. Override it with:

```powershell
$env:EVOCHAIN_AI_URL = "http://127.0.0.1:8000"
cargo run -- 6000
```

If the AI service is unavailable, mining continues with the last local config.
