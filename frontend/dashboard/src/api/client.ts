import type {
  AIInsightsResponse,
  ChainBlock,
  ChainTransaction,
  DashboardSummary,
  GovernanceProposal,
  GovernanceProposalCreate,
  HealthResponse,
  NetworkOverview,
  SearchResponse,
  SecurityAlert
} from "../types/contracts";

const AI_API_URL = import.meta.env.VITE_AI_API_URL ?? "http://localhost:8000";

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${AI_API_URL}${path}`, init);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>("/health");
}

export function fetchDashboardSummary(): Promise<DashboardSummary> {
  return fetchJson<DashboardSummary>("/api/dashboard/summary");
}

export function fetchNetworkOverview(): Promise<NetworkOverview> {
  return fetchJson<NetworkOverview>("/api/network/overview");
}

export function fetchBlocks(limit = 20): Promise<ChainBlock[]> {
  return fetchJson<ChainBlock[]>(`/api/blocks?limit=${limit}`);
}

export function fetchTransactions(limit = 20, q?: string): Promise<ChainTransaction[]> {
  const search = q ? `&q=${encodeURIComponent(q)}` : "";
  return fetchJson<ChainTransaction[]>(`/api/transactions?limit=${limit}${search}`);
}

export function fetchSearchResults(q: string, limit = 12): Promise<SearchResponse> {
  return fetchJson<SearchResponse>(`/api/search?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export function fetchAIInsights(): Promise<AIInsightsResponse> {
  return fetchJson<AIInsightsResponse>("/api/ai/insights");
}

export function fetchSecurityAlerts(limit = 20): Promise<SecurityAlert[]> {
  return fetchJson<SecurityAlert[]>(`/api/security/alerts?limit=${limit}`);
}

export function fetchGovernanceProposals(limit = 20): Promise<GovernanceProposal[]> {
  return fetchJson<GovernanceProposal[]>(`/api/governance/proposals?limit=${limit}`);
}

export function createGovernanceProposal(
  payload: GovernanceProposalCreate
): Promise<GovernanceProposal> {
  return fetchJson<GovernanceProposal>("/api/governance/proposals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });
}
