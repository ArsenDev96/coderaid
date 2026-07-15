"use client";

import { useEffect, useState } from "react";
import { GREETING_SUBTITLE } from "@/lib/dashboard";
import { usePlayer } from "./usePlayer";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function DashboardGreeting() {
  const { name } = usePlayer();
  const firstName = name.split(" ")[0];
  // Server and first client render agree on this default; the real
  // time-of-day greeting is resolved after mount to avoid a hydration mismatch.
  const [greeting, setGreeting] = useState("Good evening");

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <div className="min-w-0">
      <h1 className="truncate text-xl font-bold tracking-tight text-white sm:text-2xl">
        {greeting}, {firstName}! <span className="inline-block">👋</span>
      </h1>
      <p className="hidden text-sm text-slate-400 sm:block">
        {GREETING_SUBTITLE}
      </p>
    </div>
  );
}
