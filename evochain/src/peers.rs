#[derive(Clone)]
pub struct PeerManager {
    pub peers: Vec<String>,
}

impl PeerManager {

    // 🔥 Initialize
    pub fn new() -> Self {
        PeerManager {
            peers: Vec::new(),
        }
    }

    // 🔥 Add peer safely
    pub fn add_peer(&mut self, peer: String) {

        if !self.peers.contains(&peer) {
            println!("🌐 New peer added: {}", peer);
            self.peers.push(peer);
        }
    }

    // 🔥 Get all peers
    pub fn get_peers(&self) -> Vec<String> {
        self.peers.clone()
    }
}