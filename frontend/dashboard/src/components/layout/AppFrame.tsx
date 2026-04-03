import type { ReactNode } from "react";

import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

interface AppFrameProps {
  title: string;
  subtitle: string;
  mode?: string;
  children: ReactNode;
}

export function AppFrame({ title, subtitle, mode, children }: AppFrameProps) {
  return (
    <div className="app-shell">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />

      <Sidebar />

      <main className="app-main">
        <TopBar title={title} subtitle={subtitle} mode={mode} />
        {children}
      </main>
    </div>
  );
}
