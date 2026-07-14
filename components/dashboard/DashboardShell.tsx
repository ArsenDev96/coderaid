"use client";

import { useState, type ReactNode } from "react";
import { Lightbulb } from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";

export function DashboardShell({
  active,
  topLeft,
  footerTip,
  children,
}: {
  active: string;
  topLeft?: ReactNode;
  footerTip?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:flex">
      <DashboardSidebar
        active={active}
        open={open}
        onClose={() => setOpen(false)}
      />

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <DashboardTopBar onMenu={() => setOpen(true)} left={topLeft} />

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>

        {footerTip && (
          <footer className="border-t border-white/[0.06]">
            <div className="mx-auto flex max-w-[1400px] items-center justify-center gap-2 px-4 py-5 text-center text-sm text-slate-400 sm:px-6">
              <Lightbulb className="h-4 w-4 shrink-0 text-amber-400" />
              <span>{footerTip}</span>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}
