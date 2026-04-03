use serde::{Serialize, Deserialize};
use crate::transaction::Transaction;
use crate::crypto::keccak256;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Serialize, Deserialize, Clone)]
pub struct Block {

    pub index: u64,
    pub timestamp: u128,
    pub previous_hash: String,
    pub hash: String,
    pub nonce: u64,
    pub difficulty: u32,
    pub transactions: Vec<Transaction>,
}

impl Block {

    pub fn new(index: u64, previous_hash: String, transactions: Vec<Transaction>, difficulty: u32) -> Self {

        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();

        let mut block = Block {
            index,
            timestamp,
            previous_hash,
            hash: String::new(),
            nonce: 0,
            difficulty,
            transactions,
        };

        block.mine_block();

        block
    }

    pub fn calculate_hash(&self) -> String {

        let data = format!(
            "{}{}{}{}{}",
            self.index,
            self.timestamp,
            self.previous_hash,
            self.nonce,
            serde_json::to_string(&self.transactions).unwrap()
        );

        keccak256(&data)
    }

    fn mine_block(&mut self) {

        let target = "0".repeat(self.difficulty as usize);

        loop {

            let hash = self.calculate_hash();

            if hash.starts_with(&target) {

                self.hash = hash;
                println!("Block mined: {}", self.hash);
                break;
            }

            self.nonce += 1;
        }
    }
}