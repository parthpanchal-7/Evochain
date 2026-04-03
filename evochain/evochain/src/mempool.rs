use crate::transaction::Transaction;

#[derive(Clone)]
pub struct Mempool {
    pub transactions: Vec<Transaction>,
}

impl Mempool {

    pub fn new() -> Self {
        Mempool {
            transactions: Vec::new(),
        }
    }

    // =====================
    // ADD TRANSACTION
    // =====================

    pub fn add_transaction(&mut self, tx: Transaction, metrics: &mut MetricsEngine) {

        if self.transactions.iter().any(|t| 
            t.from == tx.from &&
            t.nonce == tx.nonce &&
            t.to == tx.to &&
            t.value == tx.value
        ) {
            println!("⚠ Duplicate transaction ignored");
            return;
        }

        if tx.gas_price < 1 {
            println!("❌ Low gas tx rejected");
            return;
        }

        println!("✅ Transaction added to mempool");

        // 🔥 ADD THIS
        metrics.record_transaction(tx.gas_price);

        self.transactions.push(tx);
    }
    // =====================
    // GET TRANSACTIONS (MINING)
    // =====================

    pub fn get_transactions(&mut self, limit: usize, min_gas: u64) -> Vec<Transaction> {

        // 🔥 Step 1: Sort (same as before)
        self.transactions
            .sort_by(|a, b| b.gas_price.cmp(&a.gas_price));

        // 🔥 Step 2: Filter + select
        let mut selected = vec![];

        let mut remaining = vec![];

        for tx in self.transactions.drain(..) {
            if tx.gas_price >= min_gas && selected.len() < limit {
                selected.push(tx);
            } else {
                remaining.push(tx);
            }
        }

        // 🔥 Step 3: Put back remaining tx
        self.transactions = remaining;

        selected
    }

    // =====================
    // SIZE
    // =====================

    pub fn size(&self) -> usize {
        self.transactions.len()
    }
}