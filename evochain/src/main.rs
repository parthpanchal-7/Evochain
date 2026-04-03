mod crypto;
mod transaction;
mod block;
mod blockchain;
mod config;
mod mempool;
mod network;
mod telemetry;
mod peers;

use transaction::Transaction;
use blockchain::Blockchain;
use mempool::Mempool;
use network::{start_server, send_message, broadcast};
use peers::PeerManager;

use reqwest::blocking::Client;
use serde_json::json;

use std::sync::{Arc, Mutex};

// =====================
// 🧠 AI CALL FUNCTION
// =====================

fn call_ai(
    mempool: Arc<Mutex<Mempool>>,
    blockchain: Arc<Mutex<Blockchain>>
) -> Option<(u64, u64)> {

    let client = Client::new();

    // =====================
    // 🔥 REAL MEMPOOL SIZE + AVG GAS
    // =====================

    let (mempool_size, avg_gas, tx_per_block) = {
        let mp = mempool.lock().unwrap();

        let size = mp.transactions.len();

        let avg = if size > 0 {
            let sum: u64 = mp.transactions.iter().map(|t| t.gas_price).sum();
            sum / size as u64
        } else {
            1
        };

        (size, avg, size)   // 🔥 tx_per_block = mempool size (IMPORTANT)
    };

    // =====================
    // 🔥 REAL BLOCK TIME
    // =====================

    let block_time = {
        let bc = blockchain.lock().unwrap();
        bc.telemetry.get_block_time()
    };

    // =====================
    // 🔥 API CALL
    // =====================

    let response = client.post("http://127.0.0.1:8000/optimize")
        .json(&json!({
            "mempool_size": mempool_size,
            "avg_gas_price": avg_gas,
            "block_time": block_time,
            "tx_per_block": tx_per_block   // ✅ FIXED
        }))
        .send();

    match response {
        Ok(res) => {
            let json: serde_json::Value = res.json().unwrap();

            let block_size = json["new_block_size"].as_u64().unwrap();
            let gas_price = json["new_gas_price"].as_u64().unwrap();

            println!(
                "🧠 AI → mempool: {}, avg_gas: {}, block_time: {}",
                mempool_size, avg_gas, block_time
            );

            println!(
                "⚙ Decision → Block: {}, Gas: {}",
                block_size, gas_price
            );

            Some((block_size, gas_price))
        }

        Err(e) => {
            println!("❌ API Error: {}", e);
            None
        }
    }
}

// =====================
// MAIN
// =====================

fn main() {

    println!("🚀 Starting EvoChain Node...");

    let mempool = Arc::new(Mutex::new(Mempool::new()));
    let blockchain = Arc::new(Mutex::new(Blockchain::new(true)));
    let peer_manager = Arc::new(Mutex::new(PeerManager::new()));

    let args: Vec<String> = std::env::args().collect();

    let port = if args.len() > 1 {
        args[1].clone()
    } else {
        "6000".to_string()
    };

    let address = format!("127.0.0.1:{}", port);
    let address_clone = address.clone();

    println!("🌐 Node starting on {}", address);

    let is_miner = port == "6000";

    if is_miner {
        println!("⛏️ Miner Node (Leader)");
    } else {
        println!("🧾 Validator Node");
    }

    // =====================
    // SERVER
    // =====================

    {
        let mempool_clone = Arc::clone(&mempool);
        let blockchain_clone = Arc::clone(&blockchain);
        let peer_clone = Arc::clone(&peer_manager);

        std::thread::spawn(move || {
            start_server(
                &address_clone,
                mempool_clone,
                blockchain_clone,
                peer_clone
            );
        });
    }

    std::thread::sleep(std::time::Duration::from_millis(500));

    // =====================
    // PEERS
    // =====================

    let bootstrap_peers = vec![
        "127.0.0.1:6000".to_string(),
        "127.0.0.1:6001".to_string(),
        "127.0.0.1:6002".to_string()
    ];

    {
        let mut pm = peer_manager.lock().unwrap();
        for peer in &bootstrap_peers {
            if *peer != address {
                pm.add_peer(peer.clone());
            }
        }
    }

    // announce
    let new_peer_msg = format!(
        r#"{{"type":"NEW_PEER","address":"{}"}}"#,
        address
    );

    for peer in &bootstrap_peers {
        if *peer != address {
            send_message(peer, &new_peer_msg);
        }
    }

    // sync
    let sync_request = r#"{"type":"SYNC_REQUEST"}"#;

    for peer in &bootstrap_peers {
        if *peer != address {
            send_message(peer, sync_request);
        }
    }

    // =====================
    // ⛏️ MINING (AI ENABLED)
    // =====================

    if is_miner {

        println!("🚀 Mining started...");

        for i in 0..50 {

            println!("\n⛏️ Mining block {}", i + 1);

            // 🔥 STEP 1: ADD TRANSACTIONS FIRST (FIXED)
            {
                let mut mp = mempool.lock().unwrap();

                use rand::Rng;

                let mut rng = rand::thread_rng();
                let tx_count = rng.gen_range(2..15);   // dynamic mempool size

                for j in 0..tx_count {
                    let gas = rng.gen_range(3..20);   // dynamic gas
                    let value = rng.gen_range(5..50);

                    let tx = Transaction::new(
                        "UserA".to_string(),
                        "UserB".to_string(),
                        value,
                        gas,
                        j as u64
                    );

                    mp.add_transaction(tx);
                }

                println!("📦 Mempool size: {}", mp.size());
            }

            // 🔥 STEP 2: CALL AI (NOW CORRECT)
            if let Some((new_block_size, new_gas_price)) =
                call_ai(Arc::clone(&mempool), Arc::clone(&blockchain)) {

                let mut bc = blockchain.lock().unwrap();

                bc.config.block_size = new_block_size as usize;
                bc.config.gas_price = new_gas_price;

                println!(
                    "⚙ Updated Config → Block Size: {}, Gas: {}",
                    bc.config.block_size,
                    bc.config.gas_price
                );
            }

            // 🔥 STEP 3: GET CONFIG
            let block_size = {
                let bc = blockchain.lock().unwrap();
                bc.config.block_size
            };

            // 🔥 STEP 4: SELECT TX
            // 🔥 STEP 4: SELECT TX (AI GAS FILTER APPLIED)
            let transactions = {
                let mut mp = mempool.lock().unwrap();

                let gas_price = {
                    let bc = blockchain.lock().unwrap();
                    bc.config.gas_price
                };

                println!("⚙ Using gas price: {}", gas_price);

                let txs = mp.get_transactions(block_size, gas_price);

                println!("📤 Transactions selected: {}", txs.len());

                txs
            };

            // 🔥 STEP 5: ADD BLOCK
            let block_json = {
                let mut bc = blockchain.lock().unwrap();

                bc.add_block(transactions);

                let last_block = bc.chain.last().unwrap();

                println!("✅ Block {} added", last_block.index);

                serde_json::json!({
                    "type": "BLOCK",
                    "block": last_block
                }).to_string()
            };

            // 🔥 STEP 6: BROADCAST
            let peers = {
                let pm = peer_manager.lock().unwrap();
                pm.get_peers()
            };

            println!("📡 Broadcasting to {} peers", peers.len());

            broadcast(peers, &block_json, &address);

            std::thread::sleep(std::time::Duration::from_millis(800));
        }

    } else {
        println!("👀 Waiting for blocks from miner...");
    }

    // =====================
    // PRINT + TELEMETRY
    // =====================

    {
        let bc = blockchain.lock().unwrap();

        println!("\n📊 Blockchain length: {}", bc.chain.len());

        for block in &bc.chain {

            println!("-----------------------------------");
            println!("Block Index: {}", block.index);
            println!("Hash: {}", block.hash);
            println!("Prev Hash: {}", block.previous_hash);

            for tx in &block.transactions {
                println!(
                    "  {} → {} | Value: {}",
                    tx.from, tx.to, tx.value
                );
            }
        }

        // =====================
        // TELEMETRY (SAME LOCK)
        // =====================

        println!("\n📡 --- TELEMETRY ---");

        println!("Total Blocks: {}", bc.chain.len());

        let total_tx: usize = bc.chain.iter()
            .map(|b| b.transactions.len())
            .sum();

        println!("Total Transactions: {}", total_tx);

        println!("Block Time: {} ms", bc.telemetry.get_block_time());

        // =====================
        // 🧠 AI DATA (ADD HERE)
        // =====================

        let (gas_prices, _mempool_sizes, block_times) = bc.get_ai_data();

        println!("\n🧠 AI DATA:");
        println!("Gas Prices: {:?}", gas_prices);
        println!("Block Times: {:?}", block_times);
    }
    loop {
        std::thread::sleep(std::time::Duration::from_secs(60));
    }
}

