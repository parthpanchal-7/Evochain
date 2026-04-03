use crate::block::Block;
use crate::transaction::Transaction;
use crate::telemetry::Telemetry;
use crate::config::ChainConfig;

// 🔥 NEW IMPORTS
use crate::metrics::{MetricsEngine, NetworkMetrics};
use crate::mempool::Mempool;

use std::fs;

#[derive(Clone)]
pub struct Blockchain {
    pub chain: Vec<Block>,
    pub config: ChainConfig,
    pub telemetry: Telemetry,
}

impl Blockchain {

    // =====================
    // 🔥 INIT
    // =====================
    pub fn new(reset: bool) -> Self {

        let mut blockchain = Blockchain {
            chain: Vec::new(),
            config: ChainConfig::new(),
            telemetry: Telemetry::new(),
        };

        if !reset {
            blockchain.load_chain();
        }

        if blockchain.chain.is_empty() {
            blockchain.create_genesis_block();
        }

        blockchain
    }

    // =====================
    // 🔥 GENESIS BLOCK
    // =====================
    fn create_genesis_block(&mut self) {

        let genesis_tx = Transaction::new(
            "network".to_string(),
            "genesis".to_string(),
            0,
            0,
            0
        );

        let mut genesis_block = Block {
            index: 0,
            timestamp: 0,
            previous_hash: "0".to_string(),
            transactions: vec![genesis_tx],
            nonce: 0,
            difficulty: self.config.difficulty,
            hash: String::from("GENESIS_HASH_0000"),
        };

        genesis_block.hash = genesis_block.calculate_hash();

        self.chain.push(genesis_block);

        self.telemetry.record_block();

        println!("🌱 Genesis block created");

        self.save_chain();
    }

    // =====================
    // 🔥 AI DATA (UNCHANGED)
    // =====================
    pub fn get_ai_data(&self) -> (Vec<u64>, Vec<usize>, Vec<u128>) {

        let mut gas_prices = Vec::new();
        let mut block_sizes = Vec::new();
        let mut block_times = Vec::new();

        for i in 0..self.chain.len() {

            let block = &self.chain[i];

            block_sizes.push(block.transactions.len());

            if i > 0 {
                let prev_block = &self.chain[i - 1];
                let time_diff = block.timestamp - prev_block.timestamp;
                block_times.push(time_diff);
            }

            for tx in &block.transactions {
                gas_prices.push(tx.gas_price);
            }
        }

        (gas_prices, block_sizes, block_times)
    }

    // =====================
    // 🔥 NEW: AI MINING FUNCTION (SAFE ADD)
    // =====================
    pub fn mine_block_with_ai(
        &mut self,
        mempool: &mut Mempool,
        metrics: &mut MetricsEngine
    ) {

        println!("\n🚀 AI Mining Started...");

        // 📊 METRICS
        let metrics_data = metrics.get_metrics(mempool.transactions.len());
        println!("📊 Metrics: {:?}", metrics_data);

        // ⚠️ CONGESTION
        let congestion = congestion_level(&metrics_data);
        println!("⚠️ Congestion Level: {:.2}", congestion);

        // 🤖 DECISION
        let action = decide_action(&metrics_data);
        println!("🤖 Action: {:?}", action);

        // 🔥 APPLY DECISION (SAFE LIMITS)
        match action {
            Action::IncreaseBlockSize => {
                if self.config.block_size < 5 {
                    self.config.block_size += 1;
                }
                println!("⬆ Block size: {}", self.config.block_size);
            }

            Action::DecreaseBlockSize => {
                if self.config.block_size > 1 {
                    self.config.block_size -= 1;
                }
                println!("⬇ Block size: {}", self.config.block_size);
            }

            Action::IncreaseGasPrice => {
                self.config.gas_price += 1;
                println!("💰 Gas price: {}", self.config.gas_price);
            }

            Action::NoChange => {
                println!("➖ No change");
            }
        }

        // 🔥 SELECT TRANSACTIONS (SAFE FALLBACK)
        let txs = mempool.transactions
            .drain(..std::cmp::min(self.config.block_size, mempool.transactions.len()))
            .collect::<Vec<_>>();

        if txs.is_empty() {
            println!("⚠ No transactions to mine");
            return;
        }

        // 🔥 EXISTING FUNCTION CALL (NO BREAK)
        self.add_block(txs);

        // 🔥 METRICS UPDATE
        metrics.record_block_mined();
    }

    // =====================
    // 🔥 ADD BLOCK (UNCHANGED)
    // =====================
    pub fn add_block(&mut self, transactions: Vec<Transaction>) {

        println!("⚙ Using block size: {}", self.config.block_size);
        println!("⚙ Using gas price: {}", self.config.gas_price);

        let previous_block = match self.chain.last() {
            Some(b) => b,
            None => {
                println!("⛔ No previous block found");
                return;
            }
        };

        let new_block = Block::new(
            previous_block.index + 1,
            previous_block.hash.clone(),
            transactions.clone(),
            self.config.difficulty
        );

        if self.is_valid_block(&new_block, previous_block) {

            println!("✅ Block validated successfully");

            self.chain.push(new_block);

            self.telemetry.record_block();

            self.telemetry.total_transactions += transactions.len() as u64;

            for _ in &transactions {
                self.telemetry.record_transaction();
            }

            self.save_chain();

        } else {
            println!("⛔ Block rejected!");
        }
    }

    // =====================
    // 🔥 VALIDATION (UNCHANGED)
    // =====================
    pub fn is_valid_block(&self, new_block: &Block, previous_block: &Block) -> bool {

        if new_block.index != previous_block.index + 1 {
            println!("❌ Invalid index");
            return false;
        }

        if new_block.previous_hash != previous_block.hash {
            println!("❌ Invalid previous hash");
            return false;
        }

        if new_block.calculate_hash() != new_block.hash {
            println!("❌ Invalid block hash");
            return false;
        }

        let target = "0".repeat(self.config.difficulty as usize);

        if !new_block.hash.starts_with(&target) {
            println!("❌ Block does not satisfy difficulty");
            return false;
        }

        true
    }

    // =====================
    // 🔥 CHAIN VALIDATION (UNCHANGED)
    // =====================
    pub fn is_valid_chain(&self, chain: &Vec<Block>) -> bool {

        if chain.is_empty() {
            println!("⛔ Empty chain received");
            return false;
        }

        if chain[0].previous_hash != "0" {
            println!("⛔ Invalid genesis block");
            return false;
        }

        for i in 1..chain.len() {

            let current = &chain[i];
            let previous = &chain[i - 1];

            if !self.is_valid_block(current, previous) {
                println!("⛔ Invalid chain at block {}", i);
                return false;
            }
        }

        true
    }

    // =====================
    // 🔥 CONSENSUS (UNCHANGED)
    // =====================
    pub fn replace_chain(&mut self, new_chain: Vec<Block>) {

        if new_chain.len() > self.chain.len() && self.is_valid_chain(&new_chain) {

            println!("🔁 Replacing chain with longer valid chain");

            self.chain = new_chain;

            self.save_chain();

        } else {
            println!("⛔ Received chain rejected");
        }
    }

    // =====================
    // 🔥 SAVE / LOAD (UNCHANGED)
    // =====================
    pub fn save_chain(&self) {

        match serde_json::to_string(&self.chain) {

            Ok(data) => {
                if let Err(e) = fs::write("chain.json", data) {
                    println!("⛔ Failed to save chain: {}", e);
                } else {
                    println!("💾 Blockchain saved");
                }
            }

            Err(e) => println!("⛔ Serialization failed: {}", e),
        }
    }

    pub fn load_chain(&mut self) {

        match fs::read_to_string("chain.json") {

            Ok(data) => {
                match serde_json::from_str::<Vec<Block>>(&data) {

                    Ok(chain) => {
                        println!("📂 Blockchain loaded from file");
                        self.chain = chain;
                    }

                    Err(e) => println!("⛔ Failed to parse chain: {}", e),
                }
            }

            Err(_) => {
                println!("⚠ No existing chain found (creating new one)");
            }
        }
    }
}

// =====================
// 🔥 NEW: AI HELPERS
// =====================

#[derive(Debug)]
pub enum Action {
    IncreaseBlockSize,
    DecreaseBlockSize,
    IncreaseGasPrice,
    NoChange,
}

pub fn congestion_level(metrics: &NetworkMetrics) -> f64 {
    let mempool_factor = metrics.mempool_size as f64 / 1000.0;
    let tx_factor = metrics.tx_rate / 50.0;
    let block_time_factor = metrics.block_time / 10.0;

    (mempool_factor + tx_factor + block_time_factor) / 3.0
}

pub fn decide_action(metrics: &NetworkMetrics) -> Action {
    let congestion = congestion_level(metrics);

    if congestion > 1.0 {
        Action::IncreaseBlockSize
    } else if congestion < 0.3 {
        Action::DecreaseBlockSize
    } else {
        Action::NoChange
    }
}