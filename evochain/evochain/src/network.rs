use std::net::{TcpListener, TcpStream};
use std::io::{Read, Write};
use std::thread;

use serde_json::Value;

use crate::transaction::Transaction;
use crate::mempool::Mempool;
use crate::blockchain::Blockchain;
use crate::block::Block;
use crate::peers::PeerManager;

use std::sync::{Arc, Mutex};

// =====================
// START SERVER
// =====================

pub fn start_server(
    address: &str,
    mempool: Arc<Mutex<Mempool>>,
    blockchain: Arc<Mutex<Blockchain>>,
    peer_manager: Arc<Mutex<PeerManager>>
) {

    let listener = TcpListener::bind(address)
        .expect("Could not start server");

    println!("🚀 Node listening on {}", address);

    for stream in listener.incoming() {

        match stream {

            Ok(stream) => {

                let mempool_clone = Arc::clone(&mempool);
                let blockchain_clone = Arc::clone(&blockchain);
                let peer_clone = Arc::clone(&peer_manager);
                let self_address = address.to_string();

                thread::spawn(move || {
                    handle_connection(
                        stream,
                        mempool_clone,
                        blockchain_clone,
                        peer_clone,
                        self_address
                    );
                });

            }

            Err(e) => {
                println!("Connection failed: {}", e);
            }

        }
    }
}

// =====================
// HANDLE CONNECTION
// =====================

fn handle_connection(
    mut stream: TcpStream,
    mempool: Arc<Mutex<Mempool>>,
    blockchain: Arc<Mutex<Blockchain>>,
    peer_manager: Arc<Mutex<PeerManager>>,
    self_address: String
) {

    let mut buffer = [0; 4096];

    match stream.read(&mut buffer) {

        Ok(size) => {

            let message = String::from_utf8_lossy(&buffer[..size]);

            println!("📥 Incoming connection...");
            println!("📦 Received raw: {}", message);

            let parsed: Value = match serde_json::from_str(&message) {
                Ok(v) => v,
                Err(e) => {
                    println!("⛔ Invalid JSON: {}", e);
                    return;
                }
            };

            let msg_type = parsed["type"].as_str().unwrap_or("");

            // =====================
            // NEW PEER
            // =====================

            if msg_type == "NEW_PEER" {

                let peer = parsed["address"].as_str().unwrap().to_string();

                println!("🌐 New peer discovered: {}", peer);

                let mut pm = peer_manager.lock().unwrap();
                pm.add_peer(peer);
            }

            // =====================
            // TRANSACTION
            // =====================

            else if msg_type == "TRANSACTION" {

                println!("💰 Transaction received");

                let tx = Transaction::new(
                    parsed["from"].as_str().unwrap().to_string(),
                    parsed["to"].as_str().unwrap().to_string(),
                    parsed["value"].as_u64().unwrap(),
                    parsed["gas"].as_u64().unwrap(),
                    parsed["nonce"].as_u64().unwrap(),
                );

                {
                    let mut mp = mempool.lock().unwrap();
                    mp.add_transaction(tx);
                }

                println!("✅ Transaction stored");

                // Broadcast TX
                let peers = peer_manager.lock().unwrap().get_peers();
                broadcast(peers, &message, &self_address);
            }

            // =====================
            // BLOCK
            // =====================

            else if msg_type == "BLOCK" {

                println!("📦 Block received");

                let block: Block = match serde_json::from_value(parsed["block"].clone()) {
                    Ok(b) => b,
                    Err(_) => {
                        println!("⛔ Invalid block format");
                        return;
                    }
                };

                let mut bc = blockchain.lock().unwrap();

                // =====================
                // ✅ 1. DUPLICATE CHECK
                // =====================
                if bc.chain.iter().any(|b| b.hash == block.hash) {
                    println!("⚠ Block already exists, skipping...");
                    return;
                }

                let last_block = bc.chain.last().unwrap();

                // =====================
                // ✅ 2. OLD BLOCK CHECK
                // =====================
                if block.index <= last_block.index {
                    println!("⚠ Old block received, ignoring...");
                    return;
                }

                // =====================
                // ✅ 3. VALIDATION
                // =====================
                if block.index == last_block.index + 1 &&
                block.previous_hash == last_block.hash &&
                block.hash.starts_with(&"0".repeat(block.difficulty as usize)) {

                    println!("✅ Block validated → added");

                    bc.chain.push(block.clone());
                    bc.save_chain();

                    // =====================
                    // 🔥 OPTIONAL RE-BROADCAST (CONTROLLED)
                    // =====================
                    let peers = peer_manager.lock().unwrap().get_peers();

                    for peer in peers {
                        if peer != self_address {
                            send_message(&peer, &message);
                        }
                    }

                } else {

                    println!("⚠ Invalid block → requesting sync");

                    drop(bc); // 🔥 release lock before network ops

                    let peers = peer_manager.lock().unwrap().get_peers();

                    for peer in peers {
                        if peer != self_address {
                            send_message(&peer, r#"{"type":"SYNC_REQUEST"}"#);
                        }
                    }
                }
            }
            // =====================
            // SYNC REQUEST
            // =====================

            else if msg_type == "SYNC_REQUEST" {

                println!("📡 Sync request received");

                let bc = blockchain.lock().unwrap();

                let response = serde_json::json!({
                    "type": "SYNC_RESPONSE",
                    "chain": bc.chain
                }).to_string();

                let peers = peer_manager.lock().unwrap().get_peers();

                for peer in peers {
                    if peer != self_address {
                        send_message(&peer, &response);
                    }
                }
            }

            // =====================
            // SYNC RESPONSE
            // =====================

            else if msg_type == "SYNC_RESPONSE" {

                println!("📥 Sync response received");

                let chain_value = parsed["chain"].clone();

                let incoming_chain: Vec<Block> = match serde_json::from_value(chain_value) {
                    Ok(chain) => chain,
                    Err(e) => {
                        println!("⛔ Invalid chain format: {}", e);
                        return;
                    }
                };

                let mut bc = blockchain.lock().unwrap();

                if incoming_chain.len() > bc.chain.len() {
                    println!("🔄 Replacing chain with longer one");
                    bc.replace_chain(incoming_chain);
                }
            }
        }

        Err(_) => {
            println!("Failed to read message");
        }
    }
}

// =====================
// SEND MESSAGE
// =====================

pub fn send_message(address: &str, message: &str) {

    match TcpStream::connect(address) {

        Ok(mut stream) => {

            if let Err(e) = stream.write(message.as_bytes()) {
                println!("⛔ Send failed: {}", e);
            }

            println!("📤 Sent → {}", address);

        }

        Err(_) => {
            println!("❌ Could not connect to {}", address);
        }
    }
}

// =====================
// BROADCAST
// =====================

pub fn broadcast(peers: Vec<String>, message: &str, self_address: &str) {

    for peer in peers {

        if peer != self_address {

            println!("📡 Sending to {}", peer);

            match TcpStream::connect(&peer) {   // 🔥 FIX: add &
                Ok(mut stream) => {
                    stream.write_all(message.as_bytes()).unwrap();
                    println!("✅ Sent to {}", peer);
                }

                Err(_) => {
                    println!("❌ Failed to connect to {}", peer);
                }
            }
        }
    }
}