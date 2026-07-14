"use client";

import { usePlayer } from "./usePlayer";

export function DashboardGreeting() {
  const { name } = usePlayer();
  const firstName = name.split(" ")[0];

  return (
    <div className="min-w-0">
      <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
        Welcome back, <span className="text-gradient">{firstName}</span>{" "}
        <span className="inline-block">👋</span>
      </h1>
      <p className="hidden text-sm text-slate-400 sm:block">
        Ready to solve real problems and level up?
      </p>
    </div>
  );
}
