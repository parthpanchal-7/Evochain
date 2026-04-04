export interface TelemetrySnapshot {
  mempool_size: number;
  avg_gas_price: number;
  avg_block_time_ms: number;
  network_load: number;
  throughput_tps: number;
  last_block_size: number;
  peer_count: number;
  chain_height: number;
}

export interface ForecastSummary {
  predicted_mempool_size: number;
  predicted_load: number;
  trend: string;
  model?: string;
  confidence?: number;
}

export interface OptimizationDecision {
  block_size: number;
  gas_price: number;
  confidence: number;
  rationale: string[];
  policy?: string;
}

export interface OptimizationResponse {
  node_id: string;
  generated_at: string;
  forecast: ForecastSummary;
  decision: OptimizationDecision;
  simulation_status: string;
}

export interface OptimizationRecord extends OptimizationResponse {
  snapshot: TelemetrySnapshot;
  reward?: number | null;
}

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
  mode?: string;
  dependencies?: Record<string, string>;
}

export interface ChainTransaction {
  hash: string;
  sender: string;
  recipient: string;
  value: number;
  gas_price: number;
  nonce: number;
}

export interface ChainBlock {
  index: number;
  timestamp_ms: number;
  previous_hash: string;
  hash: string;
  nonce: number;
  difficulty: number;
  transaction_count: number;
  transactions: ChainTransaction[];
}

export interface NetworkOverview {
  chain_height: number;
  latest_block_hash: string;
  pending_transactions: number;
  current_gas_price: number;
  block_size: number;
  avg_block_time_ms: number;
  throughput_tps: number;
  peer_count: number;
  network_load: number;
  latest_forecast_trend: string;
  optimizer_confidence: number;
  last_updated: string;
  mode: string;
}

export interface TelemetryPoint {
  timestamp: string;
  mempool_size: number;
  avg_gas_price: number;
  avg_block_time_ms: number;
  throughput_tps: number;
  network_load: number;
  block_size: number;
}

export interface SecurityAlert {
  id: string;
  level: "info" | "warning" | "critical";
  kind: string;
  message: string;
  node_id?: string | null;
  created_at: string;
  metrics: Record<string, string | number>;
}

export interface GovernanceProposal {
  id: string;
  title: string;
  summary: string;
  category: string;
  status: "active" | "passed" | "rejected";
  proposer: string;
  votes_for: number;
  votes_against: number;
  ai_recommended: boolean;
  created_at: string;
}

export interface GovernanceProposalCreate {
  title: string;
  summary: string;
  category: string;
  proposer: string;
  ai_recommended: boolean;
}

export interface SearchHit {
  kind: "block" | "transaction" | "proposal";
  id: string;
  title: string;
  subtitle: string;
  metadata: Record<string, unknown>;
}

export interface SearchResponse {
  query: string;
  hits: SearchHit[];
}

export interface DashboardSummary {
  overview: NetworkOverview;
  recent_blocks: ChainBlock[];
  recent_transactions: ChainTransaction[];
  telemetry_history: TelemetryPoint[];
  latest_optimization: OptimizationRecord | null;
  alerts: SecurityAlert[];
}

export interface AIInsightsResponse {
  latest_optimization: OptimizationRecord | null;
  recent_optimizations: OptimizationRecord[];
  telemetry_history: TelemetryPoint[];
  model_status: Record<string, unknown>;
  dependency_status: Record<string, string>;
}
