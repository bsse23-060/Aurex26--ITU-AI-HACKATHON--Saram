import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { endpoints, type AdminAnalytics } from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Card, CardTitle } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { ProgressBar } from "../components/ui/ProgressBar";
import { fmtPct } from "../lib/cn";

export function AdminHome() {
  const token = useAuth((s) => s.token)!;
  const [data, setData] = useState<AdminAnalytics | null>(null);

  useEffect(() => {
    endpoints.adminAnalytics(token).then(setData);
  }, [token]);

  const funnelMax = useMemo(
    () => (data ? Math.max(1, ...data.funnel.map((f) => f.count)) : 1),
    [data],
  );

  if (!data) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-24">
      <div>
        <p className="label-caps text-secondary">Platform analytics</p>
        <h1 className="display text-36">atomcamp · health</h1>
        <p className="text-ink/60 mt-4">A live cross-section of every track, learner and signal.</p>
      </div>

      <div className="grid gap-16 md:grid-cols-4">
        <KPI label="Learners" value={data.total_learners} />
        <KPI label="Instructors" value={data.total_instructors} />
        <KPI label="Active 7d" value={data.active_last_7d} />
        <KPI label="Avg mastery" value={fmtPct(data.avg_mastery)} />
      </div>

      <Card accent="primary">
        <CardTitle kicker="Funnel">Outcome funnel</CardTitle>
        <div className="space-y-12">
          {data.funnel.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <div className="flex items-baseline justify-between mb-4">
                <span className="display text-18">{f.label}</span>
                <span className="font-mono text-secondary">{f.count}</span>
              </div>
              <ProgressBar value={f.count / funnelMax} tone="gradient" />
            </motion.div>
          ))}
        </div>
      </Card>

      <div>
        <p className="label-caps text-secondary mb-12">Tracks</p>
        <div className="grid gap-16 lg:grid-cols-2">
          {data.tracks.map((t) => (
            <Card key={t.course_id} accent="secondary" hover>
              <div className="flex items-baseline justify-between mb-8">
                <h3 className="display text-22">{t.course_title}</h3>
                <span className="font-mono text-12 text-secondary">{t.enrolled} enrolled</span>
              </div>
              <div className="grid gap-12 md:grid-cols-2">
                <Mini label="Active 7d" value={t.active_last_7d} />
                <Mini label="High risk" value={t.high_risk_count} />
                <div>
                  <p className="label-caps text-ink/50 mb-2">Completion</p>
                  <ProgressBar value={t.avg_completion_pct} tone="primary" />
                </div>
                <div>
                  <p className="label-caps text-ink/50 mb-2">Mastery</p>
                  <ProgressBar value={t.avg_mastery} tone="success" />
                </div>
              </div>
              <Sparkline seed={t.course_id} />
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: number | string }) {
  return (
    <Card accent="primary" pad="sm">
      <p className="label-caps text-secondary">{label}</p>
      <p className="display text-36">{value}</p>
    </Card>
  );
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-ink/5 px-12 py-8">
      <p className="label-caps text-ink/50">{label}</p>
      <p className="display text-22">{value}</p>
    </div>
  );
}

function Sparkline({ seed }: { seed: number }) {
  // Deterministic pseudo-data so the strip is stable across renders.
  const points = Array.from({ length: 14 }, (_, i) => {
    const x = i * 12;
    const y = 28 + Math.sin((seed + i) * 0.7) * 12 + Math.cos((seed + i) * 0.3) * 6;
    return [x, y] as const;
  });
  const max = Math.max(...points.map((p) => p[1]));
  const min = Math.min(...points.map((p) => p[1]));
  const norm = (y: number) => ((y - min) / Math.max(0.0001, max - min)) * 28 + 4;
  const path = points
    .map(([x, y], i) => `${i === 0 ? "M" : "L"} ${x} ${36 - norm(y)}`)
    .join(" ");
  return (
    <svg viewBox="0 0 168 40" className="mt-12 w-full h-[40px]">
      <defs>
        <linearGradient id={`spark${seed}`} x1="0" x2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <path d={path} stroke={`url(#spark${seed})`} strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}
