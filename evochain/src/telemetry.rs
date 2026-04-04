use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone)]
pub struct Telemetry {

    pub total_transactions: u64,
    pub total_blocks: u64,
    pub last_block_time: u128,
    pub current_block_time: u128,

}

impl Telemetry {

    pub fn new() -> Self {

        Telemetry {
            total_transactions: 0,
            total_blocks: 0,
            last_block_time: 0,
            current_block_time: 0,
        }

    }

    pub fn record_transaction(&mut self) {
        self.total_transactions += 1;
    }

    pub fn record_block(&mut self) {

        self.total_blocks += 1;

        self.last_block_time = self.current_block_time;

        self.current_block_time = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis();
    }

    pub fn get_block_time(&self) -> u128 {

        if self.last_block_time == 0 {
            return 0;
        }

        self.current_block_time - self.last_block_time
    }

}