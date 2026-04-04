use std::collections::VecDeque;
use std::env;

use reqwest::blocking::Client;
use serde::{Deserialize, Serialize};

use crate::blockchain::Blockchain;
use crate::crypto::keccak256;

const DEFAULT_AI_URL: &str = "http://127.0.0.1:8000";
const HISTORY_LIMIT: usize = 4;

#[derive(Clone, Debug, Serialize)]
pub struct TelemetrySnapshot {
    pub mempool_size: u64,
    pub avg_gas_price: u64,
    pub avg_block_time_ms: f64,
    pub network_load: f64,
    pub throughput_tps: f64,
    pub last_block_size: usize,
    pub peer_count: usize,
    pub chain_height: u64,
}

#[derive(Debug, Serialize)]
struct OptimizationRequest {
    node_id: String,
    snapshot: TelemetrySnapshot,
    history: Vec<TelemetrySnapshot>,
}

#[derive(Debug, Deserialize)]
pub struct OptimizationDecision {
    pub block_size: usize,
    pub gas_price: u64,
    pub confidence: f64,
    pub rationale: Vec<String>,
    #[serde(default = "default_policy")]
    pub policy: String,
}

#[derive(Debug, Deserialize)]
pub struct OptimizationResponse {
    pub node_id: String,
    pub generated_at: String,
    pub decision: OptimizationDecision,
    pub simulation_status: String,
}

#[derive(Debug, Serialize)]
struct ChainTransactionPayload {
    hash: String,
    sender: String,
    recipient: String,
    value: u64,
    gas_price: u64,
    nonce: u64,
}

#[derive(Debug, Serialize)]
struct ChainBlockPayload {
    index: u64,
    timestamp_ms: u128,
    previous_hash: String,
    hash: String,
    nonce: u64,
    difficulty: u32,
    transaction_count: usize,
    transactions: Vec<ChainTransactionPayload>,
}

#[derive(Debug, Serialize)]
struct NodeConfigPayload {
    block_size: usize,
    gas_price: u64,
    difficulty: u32,
}

#[derive(Debug, Serialize)]
struct AppliedOptimizationPayload {
    generated_at: String,
    simulation_status: String,
    confidence: f64,
    rationale: Vec<String>,
    policy: String,
}

#[derive(Debug, Serialize)]
struct NodeStateIngestPayload {
    node_id: String,
    address: String,
    role: String,
    snapshot: TelemetrySnapshot,
    config: NodeConfigPayload,
    block: ChainBlockPayload,
    peer_count: usize,
    optimization: Option<AppliedOptimizationPayload>,
}

pub struct OptimizerClient {
    base_url: String,
    client: Client,
    history: VecDeque<TelemetrySnapshot>,
}

impl OptimizerClient {
    pub fn from_env() -> Self {
        let base_url = env::var("EVOCHAIN_AI_URL").unwrap_or_else(|_| DEFAULT_AI_URL.to_string());

        Self::new(base_url)
    }

    pub fn endpoint(&self) -> &str {
        &self.base_url
    }

    pub fn build_snapshot(
        &self,
        blockchain: &Blockchain,
        mempool_size: usize,
        peer_count: usize,
    ) -> TelemetrySnapshot {
        let last_block_size = blockchain
            .chain
            .last()
            .map(|block| block.transactions.len())
            .unwrap_or(1)
            .max(1);
        let avg_block_time_ms = blockchain.telemetry.get_block_time() as f64;
        let throughput_tps = if avg_block_time_ms > 0.0 {
            round_2dp((last_block_size as f64 * 1000.0) / avg_block_time_ms)
        } else {
            0.0
        };
        let network_load = round_2dp(
            ((mempool_size as f64) / (blockchain.config.block_size.max(1) as f64 * 2.0))
                .clamp(0.0, 1.0),
        );

        TelemetrySnapshot {
            mempool_size: mempool_size as u64,
            avg_gas_price: average_gas_price(blockchain),
            avg_block_time_ms,
            network_load,
            throughput_tps,
            last_block_size,
            peer_count,
            chain_height: blockchain
                .chain
                .last()
                .map(|block| block.index)
                .unwrap_or(0),
        }
    }

    pub fn optimize(
        &mut self,
        node_id: &str,
        snapshot: TelemetrySnapshot,
    ) -> Result<OptimizationResponse, String> {
        let payload = OptimizationRequest {
            node_id: node_id.to_string(),
            snapshot: snapshot.clone(),
            history: self.history.iter().cloned().collect(),
        };

        let response = self
            .client
            .post(format!("{}/optimize", self.base_url))
            .json(&payload)
            .send()
            .and_then(|response| response.error_for_status())
            .map_err(|error| error.to_string())
            .and_then(|response| {
                response
                    .json::<OptimizationResponse>()
                    .map_err(|error| error.to_string())
            });

        self.record_snapshot(snapshot);

        response
    }

    pub fn ingest_node_state(
        &self,
        node_id: &str,
        address: &str,
        role: &str,
        snapshot: &TelemetrySnapshot,
        blockchain: &Blockchain,
        peer_count: usize,
        optimization: Option<&OptimizationResponse>,
    ) -> Result<(), String> {
        let last_block = blockchain
            .chain
            .last()
            .ok_or_else(|| "No block available to ingest.".to_string())?;

        let transactions = last_block
            .transactions
            .iter()
            .map(|transaction| ChainTransactionPayload {
                hash: hash_transaction(
                    transaction.from.as_str(),
                    transaction.to.as_str(),
                    transaction.value,
                    transaction.gas_price,
                    transaction.nonce,
                ),
                sender: transaction.from.clone(),
                recipient: transaction.to.clone(),
                value: transaction.value,
                gas_price: transaction.gas_price,
                nonce: transaction.nonce,
            })
            .collect();

        let block = ChainBlockPayload {
            index: last_block.index,
            timestamp_ms: last_block.timestamp,
            previous_hash: last_block.previous_hash.clone(),
            hash: last_block.hash.clone(),
            nonce: last_block.nonce,
            difficulty: last_block.difficulty,
            transaction_count: last_block.transactions.len(),
            transactions,
        };

        let payload = NodeStateIngestPayload {
            node_id: node_id.to_string(),
            address: address.to_string(),
            role: role.to_string(),
            snapshot: snapshot.clone(),
            config: NodeConfigPayload {
                block_size: blockchain.config.block_size,
                gas_price: blockchain.config.gas_price,
                difficulty: blockchain.config.difficulty,
            },
            block,
            peer_count,
            optimization: optimization.map(|response| AppliedOptimizationPayload {
                generated_at: response.generated_at.clone(),
                simulation_status: response.simulation_status.clone(),
                confidence: response.decision.confidence,
                rationale: response.decision.rationale.clone(),
                policy: response.decision.policy.clone(),
            }),
        };

        self.client
            .post(format!("{}/api/ingest/node-state", self.base_url))
            .json(&payload)
            .send()
            .and_then(|response| response.error_for_status())
            .map(|_| ())
            .map_err(|error| error.to_string())
    }

    fn new(base_url: String) -> Self {
        Self {
            base_url: base_url.trim_end_matches('/').to_string(),
            client: Client::new(),
            history: VecDeque::with_capacity(HISTORY_LIMIT),
        }
    }

    fn record_snapshot(&mut self, snapshot: TelemetrySnapshot) {
        if self.history.len() == HISTORY_LIMIT {
            self.history.pop_front();
        }

        self.history.push_back(snapshot);
    }
}

fn average_gas_price(blockchain: &Blockchain) -> u64 {
    let Some(last_block) = blockchain.chain.last() else {
        return blockchain.config.gas_price;
    };

    if last_block.transactions.is_empty() {
        return blockchain.config.gas_price;
    }

    let total_gas: u64 = last_block
        .transactions
        .iter()
        .map(|transaction| transaction.gas_price)
        .sum();

    total_gas / last_block.transactions.len() as u64
}

fn round_2dp(value: f64) -> f64 {
    (value * 100.0).round() / 100.0
}

fn default_policy() -> String {
    "rl-q-learning".to_string()
}

fn hash_transaction(
    sender: &str,
    recipient: &str,
    value: u64,
    gas_price: u64,
    nonce: u64,
) -> String {
    keccak256(&format!(
        "{}:{}:{}:{}:{}",
        sender, recipient, value, gas_price, nonce
    ))
}
