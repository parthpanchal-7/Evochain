from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_optimize_returns_safe_decision() -> None:
    payload = {
        "node_id": "miner-6000",
        "snapshot": {
            "mempool_size": 42,
            "avg_gas_price": 2,
            "avg_block_time_ms": 1250,
            "network_load": 0.72,
            "throughput_tps": 18.5,
            "last_block_size": 3,
            "peer_count": 2,
            "chain_height": 14
        },
        "history": [
            {
                "mempool_size": 30,
                "avg_gas_price": 2,
                "avg_block_time_ms": 1180,
                "network_load": 0.64,
                "throughput_tps": 17.1,
                "last_block_size": 3,
                "peer_count": 2,
                "chain_height": 12
            },
            {
                "mempool_size": 36,
                "avg_gas_price": 2,
                "avg_block_time_ms": 1225,
                "network_load": 0.68,
                "throughput_tps": 17.8,
                "last_block_size": 3,
                "peer_count": 2,
                "chain_height": 13
            }
        ]
    }

    response = client.post("/optimize", json=payload)
    assert response.status_code == 200

    body = response.json()
    assert body["node_id"] == "miner-6000"
    assert body["decision"]["block_size"] >= 1
    assert body["decision"]["gas_price"] >= 1
    assert body["simulation_status"] in {"accepted", "adjusted"}

