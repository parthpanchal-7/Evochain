use std::time::{Instant, Duration};

#[derive(Clone, Debug)]
pub struct NetworkMetrics {
    pub mempool_size: usize,
    pub tx_rate: f64,
    pub block_time: f64,
    pub avg_gas_price: f64,
}

pub struct MetricsEngine {
    tx_count: usize,
    last_reset: Instant,
    last_block_time: Instant,
    gas_prices: Vec<f64>,
}

impl MetricsEngine {
    pub fn new() -> Self {
        Self {
            tx_count: 0,
            last_reset: Instant::now(),
            last_block_time: Instant::now(),
            gas_prices: Vec::new(),
        }
    }

    // 📥 Call when new transaction arrives
    pub fn record_transaction(&mut self, gas_price: f64) {
        self.tx_count += 1;
        self.gas_prices.push(gas_price);
    }

    // ⛏ Call when block is mined
    pub fn record_block_mined(&mut self) {
        self.last_block_time = Instant::now();
    }

    // 📊 Calculate current metrics
    pub fn get_metrics(&mut self, mempool_size: usize) -> NetworkMetrics {
        let now = Instant::now();

        // TX RATE (transactions per second)
        let elapsed = now.duration_since(self.last_reset).as_secs_f64();
        let tx_rate = if elapsed > 0.0 {
            self.tx_count as f64 / elapsed
        } else {
            0.0
        };

        // BLOCK TIME
        let block_time = now.duration_since(self.last_block_time).as_secs_f64();

        // AVG GAS PRICE
        let avg_gas_price = if self.gas_prices.is_empty() {
            0.0
        } else {
            self.gas_prices.iter().sum::<f64>() / self.gas_prices.len() as f64
        };

        // Reset counters every 10 seconds (window-based metrics)
        if elapsed > 10.0 {
            self.tx_count = 0;
            self.gas_prices.clear();
            self.last_reset = now;
        }

        NetworkMetrics {
            mempool_size,
            tx_rate,
            block_time,
            avg_gas_price,
        }
    }
}