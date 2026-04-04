import { Search, TableProperties } from "lucide-react";
import { startTransition, useDeferredValue, useState } from "react";

import {
  fetchBlocks,
  fetchSearchResults,
  fetchTransactions
} from "../api/client";
import { SectionCard } from "../components/common/SectionCard";
import { AppFrame } from "../components/layout/AppFrame";
import { usePollingResource } from "../hooks/usePollingResource";
import type { ChainBlock, ChainTransaction, SearchResponse } from "../types/contracts";

export function ExplorerPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const { data: blocks } = usePollingResource<ChainBlock[]>(() => fetchBlocks(10), [], 9000);
  const { data: transactions } = usePollingResource<ChainTransaction[]>(
    () => fetchTransactions(10),
    [],
    9000
  );
  const { data: searchResults } = usePollingResource<SearchResponse>(
    () =>
      deferredQuery.length >= 2
        ? fetchSearchResults(deferredQuery, 12)
        : Promise.resolve({ query: "", hits: [] }),
    { query: "", hits: [] },
    4000,
    [deferredQuery]
  );

  return (
    <AppFrame
      title="Explorer"
      subtitle="Search indexed blocks, transactions, and governance records"
      mode="indexed"
    >
    
      <SectionCard title="Search" subtitle="Backed by Elasticsearch when available">
        <label className="search-box">
          <Search size={18} />
          <input
            value={query}
            onChange={(event) => {
              const next = event.target.value;
              startTransition(() => {
                setQuery(next);
              });
            }}
            placeholder="Search by block hash, transaction hash, sender, recipient, or proposal..."
          />
        </label>

        {deferredQuery.length >= 2 ? (
          <div className="search-results">
            {searchResults.hits.length ? (
              searchResults.hits.map((hit) => (
                <div key={`${hit.kind}-${hit.id}`} className="search-hit">
                  <div>
                    <strong>{hit.title}</strong>
                    <p>{hit.subtitle}</p>
                  </div>
                  <span className="pill pill--neutral">{hit.kind}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">No indexed results matched this query yet.</div>
            )}
          </div>
        ) : null}
      </SectionCard>

      <section className="content-grid">
        <div className="transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:z-50 rounded-xl border border-transparent hover:border-cyan-400">
        <SectionCard title="Latest Blocks" subtitle="Newest ingested blocks from the miner">
          <div className="table-list">
            {blocks.map((block) => (
              <div key={block.hash} className="table-row">
                <div>
                  <strong>#{block.index}</strong>
                  <span>{truncateHash(block.hash)}</span>
                </div>
                <span>{block.transaction_count} tx</span>
              </div>
            ))}
          </div>
        </SectionCard>
        </div>

      <div className="transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:scale-105 hover:-translate-y-2 hover:shadow-[0_0_40px_rgba(6,182,212,0.4)] hover:z-50 rounded-xl border border-transparent hover:border-cyan-400">
        <SectionCard
          title="Latest Transactions"
          subtitle="Transactions indexed from the last mined blocks"
          actions={<TableProperties size={16} />}
        >
          <div className="table-list">
            {transactions.map((transaction) => (
              <div key={transaction.hash} className="table-row">
                <div>
                  <strong>{truncateHash(transaction.hash)}</strong>
                  <span>
                    {transaction.sender} -&gt; {transaction.recipient}
                  </span>
                </div>
                <span>gas {transaction.gas_price}</span>
              </div>
            ))}
          </div>
        </SectionCard>
        </div>
      </section>
    </AppFrame>
  );
}

function truncateHash(value: string) {
  return value.length > 18 ? `${value.slice(0, 10)}...${value.slice(-6)}` : value;
}