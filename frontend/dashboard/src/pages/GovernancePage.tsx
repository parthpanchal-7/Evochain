import { FormEvent, useState } from "react";
import { Check, Vote } from "lucide-react";

import {
  createGovernanceProposal,
  fetchGovernanceProposals
} from "../api/client";
import { SectionCard } from "../components/common/SectionCard";
import { AppFrame } from "../components/layout/AppFrame";
import { usePollingResource } from "../hooks/usePollingResource";
import type { GovernanceProposalCreate } from "../types/contracts";

const initialForm: GovernanceProposalCreate = {
  title: "",
  summary: "",
  category: "scalability",
  proposer: "community",
  ai_recommended: false
};

export function GovernancePage() {
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: proposals } = usePollingResource(
    () => fetchGovernanceProposals(20),
    [],
    10000,
    [revision]
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage(null);

    try {
      await createGovernanceProposal(form);
      setForm(initialForm);
      setMessage("Proposal submitted to the governance feed.");
      setRevision((value) => value + 1);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to submit proposal.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AppFrame
      title="Governance"
      subtitle="Operator and community proposals stored by the platform API"
      mode="collaborative"
    >
      {message ? <div className="banner">{message}</div> : null}

      <section className="content-grid">
        <SectionCard title="Create Proposal" subtitle="Push a governance item into the live proposal feed">
          <form className="proposal-form" onSubmit={onSubmit}>
            <input
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              placeholder="Proposal title"
              required
            />
            <input
              value={form.category}
              onChange={(event) => setForm({ ...form, category: event.target.value })}
              placeholder="Category"
              required
            />
            <input
              value={form.proposer}
              onChange={(event) => setForm({ ...form, proposer: event.target.value })}
              placeholder="Proposer"
              required
            />
            <textarea
              value={form.summary}
              onChange={(event) => setForm({ ...form, summary: event.target.value })}
              placeholder="What should the network change?"
              rows={5}
              required
            />
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={form.ai_recommended}
                onChange={(event) =>
                  setForm({ ...form, ai_recommended: event.target.checked })
                }
              />
              <span>AI-recommended proposal</span>
            </label>
            <button className="primary-button" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Proposal"}
            </button>
          </form>
        </SectionCard>

        <SectionCard
          title="Active Proposals"
          subtitle="Current governance items visible to the dashboard"
          actions={
            <div className="status-badge">
              <Vote size={14} />
              <span>{proposals.length} items</span>
            </div>
          }
        >
          <div className="proposal-list">
            {proposals.map((proposal) => (
              <article key={proposal.id} className="proposal-card">
                <div className="proposal-card__header">
                  <div>
                    <strong>{proposal.title}</strong>
                    <p>{proposal.category} | {proposal.proposer}</p>
                  </div>
                  {proposal.ai_recommended ? (
                    <span className="pill pill--ok">
                      <Check size={12} />
                      AI
                    </span>
                  ) : (
                    <span className="pill pill--neutral">{proposal.status}</span>
                  )}
                </div>
                <p>{proposal.summary}</p>
                <div className="proposal-card__votes">
                  <span>For {proposal.votes_for}</span>
                  <span>Against {proposal.votes_against}</span>
                </div>
              </article>
            ))}
          </div>
        </SectionCard>
      </section>
    </AppFrame>
  );
}
