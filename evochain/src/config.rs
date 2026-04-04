#[derive(Clone)]
pub struct ChainConfig {

    pub difficulty: u32,
    pub block_size: usize,
    pub gas_price: u64,

}

impl ChainConfig {

    pub fn new() -> Self {

        ChainConfig {
            difficulty: 2,
            block_size: 2,
            gas_price: 1,
        }

    }

}