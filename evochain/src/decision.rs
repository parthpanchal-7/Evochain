use crate::blockchain::Blockchain;

pub fn apply_congestion_response(
    bc: &mut Blockchain,
    is_congested: bool,
    _avg_gas: f64,
    ai_block: u64,
    ai_gas: u64,
) {

    println!("🧠 Applying Decision...");

    if is_congested {

        println!("🚨 CONGESTION DETECTED");

        // 🔥 SMART BLOCK SIZE (controlled jump, not sudden)
        let target_block = ai_block as usize;

        if target_block > bc.config.block_size {
            bc.config.block_size = (bc.config.block_size + 1).min(5);
        }

        // 🔥 GAS LOGIC (use RL suggestion but safe)
        if ai_gas > bc.config.gas_price {
            bc.config.gas_price += 1;
        }

    } else {

        println!("✅ NORMAL STATE");

        // 🔥 OPTIONAL: slight normalization (no sudden drop)
        if bc.config.block_size > 1 {
            bc.config.block_size -= 1;
        }

        if bc.config.gas_price > 1 {
            bc.config.gas_price -= 1;
        }
    }

    println!(
        "⚙ FINAL CONFIG → Block Size: {}, Gas Price: {}",
        bc.config.block_size,
        bc.config.gas_price
    );
}