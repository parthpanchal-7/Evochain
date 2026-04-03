import type { ReactNode } from "react";

type ProcessStatus = "active" | "ready" | "waiting";

export interface ProcessStep {
  id: string;
  title: string;
  description: string;
  meta: string;
  status: ProcessStatus;
  icon: ReactNode;
}

interface ProcessFlowProps {
  steps: ProcessStep[];
}

export function ProcessFlow({ steps }: ProcessFlowProps) {
  return (
    <div className="process-grid">
      {steps.map((step, index) => (
        <article
          key={step.id}
          className={`process-card process-card--${step.status}`}
        >
          <div className="process-card__top">
            <div className="process-card__icon">{step.icon}</div>
            <span className={`process-pill process-pill--${step.status}`}>
              {labelFor(step.status)}
            </span>
          </div>

          <div className="process-card__body">
            <span className="process-index">Step {index + 1}</span>
            <strong>{step.title}</strong>
            <p>{step.description}</p>
          </div>

          <div className="process-card__meta">{step.meta}</div>
        </article>
      ))}
    </div>
  );
}

function labelFor(status: ProcessStatus) {
  if (status === "active") {
    return "Live";
  }

  if (status === "ready") {
    return "Ready";
  }

  return "Waiting";
}
