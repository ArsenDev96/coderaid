"use client";

import { useRef } from "react";
import type {
  InvestigationTool,
  InvestigationToolId,
  ToolCopy,
} from "@/lib/investigation";

export function tabId(id: InvestigationToolId) {
  return `investigation-tab-${id}`;
}

export function panelId(id: InvestigationToolId) {
  return `investigation-panel-${id}`;
}

export function InvestigationToolTabs({
  tools,
  active,
  onSelect,
}: {
  /** The mission's own tools, in tab order. */
  tools: (InvestigationTool & ToolCopy)[];
  active: InvestigationToolId;
  onSelect: (id: InvestigationToolId) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);

  // Roving arrow-key navigation, per the tabs interaction pattern.
  const onKeyDown = (e: React.KeyboardEvent) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(e.key)) return;
    e.preventDefault();

    const i = tools.findIndex((t) => t.id === active);
    const last = tools.length - 1;
    const next =
      e.key === "ArrowRight"
        ? (i + 1) % tools.length
        : e.key === "ArrowLeft"
          ? (i - 1 + tools.length) % tools.length
          : e.key === "Home"
            ? 0
            : last;

    const target = tools[next];
    onSelect(target.id);
    listRef.current
      ?.querySelector<HTMLButtonElement>(`#${tabId(target.id)}`)
      ?.focus();
  };

  return (
    <div className="thin-scroll -mx-1 overflow-x-auto px-1">
      <div
        ref={listRef}
        role="tablist"
        aria-label="Investigation tools"
        onKeyDown={onKeyDown}
        className="flex min-w-max gap-2 border-b border-white/[0.06] pb-3"
      >
        {tools.map((tool) => {
          const selected = tool.id === active;
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              id={tabId(tool.id)}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={panelId(tool.id)}
              tabIndex={selected ? 0 : -1}
              title={tool.description}
              onClick={() => onSelect(tool.id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors ${
                selected
                  ? "border-violet-400/40 bg-violet-500/15 text-violet-100 shadow-neon"
                  : "border-white/[0.08] bg-white/[0.02] text-slate-400 hover:border-white/20 hover:text-white"
              }`}
            >
              <Icon className="h-4 w-4" strokeWidth={2.2} />
              {tool.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
