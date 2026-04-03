import {
  Activity,
  Bot,
  Compass,
  Info,
  Shield,
  Vote
} from "lucide-react";
import { NavLink } from "react-router-dom";

const links = [
  { to: "/", label: "Dashboard", icon: Activity },
  { to: "/ai-insights", label: "AI Insights", icon: Bot },
  { to: "/explorer", label: "Explorer", icon: Compass },
  { to: "/security", label: "Security", icon: Shield },
  { to: "/governance", label: "Governance", icon: Vote },
  { to: "/about", label: "About", icon: Info }
];

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark" />
        <div>
          <div className="brand-text">
  <strong>EvoChain AI</strong>
  {/* Wrapping in a div or using display: block in CSS achieves the image result */}
  <div className="brand-subtitle">Adaptive control plane</div>
</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                isActive ? "sidebar-link sidebar-link--active" : "sidebar-link"
              }
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <span>Rust + FastAPI + Mongo + Redis + Search</span>
      </div>
    </aside>
  );
}
