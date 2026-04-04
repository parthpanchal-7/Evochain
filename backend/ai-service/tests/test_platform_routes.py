from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def optimization_payload() -> dict:
    return {
        "node_id": "miner-6000",
        "snapshot": {
            "mempool_size": 42,
            "avg_gas_price": 2,
            "avg_block_time_ms": 1250,
            "network_load": 0.72,
            "throughput_tps": 18.5,
            "last_block_size": 3,
            "peer_count": 2,
            "chain_height": 14,
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
                "chain_height": 12,
            },
            {
                "mempool_size": 36,
                "avg_gas_price": 2,
                "avg_block_time_ms": 1225,
                "network_load": 0.68,
                "throughput_tps": 17.8,
                "last_block_size": 3,
                "peer_count": 2,
                "chain_height": 13,
            },
        ],
    }


def ingest_payload() -> dict:
    return {
        "node_id": "miner-6000",
        "address": "127.0.0.1:6000",
        "role": "miner",
        "snapshot": {
            "mempool_size": 42,
            "avg_gas_price": 2,
            "avg_block_time_ms": 1250,
            "network_load": 0.72,
            "throughput_tps": 18.5,
            "last_block_size": 3,
            "peer_count": 2,
            "chain_height": 14,
        },
        "config": {
            "block_size": 4,
            "gas_price": 2,
            "difficulty": 3,
        },
        "block": {
            "index": 14,
            "timestamp_ms": 1712145600000,
            "previous_hash": "0000abc123",
            "hash": "0000def456",
            "nonce": 941,
            "difficulty": 3,
            "transaction_count": 2,
            "transactions": [
                {
                    "hash": "tx-001",
                    "sender": "alice",
                    "recipient": "bob",
                    "value": 7,
                    "gas_price": 2,
                    "nonce": 1,
                },
                {
                    "hash": "tx-002",
                    "sender": "carol",
                    "recipient": "dave",
                    "value": 4,
                    "gas_price": 2,
                    "nonce": 2,
                },
            ],
        },
        "peer_count": 2,
        "optimization": {
            "generated_at": "2026-04-03T09:30:00Z",
            "simulation_status": "accepted",
            "confidence": 0.71,
            "rationale": [
                "Forecast shows moderate rising demand.",
                "Guardrails accepted a larger block.",
            ],
            "policy": "rl-q-learning",
        },
        "recorded_at": "2026-04-03T09:31:00Z",
    }


def test_dashboard_and_explorer_routes_return_ingested_platform_data() -> None:
    optimize_response = client.post("/optimize", json=optimization_payload())
    assert optimize_response.status_code == 200

    ingest_response = client.post("/api/ingest/node-state", json=ingest_payload())
    assert ingest_response.status_code == 200
    ingest_body = ingest_response.json()
    assert ingest_body["status"] == "stored"
    assert ingest_body["stored_block_hash"] == "0000def456"

    dashboard_response = client.get("/api/dashboard/summary")
    assert dashboard_response.status_code == 200
    dashboard_body = dashboard_response.json()
    assert dashboard_body["overview"]["chain_height"] == 14
    assert dashboard_body["latest_optimization"]["decision"]["policy"] == "rl-q-learning"
    assert dashboard_body["recent_blocks"][0]["hash"] == "0000def456"
    assert dashboard_body["recent_transactions"][0]["hash"] in {"tx-001", "tx-002"}

    blocks_response = client.get("/api/blocks?limit=5")
    assert blocks_response.status_code == 200
    blocks_body = blocks_response.json()
    assert len(blocks_body) == 1
    assert blocks_body[0]["transaction_count"] == 2

    transactions_response = client.get("/api/transactions?limit=5")
    assert transactions_response.status_code == 200
    transactions_body = transactions_response.json()
    assert len(transactions_body) == 2

    search_response = client.get("/api/search?q=alice")
    assert search_response.status_code == 200
    search_body = search_response.json()
    assert any(hit["kind"] == "transaction" for hit in search_body["hits"])

    insights_response = client.get("/api/ai/insights")
    assert insights_response.status_code == 200
    insights_body = insights_response.json()
    assert insights_body["model_status"]["policy"]["policy"] == "rl-q-learning"
    assert insights_body["dependency_status"]["mongo"] == "disabled"


def test_governance_routes_create_and_list_proposals() -> None:
    create_response = client.post(
        "/api/governance/proposals",
        json={
            "title": "Raise throughput ceiling",
            "summary": "Increase the adaptive throughput ceiling during congestion while preserving guardrails.",
            "category": "scalability",
            "proposer": "judges-demo",
            "ai_recommended": True,
        },
    )
    assert create_response.status_code == 200
    created = create_response.json()
    assert created["title"] == "Raise throughput ceiling"
    assert created["ai_recommended"] is True

    list_response = client.get("/api/governance/proposals?limit=10")
    assert list_response.status_code == 200
    proposals = list_response.json()
    assert any(proposal["id"] == created["id"] for proposal in proposals)


def test_security_alert_route_surfaces_generated_alerts() -> None:
    noisy_ingest = ingest_payload()
    noisy_ingest["snapshot"]["network_load"] = 0.91
    noisy_ingest["snapshot"]["throughput_tps"] = 7.2
    noisy_ingest["snapshot"]["peer_count"] = 1
    noisy_ingest["peer_count"] = 1
    noisy_ingest["block"]["hash"] = "0000def999"
    noisy_ingest["recorded_at"] = "2026-04-03T09:35:00Z"

    baseline = client.post("/api/ingest/node-state", json=ingest_payload())
    assert baseline.status_code == 200

    alerting = client.post("/api/ingest/node-state", json=noisy_ingest)
    assert alerting.status_code == 200
    assert alerting.json()["alerts_created"] >= 2

    alerts_response = client.get("/api/security/alerts?limit=10")
    assert alerts_response.status_code == 200
    alerts = alerts_response.json()
    assert any(alert["kind"] == "network-load" for alert in alerts)
    assert any(alert["kind"] == "throughput-drop" for alert in alerts)
