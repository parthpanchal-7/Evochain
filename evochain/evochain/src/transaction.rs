use serde::{Serialize, Deserialize};

#[derive(Serialize, Deserialize, Clone)]
pub struct Transaction {
    pub from: String,
    pub to: String,
    pub value: u64,
    pub gas_price: u64,
    pub nonce: u64,
}

impl Transaction {

    pub fn new(from:String, to:String, value:u64, gas_price:u64, nonce:u64) -> Self {

        Transaction {
            from,
            to,
            value,
            gas_price,
            nonce
        }
    }
}