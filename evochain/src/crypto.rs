use tiny_keccak::{Hasher, Keccak};

pub fn keccak256(data: &str) -> String {

    let mut keccak = Keccak::v256();
    let mut output = [0u8; 32];

    keccak.update(data.as_bytes());
    keccak.finalize(&mut output);

    hex::encode(output)
}