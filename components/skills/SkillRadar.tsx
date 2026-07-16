import { radarData } from "@/lib/skills";

/** A single small hexagon radar of category averages — the only chart on the page. */
export function SkillRadar() {
  const axes = radarData();
  const n = axes.length;
  const cx = 100;
  const cy = 100;
  const r = 70;

  const point = (i: number, value: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const dist = (value / 100) * r;
    return [cx + dist * Math.cos(angle), cy + dist * Math.sin(angle)];
  };
  const axisPoint = (i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
  };
  const labelPoint = (i: number) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + (r + 18) * Math.cos(angle), cy + (r + 12) * Math.sin(angle)];
  };

  const shape = axes.map((a, i) => point(i, a.value).join(",")).join(" ");
  const rings = [0.33, 0.66, 1];

  return (
    <section className="surface p-5">
      <h3 className="text-sm font-semibold text-white">Your Skill Radar</h3>
      <svg viewBox="0 0 200 200" className="mt-2 w-full" role="img" aria-label="Skill radar by category">
        {rings.map((ring) => (
          <polygon
            key={ring}
            points={axes
              .map((_, i) => {
                const [x, y] = axisPoint(i);
                return `${cx + (x - cx) * ring},${cy + (y - cy) * ring}`;
              })
              .join(" ")}
            fill="none"
            stroke="rgba(148,163,184,0.12)"
            strokeWidth="1"
          />
        ))}
        {axes.map((_, i) => {
          const [x, y] = axisPoint(i);
          return (
            <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(148,163,184,0.12)" strokeWidth="1" />
          );
        })}
        <polygon points={shape} fill="rgba(139,92,246,0.35)" stroke="#a78bfa" strokeWidth="1.5" />
        {axes.map((a, i) => {
          const [x, y] = point(i, a.value);
          return <circle key={i} cx={x} cy={y} r="2.5" fill="#a78bfa" />;
        })}
        {axes.map((a, i) => {
          const [x, y] = labelPoint(i);
          return (
            <text
              key={a.short}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-slate-400 text-[8px]"
            >
              {a.short}
            </text>
          );
        })}
      </svg>
    </section>
  );
}
