import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  endpoints,
  type Career,
  type DNAVector,
  type MasteryRow,
  type PeerTwin,
  type Roadmap,
} from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Card, CardTitle } from "../components/ui/Card";
import { Skeleton } from "../components/ui/Skeleton";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Badge } from "../components/ui/Badge";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { cn, fmtPct } from "../lib/cn";

const DIM_LABEL: Record<keyof DNAVector, { label: string; lo: string; hi: string }> = {
  modality: { label: "Modality", lo: "Reading", hi: "Visual" },
  depth: { label: "Depth", lo: "Breadth", hi: "Depth" },
  pace: { label: "Pace", lo: "Sprints", hi: "Marathons" },
  abstraction: { label: "Abstraction", lo: "Concrete", hi: "Theory" },
  time_of_day: { label: "Peak time", lo: "Morning", hi: "Late night" },
};

export function StudentHome() {
  const token = useAuth((s) => s.token)!;
  const user = useAuth((s) => s.user)!;
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [dna, setDna] = useState<DNAVector | null>(null);
  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [career, setCareer] = useState<Career | null>(null);
  const [twin, setTwin] = useState<PeerTwin>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ok = true;
    setLoading(true);
    Promise.all([
      endpoints.roadmap(token).catch(() => null),
      endpoints.dna(token).catch(() => null),
      endpoints.mastery(token).catch(() => [] as MasteryRow[]),
      endpoints.career(token).catch(() => null),
      endpoints.twin(token).catch(() => null),
    ]).then(([r, d, m, c, t]) => {
      if (!ok) return;
      setRoadmap(r);
      setDna(d);
      setMastery(m);
      setCareer(c);
      setTwin(t);
      setLoading(false);
    });
    return () => {
      ok = false;
    };
  }, [token]);

  const completion = roadmap
    ? roadmap.steps.filter((s) => s.completed).length / Math.max(1, roadmap.steps.length)
    : 0;
  const masteryAvg =
    mastery.length > 0
      ? mastery.reduce((a, b) => a + b.p_mastery, 0) / mastery.length
      : 0;
  const nextStep = roadmap?.steps.find((s) => !s.completed) ?? null;

  return (
    <div className="space-y-24">
      <Hero
        user={user.full_name}
        course={roadmap?.course_title ?? "Pick a track"}
        completion={completion}
        masteryAvg={masteryAvg}
        loading={loading}
        nextTitle={nextStep?.module_title}
        nextId={nextStep?.module_id}
      />

      <div className="grid gap-24 lg:grid-cols-3">
        <Card accent="primary" className="lg:col-span-2">
          <CardTitle kicker="LLM-tailored">Your roadmap</CardTitle>
          {loading ? (
            <Skeleton className="h-40" />
          ) : roadmap ? (
            <ul className="space-y-12">
              {roadmap.steps.slice(0, 5).map((s, i) => (
                <li key={s.module_id} className="flex items-start gap-12">
                  <span
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-md font-display text-14",
                      s.completed
                        ? "bg-success text-surface"
                        : i === 0
                          ? "bg-artistic-gradient text-surface"
                          : "bg-ink/10 text-ink/60",
                    )}
                  >
                    {s.completed ? <Icon name="check" size={14} /> : s.position}
                  </span>
                  <div className="flex-1">
                    <Link
                      to={`/student/module/${s.module_id}`}
                      className="display text-18 hover:text-primary"
                    >
                      {s.module_title}
                    </Link>
                    <p className="text-12 text-ink/60 mt-2">{s.rationale}</p>
                    <p className="label-caps text-secondary mt-4">
                      Week {s.target_week} · {s.estimated_minutes}m
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink/60">No roadmap yet.</p>
          )}
          <div className="mt-16">
            <Link to="/student/roadmap">
              <Button variant="outline" icon={<Icon name="map" size={14} />}>
                Full roadmap
              </Button>
            </Link>
          </div>
        </Card>

        <Card accent="secondary">
          <CardTitle kicker="Fingerprint">Learning DNA</CardTitle>
          {loading || !dna ? (
            <Skeleton className="h-40" />
          ) : (
            <DnaRadar dna={dna} />
          )}
        </Card>
      </div>

      <div className="grid gap-24 lg:grid-cols-2">
        <Card accent="warning">
          <CardTitle kicker="Mastery">Concept mastery heatmap</CardTitle>
          {loading ? (
            <Skeleton className="h-32" />
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-10 gap-4">
              {mastery.slice(0, 60).map((m) => (
                <div
                  key={m.concept_id}
                  title={`${m.concept_name} — ${fmtPct(m.p_mastery)}`}
                  className="aspect-square rounded-sm"
                  style={{ background: heatColor(m.p_mastery) }}
                />
              ))}
              {mastery.length === 0 && (
                <p className="col-span-full text-ink/60">Take a module quiz to seed mastery.</p>
              )}
            </div>
          )}
          {mastery.length > 0 && (
            <p className="label-caps text-secondary mt-12">
              {mastery.length} concepts tracked · avg {fmtPct(masteryAvg)}
            </p>
          )}
        </Card>

        <Card accent="success">
          <CardTitle kicker="Career sim">Top role match</CardTitle>
          {loading ? (
            <Skeleton className="h-32" />
          ) : career && career.roles.length > 0 ? (
            <CareerHighlight career={career} />
          ) : (
            <p className="text-ink/60">Complete a module to unlock career projections.</p>
          )}
        </Card>
      </div>

      <div className="grid gap-24 lg:grid-cols-3">
        <Card className="lg:col-span-2" accent="primary">
          <CardTitle kicker="Peer twin">Most similar learner</CardTitle>
          {loading ? (
            <Skeleton className="h-24" />
          ) : twin ? (
            <div className="flex items-center gap-16">
              <Avatar name={twin.twin_name} seed={twin.avatar_seed} size={56} ring />
              <div className="flex-1">
                <p className="display text-22">{twin.twin_name}</p>
                <p className="text-14 text-ink/60">{twin.note}</p>
                <div className="flex flex-wrap gap-8 mt-8">
                  {twin.shared_strengths.map((s) => (
                    <Badge key={s} tone="secondary">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <p className="display text-30 text-primary">
                  {fmtPct(twin.similarity)}
                </p>
                <p className="label-caps text-ink/50">similarity</p>
                <p className="text-12 mt-4 font-mono text-secondary">
                  +{twin.modules_ahead} modules ahead
                </p>
              </div>
            </div>
          ) : (
            <p className="text-ink/60">We'll find your twin once you have some progress.</p>
          )}
        </Card>

        <Card accent="danger">
          <CardTitle kicker="Burnout signal">Wellness</CardTitle>
          <BurnoutBadge dna={dna} />
        </Card>
      </div>
    </div>
  );
}

function Hero({
  user,
  course,
  completion,
  masteryAvg,
  nextTitle,
  nextId,
  loading,
}: {
  user: string;
  course: string;
  completion: number;
  masteryAvg: number;
  nextTitle?: string;
  nextId?: number;
  loading: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-xl border-2 border-ink/5 bg-artistic-gradient text-surface p-32 shadow-bold"
    >
      <div className="absolute inset-0 opacity-30 bg-grid [background-size:24px_24px]" />
      <div className="relative grid gap-16 md:grid-cols-2 items-center">
        <div>
          <p className="label-caps opacity-80">Welcome back</p>
          <h1 className="display text-36 sm:text-48 mt-4 leading-tight">{user.split(" ")[0]}</h1>
          <p className="mt-8 opacity-90">
            Track · <span className="font-mono">{course}</span>
          </p>
          {nextTitle && (
            <Link
              to={`/student/module/${nextId}`}
              className="inline-flex items-center gap-8 mt-16 rounded-md bg-surface text-ink font-mono text-12 uppercase tracking-widest px-16 py-12 shadow-bold hover:translate-y-[-2px] transition-transform"
            >
              Continue → {nextTitle}
            </Link>
          )}
        </div>
        <div className="grid grid-cols-2 gap-16">
          <Stat label="Completion" value={fmtPct(completion)} loading={loading} />
          <Stat label="Avg mastery" value={fmtPct(masteryAvg)} loading={loading} />
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, loading }: { label: string; value: string; loading?: boolean }) {
  return (
    <div className="rounded-md bg-surface/15 px-16 py-12 backdrop-blur-sm border border-surface/20">
      <p className="label-caps opacity-80">{label}</p>
      <p className="display text-36 mt-4">{loading ? "—" : value}</p>
    </div>
  );
}

function DnaRadar({ dna }: { dna: DNAVector }) {
  const dims = Object.keys(DIM_LABEL) as (keyof DNAVector)[];
  const cx = 110;
  const cy = 110;
  const r = 85;
  const points = dims.map((d, i) => {
    const a = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
    const v = dna[d];
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v] as const;
  });
  const labelPts = dims.map((d, i) => {
    const a = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
    return { x: cx + Math.cos(a) * (r + 18), y: cy + Math.sin(a) * (r + 18), d };
  });
  return (
    <div className="flex items-center gap-16">
      <svg viewBox="0 0 220 220" className="h-[220px] w-[220px] shrink-0">
        {[0.25, 0.5, 0.75, 1].map((s) => (
          <circle key={s} cx={cx} cy={cy} r={r * s} fill="none" stroke="rgba(17,24,39,0.08)" />
        ))}
        {dims.map((_, i) => {
          const a = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx}
              y1={cy}
              x2={cx + Math.cos(a) * r}
              y2={cy + Math.sin(a) * r}
              stroke="rgba(17,24,39,0.06)"
            />
          );
        })}
        <polygon
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="url(#dnaGrad)"
          fillOpacity="0.5"
          stroke="#8B5CF6"
          strokeWidth="2"
        />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={3.5} fill="#8B5CF6" />
        ))}
        {labelPts.map(({ x, y, d }) => (
          <text
            key={d}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="9"
            fontFamily="JetBrains Mono"
            fill="rgba(17,24,39,0.65)"
          >
            {DIM_LABEL[d].label.toUpperCase()}
          </text>
        ))}
        <defs>
          <linearGradient id="dnaGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>
      <ul className="space-y-4 text-12 font-mono">
        {dims.map((d) => (
          <li key={d} className="flex items-center gap-8">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary" />
            <span className="text-ink/70 w-20">{DIM_LABEL[d].label}</span>
            <span className="text-ink/40">
              {DIM_LABEL[d].lo} → {DIM_LABEL[d].hi}
            </span>
            <span className="ml-auto text-primary">{fmtPct(dna[d])}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CareerHighlight({ career }: { career: Career }) {
  const top = career.roles[0];
  return (
    <div>
      <p className="display text-24 mb-8">{top.role_title}</p>
      <ProgressBar value={top.match_pct / 100} label={`Match · ${Math.round(top.match_pct)}%`} />
      <div className="mt-12 grid grid-cols-2 gap-8 text-12 font-mono">
        <div className="rounded-md bg-ink/5 px-8 py-4">
          <span className="text-ink/50">Salary</span>
          <p className="text-ink">PKR {career.roles[0].salary_pkr_min / 1000}k–{career.roles[0].salary_pkr_max / 1000}k</p>
        </div>
        <div className="rounded-md bg-ink/5 px-8 py-4">
          <span className="text-ink/50">Weeks to ready</span>
          <p className="text-ink">{top.weeks_to_ready ?? "—"}</p>
        </div>
      </div>
      <div className="mt-12">
        <Link to="/student/career">
          <Button variant="ghost" icon={<Icon name="career" size={14} />}>
            Simulate career
          </Button>
        </Link>
      </div>
    </div>
  );
}

function BurnoutBadge({ dna }: { dna: DNAVector | null }) {
  if (!dna) return <Skeleton className="h-16" />;
  const lateNight = dna.time_of_day > 0.7;
  return (
    <div>
      <div className="flex items-center gap-12">
        <span
          className={cn(
            "inline-flex h-12 w-12 items-center justify-center rounded-md",
            lateNight ? "bg-warning/20 text-warning" : "bg-success/20 text-success",
          )}
        >
          <Icon name={lateNight ? "alert" : "check"} size={18} />
        </span>
        <div>
          <p className="display text-18">{lateNight ? "Watch fatigue" : "Healthy rhythm"}</p>
          <p className="text-12 text-ink/60">
            {lateNight
              ? "Late-night peaks — keep sessions under 45 minutes."
              : "Cadence looks sustainable. Keep it going."}
          </p>
        </div>
      </div>
      <p className="label-caps text-secondary mt-12">Signals</p>
      <ul className="text-12 mt-4 space-y-2 text-ink/70 font-mono">
        <li>· Pace: {fmtPct(dna.pace)}</li>
        <li>· Time of day: {fmtPct(dna.time_of_day)}</li>
      </ul>
    </div>
  );
}

function heatColor(p: number): string {
  const t = Math.max(0, Math.min(1, p));
  // gradient from danger -> warning -> primary -> success
  if (t < 0.33) return `rgba(220,38,38,${0.25 + t * 0.6})`;
  if (t < 0.66) return `rgba(217,119,6,${0.3 + t * 0.5})`;
  return `rgba(22,163,74,${0.35 + t * 0.55})`;
}
