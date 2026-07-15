"use client";

import { useState, type ReactNode } from "react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardTopBar } from "./DashboardTopBar";

export function DashboardShell({
  active,
  topLeft,
  children,
}: {
  active: string;
  topLeft?: ReactNode;
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

        <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
