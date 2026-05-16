import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { endpoints, type SkillGraph, type SkillNode } from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { fmtPct } from "../lib/cn";

export function StudentSkillGraph() {
  const token = useAuth((s) => s.token)!;
  const [graph, setGraph] = useState<SkillGraph | null>(null);
  const [hover, setHover] = useState<SkillNode | null>(null);

  useEffect(() => {
    endpoints.skillGraph(token).then(setGraph).catch(() => setGraph({ nodes: [], edges: [] }));
  }, [token]);

  const layout = useMemo(() => {
    if (!graph) return null;
    const byModule = new Map<number, SkillNode[]>();
    graph.nodes.forEach((n) => {
      if (!byModule.has(n.module_id)) byModule.set(n.module_id, []);
      byModule.get(n.module_id)!.push(n);
    });
    const modules = Array.from(byModule.entries()).sort(([a], [b]) => a - b);
    const W = 900;
    const H = 520;
    const colWidth = W / Math.max(1, modules.length);
    const pos = new Map<number, { x: number; y: number; module: string }>();
    modules.forEach(([, nodes], colIdx) => {
      const rowGap = H / (nodes.length + 1);
      nodes.forEach((n, ri) => {
        pos.set(n.id, {
          x: colIdx * colWidth + colWidth / 2,
          y: rowGap * (ri + 1),
          module: n.module_title,
        });
      });
    });
    return { W, H, pos };
  }, [graph]);

  if (!graph) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-24">
      <div>
        <p className="label-caps text-secondary">Skill graph</p>
        <h1 className="display text-36">Concept network</h1>
        <p className="text-ink/60 mt-4">
          Each node is a concept. Edges are prerequisites. Hover to inspect mastery.
        </p>
        <div className="flex gap-8 mt-12">
          <Badge tone="success">mastered</Badge>
          <Badge tone="primary">learning</Badge>
          <Badge tone="ink">locked</Badge>
        </div>
      </div>
      <Card accent="primary" pad="sm" className="overflow-hidden">
        {layout && (
          <div className="relative w-full overflow-x-auto">
            <svg
              viewBox={`0 0 ${layout.W} ${layout.H}`}
              className="w-full h-[520px]"
              onMouseLeave={() => setHover(null)}
            >
              <defs>
                <linearGradient id="edgeGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#a3a3a3" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#737373" stopOpacity="0.5" />
                </linearGradient>
              </defs>
              {graph.edges.map((e, i) => {
                const a = layout.pos.get(e.src);
                const b = layout.pos.get(e.dst);
                if (!a || !b) return null;
                const mx = (a.x + b.x) / 2;
                return (
                  <path
                    key={i}
                    d={`M ${a.x} ${a.y} C ${mx} ${a.y}, ${mx} ${b.y}, ${b.x} ${b.y}`}
                    stroke="url(#edgeGrad)"
                    strokeWidth={1.5}
                    fill="none"
                  />
                );
              })}
              {graph.nodes.map((n, i) => {
                const p = layout.pos.get(n.id);
                if (!p) return null;
                const r = 12 + n.p_mastery * 12;
                const fill =
                  n.state === "mastered"
                    ? "#525252"
                    : n.state === "learning"
                      ? "#a3a3a3"
                      : "rgba(163,163,163,0.35)";
                return (
                  <motion.g
                    key={n.id}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.01 }}
                  >
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r={r}
                      fill={fill}
                      opacity={0.85}
                      stroke="white"
                      strokeWidth={2}
                      onMouseEnter={() => setHover(n)}
                      style={{ cursor: "pointer" }}
                    />
                    <text
                      x={p.x}
                      y={p.y + r + 12}
                      textAnchor="middle"
                      fontSize={10}
                      fontFamily="JetBrains Mono"
                      fill="rgba(17,24,39,0.7)"
                    >
                      {n.name.length > 18 ? `${n.name.slice(0, 16)}…` : n.name}
                    </text>
                  </motion.g>
                );
              })}
            </svg>
            {hover && (
              <div className="absolute bottom-12 right-12 max-w-xs rounded-lg bg-surface shadow-bold p-12 border-l-[6px] border-secondary">
                <p className="label-caps text-secondary">{hover.module_title}</p>
                <p className="display text-18">{hover.name}</p>
                <p className="text-14 mt-4">Mastery · {fmtPct(hover.p_mastery)}</p>
                <p className="label-caps text-ink/40 mt-4">{hover.state}</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}
