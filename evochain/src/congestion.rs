use crate::metrics::NetworkMetrics;
use std::time::{Instant, Duration};

pub struct CongestionController {
    last_check: Instant,
    high_load_duration: Duration,
}

impl CongestionController {

    pub fn new() -> Self {
        Self {
            last_check: Instant::now(),
            high_load_duration: Duration::from_secs(0),
        }
    }

    // 🔥 MAIN FUNCTION
    pub fn detect_and_decide(&mut self, metrics: &NetworkMetrics) -> bool {

        let now = Instant::now();
        let elapsed = now.duration_since(self.last_check);
        self.last_check = now;

        // =========================
        // 🔥 RAW CONDITIONS
        // =========================

        let mempool_high = metrics.mempool_size > 40;
        let tx_rate_high = metrics.tx_rate > 8.0;
        let block_time_high = metrics.block_time > 2.0;

        let is_high_load =
            (mempool_high && tx_rate_high) ||
            (mempool_high && block_time_high) ||
            (tx_rate_high && block_time_high);

        // =========================
        // 🔥 TIME-BASED LOGIC
        // =========================

        if is_high_load {
            self.high_load_duration += elapsed;
        } else {
            self.high_load_duration = Duration::from_secs(0);
        }

        println!(
            "📊 mempool: {}, tx_rate: {:.2}, block_time: {:.2}",
            metrics.mempool_size,
            metrics.tx_rate,
            metrics.block_time
        );

        println!(
            "⏱ Sustained high load: {} sec",
            self.high_load_duration.as_secs()
        );

        // =========================
        // 🔥 FINAL DECISION
        // =========================

        if self.high_load_duration.as_secs() >= 3 {
            println!("🚨 CONGESTION DETECTED");
            return true;
        }

        false
    }
}