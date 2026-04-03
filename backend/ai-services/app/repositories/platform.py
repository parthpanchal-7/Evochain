from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import redis
from elasticsearch import Elasticsearch
from pymongo import DESCENDING, MongoClient
from pymongo.errors import PyMongoError

from app.core.config import Settings
from app.schemas.platform import (
    AIInsightsResponse,
    ChainBlock,
    ChainTransaction,
    DashboardSummary,
    GovernanceProposal,
    GovernanceProposalCreate,
    NetworkOverview,
    NodeStateIngestRequest,
    OptimizationRecord,
    SearchHit,
    SearchResponse,
    SecurityAlert,
    TelemetryPoint,
)
from app.schemas.telemetry import TelemetrySnapshot


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _proposal_seed() -> list[dict[str, Any]]:
    now = utc_now()
    return [
        GovernanceProposal(
            id="prop-ai-blocksize",
            title="Raise Max Adaptive Block Size to 6",
            summary="Expand the optimizer ceiling during sustained congestion while keeping guardrails enabled.",
            category="scalability",
            proposer="ai-council",
            votes_for=412,
            votes_against=92,
            ai_recommended=True,
            created_at=now,
        ).model_dump(mode="json"),
        GovernanceProposal(
            id="prop-security-gasfloor",
            title="Increase Defensive Gas Floor",
            summary="Introduce a higher defensive gas floor during spam bursts to reduce low-value transaction floods.",
            category="security",
            proposer="ops-team",
            votes_for=255,
            votes_against=48,
            ai_recommended=False,
            created_at=now,
        ).model_dump(mode="json"),
    ]


@dataclass
class MemoryStore:
    blocks: list[dict[str, Any]] = field(default_factory=list)
    transactions: list[dict[str, Any]] = field(default_factory=list)
    telemetry: list[dict[str, Any]] = field(default_factory=list)
    optimizations: list[dict[str, Any]] = field(default_factory=list)
    alerts: list[dict[str, Any]] = field(default_factory=list)
    proposals: list[dict[str, Any]] = field(default_factory=_proposal_seed)


class PlatformRepository:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.memory = MemoryStore()
        self.mongo_client: MongoClient | None = None
        self.mongo_db = None
        self.redis_client: redis.Redis | None = None
        self.elastic_client: Elasticsearch | None = None
        self.status = {
            "mongo": "disabled",
            "redis": "disabled",
            "elasticsearch": "disabled",
        }
        self._connect()

    def dependency_status(self) -> dict[str, str]:
        return dict(self.status)

    def mode(self) -> str:
        active = [name for name, value in self.status.items() if value == "connected"]
        return "+".join(active) if active else "memory"

    def _connect(self) -> None:
        if self.settings.use_mongo:
            try:
                self.mongo_client = MongoClient(
                    self.settings.mongodb_uri,
                    serverSelectionTimeoutMS=1200,
                )
                self.mongo_client.admin.command("ping")
                self.mongo_db = self.mongo_client[self.settings.mongodb_db]
                self._ensure_indexes()
                self.status["mongo"] = "connected"
            except PyMongoError:
                self.mongo_client = None
                self.mongo_db = None
                self.status["mongo"] = "fallback-memory"

        if self.settings.use_redis:
            try:
                self.redis_client = redis.Redis.from_url(
                    self.settings.redis_url,
                    decode_responses=True,
                    socket_connect_timeout=1,
                    socket_timeout=1,
                )
                self.redis_client.ping()
                self.status["redis"] = "connected"
            except redis.RedisError:
                self.redis_client = None
                self.status["redis"] = "fallback-memory"

        if self.settings.use_elasticsearch:
            try:
                self.elastic_client = Elasticsearch(
                    self.settings.elasticsearch_url,
                    request_timeout=2,
                )
                self.elastic_client.info()
                self.status["elasticsearch"] = "connected"
            except Exception:
                self.elastic_client = None
                self.status["elasticsearch"] = "fallback-memory"

    def _ensure_indexes(self) -> None:
        if self.mongo_db is None:
            return

        self.mongo_db.blocks.create_index("hash", unique=True)
        self.mongo_db.blocks.create_index([("index", DESCENDING)])
        self.mongo_db.transactions.create_index("hash", unique=True)
        self.mongo_db.transactions.create_index([("block_index", DESCENDING)])
        self.mongo_db.telemetry.create_index([("node_id", DESCENDING), ("recorded_at", DESCENDING)])
        self.mongo_db.optimizations.create_index([("node_id", DESCENDING), ("generated_at", DESCENDING)])
        self.mongo_db.alerts.create_index([("created_at", DESCENDING)])
        self.mongo_db.proposals.create_index("id", unique=True)

    def record_telemetry_sample(
        self,
        node_id: str,
        snapshot: TelemetrySnapshot,
        *,
        source: str,
        recorded_at: datetime | None = None,
    ) -> None:
        doc = {
            "node_id": node_id,
            "source": source,
            "snapshot": snapshot.model_dump(mode="json"),
            "recorded_at": (recorded_at or utc_now()).isoformat(),
        }
        self.memory.telemetry.append(doc)

        if self.mongo_db is not None:
            self.mongo_db.telemetry.insert_one(doc)

    def get_recent_telemetry(self, node_id: str, limit: int = 24) -> list[TelemetrySnapshot]:
        docs: list[dict[str, Any]]
        if self.mongo_db is not None:
            docs = list(
                self.mongo_db.telemetry.find({"node_id": node_id}, {"_id": 0})
                .sort("recorded_at", DESCENDING)
                .limit(limit)
            )
        else:
            docs = [doc for doc in self.memory.telemetry if doc["node_id"] == node_id][-limit:]

        docs = list(reversed(docs))
        return [TelemetrySnapshot.model_validate(doc["snapshot"]) for doc in docs]

    def record_optimization(self, record: OptimizationRecord) -> None:
        doc = record.model_dump(mode="json")
        self.memory.optimizations.append(doc)

        if self.mongo_db is not None:
            self.mongo_db.optimizations.insert_one(doc)

        if self.redis_client is not None:
            self.redis_client.set(
                f"evochain:latest-optimization:{record.node_id}",
                json.dumps(doc),
            )

    def get_latest_optimization(self, node_id: str | None = None) -> OptimizationRecord | None:
        doc: dict[str, Any] | None = None
        if self.mongo_db is not None:
            query = {"node_id": node_id} if node_id else {}
            doc = self.mongo_db.optimizations.find_one(
                query,
                {"_id": 0},
                sort=[("generated_at", DESCENDING)],
            )
        else:
            candidates = self.memory.optimizations
            if node_id:
                candidates = [item for item in candidates if item["node_id"] == node_id]
            if candidates:
                doc = candidates[-1]

        return OptimizationRecord.model_validate(doc) if doc else None

    def get_recent_optimizations(
        self,
        node_id: str | None = None,
        limit: int = 12,
    ) -> list[OptimizationRecord]:
        docs: list[dict[str, Any]]
        if self.mongo_db is not None:
            query = {"node_id": node_id} if node_id else {}
            docs = list(
                self.mongo_db.optimizations.find(query, {"_id": 0})
                .sort("generated_at", DESCENDING)
                .limit(limit)
            )
        else:
            docs = self.memory.optimizations
            if node_id:
                docs = [item for item in docs if item["node_id"] == node_id]
            docs = docs[-limit:]

        return [OptimizationRecord.model_validate(item) for item in docs]

    def ingest_node_state(self, payload: NodeStateIngestRequest) -> int:
        previous_snapshots = self.get_recent_telemetry(payload.node_id, limit=1)
        previous = previous_snapshots[-1] if previous_snapshots else None
        alerts = self._build_alerts(payload, previous)

        block_doc = payload.block.model_dump(mode="json")
        block_doc.update(
            {
                "node_id": payload.node_id,
                "address": payload.address,
                "role": payload.role,
                "recorded_at": payload.recorded_at.isoformat(),
                "config": payload.config.model_dump(mode="json"),
                "snapshot": payload.snapshot.model_dump(mode="json"),
            }
        )

        tx_docs = []
        for tx in payload.block.transactions:
            tx_doc = tx.model_dump(mode="json")
            tx_doc.update(
                {
                    "block_index": payload.block.index,
                    "block_hash": payload.block.hash,
                    "timestamp_ms": payload.block.timestamp_ms,
                    "node_id": payload.node_id,
                }
            )
            tx_docs.append(tx_doc)

        self._upsert_block(block_doc)
        self._upsert_transactions(tx_docs)
        self.record_telemetry_sample(
            payload.node_id,
            payload.snapshot,
            source="node-ingest",
            recorded_at=payload.recorded_at,
        )

        for alert in alerts:
            self._store_alert(alert)

        self._cache_overview()
        self._index_search_documents(block_doc, tx_docs)
        return len(alerts)

    def get_network_overview(self) -> NetworkOverview:
        if self.redis_client is not None:
            cached = self.redis_client.get("evochain:overview")
            if cached:
                return NetworkOverview.model_validate_json(cached)

        latest_block = self.get_recent_blocks(limit=1)
        latest_optimization = self.get_latest_optimization()
        latest_snapshot = self._latest_snapshot()

        overview = NetworkOverview(
            chain_height=latest_block[0].index if latest_block else 0,
            latest_block_hash=latest_block[0].hash if latest_block else "GENESIS",
            pending_transactions=latest_snapshot.mempool_size if latest_snapshot else 0,
            current_gas_price=latest_snapshot.avg_gas_price if latest_snapshot else self.settings.min_gas_price,
            block_size=(
                latest_optimization.decision.block_size
                if latest_optimization is not None
                else self.settings.min_block_size
            ),
            avg_block_time_ms=latest_snapshot.avg_block_time_ms if latest_snapshot else 0,
            throughput_tps=latest_snapshot.throughput_tps if latest_snapshot else 0,
            peer_count=latest_snapshot.peer_count if latest_snapshot else 0,
            network_load=latest_snapshot.network_load if latest_snapshot else 0,
            latest_forecast_trend=(
                latest_optimization.forecast.trend if latest_optimization is not None else "stable"
            ),
            optimizer_confidence=(
                latest_optimization.decision.confidence if latest_optimization is not None else 0
            ),
            mode=self.mode(),
        )

        if self.redis_client is not None:
            self.redis_client.set("evochain:overview", overview.model_dump_json())

        return overview

    def get_dashboard_summary(self) -> DashboardSummary:
        return DashboardSummary(
            overview=self.get_network_overview(),
            recent_blocks=self.get_recent_blocks(limit=6),
            recent_transactions=self.get_recent_transactions(limit=8),
            telemetry_history=self.get_telemetry_points(limit=12),
            latest_optimization=self.get_latest_optimization(),
            alerts=self.get_security_alerts(limit=5),
        )

    def get_recent_blocks(self, limit: int = 20) -> list[ChainBlock]:
        docs: list[dict[str, Any]]
        if self.mongo_db is not None:
            docs = list(
                self.mongo_db.blocks.find({}, {"_id": 0})
                .sort("index", DESCENDING)
                .limit(limit)
            )
        else:
            docs = sorted(self.memory.blocks, key=lambda item: item["index"], reverse=True)[:limit]

        cleaned = []
        for doc in docs:
            item = dict(doc)
            item.pop("node_id", None)
            item.pop("address", None)
            item.pop("role", None)
            item.pop("recorded_at", None)
            item.pop("config", None)
            item.pop("snapshot", None)
            cleaned.append(item)
        return [ChainBlock.model_validate(doc) for doc in cleaned]

    def get_recent_transactions(self, limit: int = 20, query: str | None = None) -> list[ChainTransaction]:
        if query:
            return [
                ChainTransaction.model_validate(hit.metadata["document"])
                for hit in self.search(query, limit=limit).hits
                if hit.kind == "transaction"
            ]

        docs: list[dict[str, Any]]
        if self.mongo_db is not None:
            docs = list(
                self.mongo_db.transactions.find({}, {"_id": 0})
                .sort("block_index", DESCENDING)
                .limit(limit)
            )
        else:
            docs = sorted(
                self.memory.transactions,
                key=lambda item: (item["block_index"], item["nonce"]),
                reverse=True,
            )[:limit]

        cleaned = []
        for doc in docs:
            item = dict(doc)
            item.pop("block_index", None)
            item.pop("block_hash", None)
            item.pop("timestamp_ms", None)
            item.pop("node_id", None)
            cleaned.append(item)
        return [ChainTransaction.model_validate(doc) for doc in cleaned]

    def get_telemetry_points(self, limit: int = 16) -> list[TelemetryPoint]:
        docs: list[dict[str, Any]]
        if self.mongo_db is not None:
            docs = list(
                self.mongo_db.telemetry.find({}, {"_id": 0})
                .sort("recorded_at", DESCENDING)
                .limit(limit)
            )
        else:
            docs = self.memory.telemetry[-limit:]

        docs = list(reversed(docs))
        points: list[TelemetryPoint] = []
        for doc in docs:
            snapshot = TelemetrySnapshot.model_validate(doc["snapshot"])
            points.append(
                TelemetryPoint(
                    timestamp=datetime.fromisoformat(doc["recorded_at"]),
                    mempool_size=snapshot.mempool_size,
                    avg_gas_price=snapshot.avg_gas_price,
                    avg_block_time_ms=snapshot.avg_block_time_ms,
                    throughput_tps=snapshot.throughput_tps,
                    network_load=snapshot.network_load,
                )
            )
        return points

    def get_security_alerts(self, limit: int = 20) -> list[SecurityAlert]:
        docs: list[dict[str, Any]]
        if self.mongo_db is not None:
            docs = list(
                self.mongo_db.alerts.find({}, {"_id": 0})
                .sort("created_at", DESCENDING)
                .limit(limit)
            )
        else:
            docs = self.memory.alerts[-limit:]

        return [SecurityAlert.model_validate(doc) for doc in docs]

    def get_governance_proposals(self, limit: int = 20) -> list[GovernanceProposal]:
        docs: list[dict[str, Any]]
        if self.mongo_db is not None:
            docs = list(
                self.mongo_db.proposals.find({}, {"_id": 0})
                .sort("created_at", DESCENDING)
                .limit(limit)
            )
        else:
            docs = self.memory.proposals[-limit:]

        return [GovernanceProposal.model_validate(doc) for doc in docs]

    def create_governance_proposal(self, payload: GovernanceProposalCreate) -> GovernanceProposal:
        proposal = GovernanceProposal(
            id=f"prop-{uuid.uuid4().hex[:10]}",
            title=payload.title,
            summary=payload.summary,
            category=payload.category,
            proposer=payload.proposer,
            ai_recommended=payload.ai_recommended,
        )
        doc = proposal.model_dump(mode="json")
        self.memory.proposals.append(doc)

        if self.mongo_db is not None:
            self.mongo_db.proposals.insert_one(doc)

        if self.elastic_client is not None:
            try:
                self.elastic_client.index(
                    index="evochain-proposals",
                    id=proposal.id,
                    document=doc,
                )
            except Exception:
                pass

        return proposal

    def search(self, query: str, limit: int = 12) -> SearchResponse:
        query = query.strip()
        if not query:
            return SearchResponse(query=query, hits=[])

        if self.elastic_client is not None:
            try:
                response = self.elastic_client.search(
                    index="evochain-blocks,evochain-transactions,evochain-proposals",
                    size=limit,
                    query={
                        "multi_match": {
                            "query": query,
                            "fields": [
                                "hash^4",
                                "previous_hash^2",
                                "sender^2",
                                "recipient^2",
                                "title^2",
                                "summary",
                            ],
                        }
                    },
                )
                hits = [self._elastic_hit_to_search_hit(hit) for hit in response["hits"]["hits"]]
                return SearchResponse(query=query, hits=hits)
            except Exception:
                pass

        lowered = query.lower()
        fallback_hits: list[SearchHit] = []
        for block in self.memory.blocks:
            if lowered in block["hash"].lower() or lowered in block["previous_hash"].lower():
                fallback_hits.append(
                    SearchHit(
                        kind="block",
                        id=block["hash"],
                        title=f"Block #{block['index']}",
                        subtitle=block["hash"],
                        metadata={"document": block},
                    )
                )
        for tx in self.memory.transactions:
            haystack = " ".join([tx["hash"], tx["sender"], tx["recipient"]]).lower()
            if lowered in haystack:
                fallback_hits.append(
                    SearchHit(
                        kind="transaction",
                        id=tx["hash"],
                        title=tx["hash"],
                        subtitle=f"{tx['sender']} -> {tx['recipient']}",
                        metadata={"document": tx},
                    )
                )
        for proposal in self.memory.proposals:
            haystack = " ".join([proposal["title"], proposal["summary"], proposal["category"]]).lower()
            if lowered in haystack:
                fallback_hits.append(
                    SearchHit(
                        kind="proposal",
                        id=proposal["id"],
                        title=proposal["title"],
                        subtitle=proposal["category"],
                        metadata={"document": proposal},
                    )
                )

        return SearchResponse(query=query, hits=fallback_hits[:limit])

    def build_ai_insights(self, model_status: dict[str, Any]) -> AIInsightsResponse:
        return AIInsightsResponse(
            latest_optimization=self.get_latest_optimization(),
            recent_optimizations=self.get_recent_optimizations(limit=8),
            telemetry_history=self.get_telemetry_points(limit=16),
            model_status=model_status,
            dependency_status=self.dependency_status(),
        )

    def _upsert_block(self, block_doc: dict[str, Any]) -> None:
        existing_index = next(
            (index for index, item in enumerate(self.memory.blocks) if item["hash"] == block_doc["hash"]),
            None,
        )
        if existing_index is None:
            self.memory.blocks.append(block_doc)
        else:
            self.memory.blocks[existing_index] = block_doc

        if self.mongo_db is not None:
            self.mongo_db.blocks.replace_one({"hash": block_doc["hash"]}, block_doc, upsert=True)

    def _upsert_transactions(self, tx_docs: list[dict[str, Any]]) -> None:
        for tx_doc in tx_docs:
            existing_index = next(
                (index for index, item in enumerate(self.memory.transactions) if item["hash"] == tx_doc["hash"]),
                None,
            )
            if existing_index is None:
                self.memory.transactions.append(tx_doc)
            else:
                self.memory.transactions[existing_index] = tx_doc

            if self.mongo_db is not None:
                self.mongo_db.transactions.replace_one({"hash": tx_doc["hash"]}, tx_doc, upsert=True)

    def _build_alerts(
        self,
        payload: NodeStateIngestRequest,
        previous: TelemetrySnapshot | None,
    ) -> list[SecurityAlert]:
        alerts: list[SecurityAlert] = []
        snapshot = payload.snapshot

        if snapshot.network_load >= 0.85:
            alerts.append(
                SecurityAlert(
                    id=f"alert-{uuid.uuid4().hex[:10]}",
                    level="warning",
                    kind="network-load",
                    message="Network load crossed the congestion threshold.",
                    node_id=payload.node_id,
                    metrics={
                        "network_load": snapshot.network_load,
                        "mempool_size": snapshot.mempool_size,
                    },
                )
            )

        if previous and snapshot.avg_gas_price > max(previous.avg_gas_price * 1.5, previous.avg_gas_price + 2):
            alerts.append(
                SecurityAlert(
                    id=f"alert-{uuid.uuid4().hex[:10]}",
                    level="info",
                    kind="gas-spike",
                    message="Gas price spiked sharply between consecutive telemetry samples.",
                    node_id=payload.node_id,
                    metrics={
                        "previous_gas": previous.avg_gas_price,
                        "current_gas": snapshot.avg_gas_price,
                    },
                )
            )

        if previous and snapshot.throughput_tps < previous.throughput_tps * 0.6:
            alerts.append(
                SecurityAlert(
                    id=f"alert-{uuid.uuid4().hex[:10]}",
                    level="critical",
                    kind="throughput-drop",
                    message="Throughput dropped by more than 40%, investigate possible attack or instability.",
                    node_id=payload.node_id,
                    metrics={
                        "previous_tps": previous.throughput_tps,
                        "current_tps": snapshot.throughput_tps,
                    },
                )
            )

        if payload.peer_count < 2:
            alerts.append(
                SecurityAlert(
                    id=f"alert-{uuid.uuid4().hex[:10]}",
                    level="warning",
                    kind="peer-fragility",
                    message="Peer count is low, reducing network resilience for this node.",
                    node_id=payload.node_id,
                    metrics={"peer_count": payload.peer_count},
                )
            )

        return alerts

    def _store_alert(self, alert: SecurityAlert) -> None:
        doc = alert.model_dump(mode="json")
        self.memory.alerts.append(doc)

        if self.mongo_db is not None:
            self.mongo_db.alerts.insert_one(doc)

    def _cache_overview(self) -> None:
        if self.redis_client is None:
            return

        self.redis_client.set("evochain:overview", self.get_network_overview().model_dump_json())

    def _index_search_documents(
        self,
        block_doc: dict[str, Any],
        tx_docs: list[dict[str, Any]],
    ) -> None:
        if self.elastic_client is None:
            return

        try:
            self.elastic_client.index(
                index="evochain-blocks",
                id=block_doc["hash"],
                document=block_doc,
            )
            for tx_doc in tx_docs:
                self.elastic_client.index(
                    index="evochain-transactions",
                    id=tx_doc["hash"],
                    document=tx_doc,
                )
        except Exception:
            pass

    def _elastic_hit_to_search_hit(self, hit: dict[str, Any]) -> SearchHit:
        source = hit.get("_source", {})
        index_name = hit.get("_index", "")
        if "transactions" in index_name:
            return SearchHit(
                kind="transaction",
                id=source["hash"],
                title=source["hash"],
                subtitle=f"{source['sender']} -> {source['recipient']}",
                metadata={"document": source},
            )
        if "proposals" in index_name:
            return SearchHit(
                kind="proposal",
                id=source["id"],
                title=source["title"],
                subtitle=source["category"],
                metadata={"document": source},
            )
        return SearchHit(
            kind="block",
            id=source["hash"],
            title=f"Block #{source['index']}",
            subtitle=source["hash"],
            metadata={"document": source},
        )

    def _latest_snapshot(self) -> TelemetrySnapshot | None:
        if self.mongo_db is not None:
            doc = self.mongo_db.telemetry.find_one({}, {"_id": 0}, sort=[("recorded_at", DESCENDING)])
            if doc:
                return TelemetrySnapshot.model_validate(doc["snapshot"])

        if self.memory.telemetry:
            return TelemetrySnapshot.model_validate(self.memory.telemetry[-1]["snapshot"])

        return None
