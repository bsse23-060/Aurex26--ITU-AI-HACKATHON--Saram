import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  endpoints,
  type Career,
  type Course as CourseType,
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
import { useToast } from "../components/ui/Toaster";
import { cn, fmtPct } from "../lib/cn";

const DIM_LABEL: Record<
  keyof DNAVector,
  { label: string; axis: string; lo: string; hi: string }
> = {
  modality: { label: "Modality", axis: "MODALITY", lo: "Reading", hi: "Visual" },
  depth: { label: "Depth", axis: "DEPTH", lo: "Breadth", hi: "Depth" },
  pace: { label: "Pace", axis: "PACE", lo: "Sprints", hi: "Marathons" },
  abstraction: { label: "Abstraction", axis: "ABSTRACT", lo: "Concrete", hi: "Theory" },
  /** Short axis label avoids clipping at the top of the radar (was "PEAK TIME"). */
  time_of_day: { label: "Peak time", axis: "RHYTHM", lo: "Morning", hi: "Late night" },
};

export function StudentHome() {
  const token = useAuth((s) => s.token)!;
  const user = useAuth((s) => s.user)!;
  const refreshUser = useAuth((s) => s.refreshUser);
  const toast = useToast();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [dna, setDna] = useState<DNAVector | null>(null);
  const [mastery, setMastery] = useState<MasteryRow[]>([]);
  const [career, setCareer] = useState<Career | null>(null);
  const [twin, setTwin] = useState<PeerTwin>(null);
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [loading, setLoading] = useState(true);
  const [switchingId, setSwitchingId] = useState<number | null>(null);

  const loadAll = useCallback(() => {
    setLoading(true);
    return Promise.all([
      endpoints.roadmap(token).catch(() => null),
      endpoints.dna(token).catch(() => null),
      endpoints.mastery(token).catch(() => [] as MasteryRow[]),
      endpoints.career(token).catch(() => null),
      endpoints.twin(token).catch(() => null),
      endpoints.courses(token).catch(() => [] as CourseType[]),
    ]).then(([r, d, m, c, t, cs]) => {
      setRoadmap(r);
      setDna(d);
      setMastery(m);
      setCareer(c);
      setTwin(t);
      setCourses(cs);
      setLoading(false);
    });
  }, [token]);

  useEffect(() => {
    let active = true;
    loadAll().then(() => {
      if (!active) return;
    });
    return () => {
      active = false;
    };
  }, [loadAll]);

  const handleSwitchCourse = useCallback(
    async (courseId: number, title: string) => {
      if (switchingId !== null) return;
      setSwitchingId(courseId);
      try {
        const next = await endpoints.switchCourse(courseId, token);
        await refreshUser();
        await loadAll();
        toast.success(
          `Roadmap rebuilt for ${title} (${next.generated_by === "gemini" ? "Gemini-tailored" : "rule-based"}).`,
          "Track switched",
        );
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Could not switch tracks.";
        toast.fail(detail, "Track switch failed");
      } finally {
        setSwitchingId(null);
      }
    },
    [loadAll, refreshUser, switchingId, toast, token],
  );

  const completion = roadmap
    ? roadmap.steps.filter((s) => s.completed).length / Math.max(1, roadmap.steps.length)
    : 0;
  const masteryAvg =
    mastery.length > 0
      ? mastery.reduce((a, b) => a + b.p_mastery, 0) / mastery.length
      : 0;
  const nextStep = roadmap?.steps.find((s) => !s.completed) ?? null;

  const activeCourseId = user.enrolled_course_id ?? roadmap?.course_id ?? null;
  const sortedCourses = useMemo(
    () =>
      [...courses].sort((a, b) => {
        if (a.id === activeCourseId) return -1;
        if (b.id === activeCourseId) return 1;
        return a.title.localeCompare(b.title);
      }),
    [courses, activeCourseId],
  );

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

      <Card accent="primary">
        <div className="mb-12 flex flex-wrap items-baseline justify-between gap-8">
          <CardTitle kicker="Tracks">Your atomcamp courses</CardTitle>
          <p className="font-body text-12 text-secondary">
            Switch tracks anytime — your DNA and mastery follow you, the roadmap rebuilds.
          </p>
        </div>
        {loading && courses.length === 0 ? (
          <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px]" />
            ))}
          </div>
        ) : courses.length === 0 ? (
          <p className="text-ink/60">No courses available yet — ask an admin to add one.</p>
        ) : (
          <div className="grid gap-12 md:grid-cols-2 xl:grid-cols-3">
            {sortedCourses.map((c) => (
              <CourseCard
                key={c.id}
                course={c}
                active={c.id === activeCourseId}
                switching={switchingId === c.id}
                disabled={switchingId !== null && switchingId !== c.id}
                onSelect={() => handleSwitchCourse(c.id, c.title)}
              />
            ))}
          </div>
        )}
      </Card>

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
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-line font-body text-14",
                      s.completed
                        ? "bg-ink text-surface border-ink"
                        : i === 0
                          ? "bg-neutral text-ink border-ink/30"
                          : "bg-surface text-secondary",
                    )}
                  >
                    {s.completed ? <Icon name="check" size={14} /> : s.position}
                  </span>
                  <div className="flex-1">
                    <Link
                      to={`/student/module/${s.module_id}`}
                      className="display text-18 text-ink hover:underline"
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
                <p className="display text-30 text-ink">
                  {fmtPct(twin.similarity)}
                </p>
                <p className="label-caps text-ink/50">similarity</p>
                <p className="text-12 mt-4 font-body text-secondary">
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
      className="relative overflow-hidden rounded-lg border border-line bg-surface p-24 sm:p-32 shadow-artistic"
    >
      <div className="relative grid gap-20 md:grid-cols-2 md:items-center">
        <div>
          <p className="label-caps">Welcome back</p>
          <h1 className="display text-30 sm:text-36 mt-8 leading-tight text-ink font-normal">
            {user.split(" ")[0]}
          </h1>
          <p className="mt-10 text-16 text-secondary">
            Track · <span className="text-ink">{course}</span>
          </p>
          {nextTitle && (
            <Link
              to={`/student/module/${nextId}`}
              className="mt-16 inline-flex items-center gap-8 rounded-md border border-ink bg-ink px-16 py-12 font-body text-14 text-surface transition-opacity hover:opacity-90"
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
    <div className="rounded-md border border-line bg-neutral px-16 py-12">
      <p className="label-caps">{label}</p>
      <p className="display text-32 mt-8 text-ink">{loading ? "—" : value}</p>
    </div>
  );
}

function DnaRadar({ dna }: { dna: DNAVector }) {
  const dims = Object.keys(DIM_LABEL) as (keyof DNAVector)[];
  const vb = 260;
  const cx = vb / 2;
  const cy = vb / 2;
  const r = 78;
  const labelR = r + 26;
  const points = dims.map((d, i) => {
    const a = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
    const v = dna[d];
    return [cx + Math.cos(a) * r * v, cy + Math.sin(a) * r * v] as const;
  });
  const labelPts = dims.map((d, i) => {
    const a = (Math.PI * 2 * i) / dims.length - Math.PI / 2;
    return { x: cx + Math.cos(a) * labelR, y: cy + Math.sin(a) * labelR, d };
  });
  return (
    <div className="flex w-full min-w-0 flex-col gap-16">
      <svg
        viewBox={`0 0 ${vb} ${vb}`}
        className="mx-auto h-[200px] w-[200px] shrink-0"
        aria-hidden
      >
        {[0.25, 0.5, 0.75, 1].map((s) => (
          <circle
            key={s}
            cx={cx}
            cy={cy}
            r={r * s}
            fill="none"
            stroke="rgba(15,118,110,0.14)"
            strokeWidth={1}
          />
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
              stroke="rgba(15,118,110,0.12)"
              strokeWidth={1}
            />
          );
        })}
        <polygon
          points={points.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="url(#dnaGrad)"
          fillOpacity={0.45}
          stroke="#0f766e"
          strokeWidth={1.5}
        />
        {points.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r={4} fill="#0f766e" stroke="#fff" strokeWidth={1} />
        ))}
        {labelPts.map(({ x, y, d }) => (
          <text
            key={d}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={8.5}
            letterSpacing="0.08em"
            fontFamily="Times New Roman, Times, serif"
            fill="rgb(15,118,110)"
            fontWeight={600}
          >
            {DIM_LABEL[d].axis}
          </text>
        ))}
        <defs>
          <linearGradient id="dnaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ccfbf1" />
            <stop offset="55%" stopColor="#99f6e4" />
            <stop offset="100%" stopColor="#a7f3d0" />
          </linearGradient>
        </defs>
      </svg>
      <ul className="w-full min-w-0 font-body">
        {dims.map((d) => (
          <li
            key={d}
            className="grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-12 border-b border-line py-8 first:pt-0 last:border-b-0"
          >
            <span
              className="h-8 w-8 shrink-0 rounded-full border border-primary/30 bg-aqua-soft"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="text-14 font-medium leading-snug text-ink">{DIM_LABEL[d].label}</p>
              <p className="mt-2 text-12 leading-snug text-secondary">
                {DIM_LABEL[d].lo} → {DIM_LABEL[d].hi}
              </p>
            </div>
            <span className="text-14 tabular-nums font-medium leading-snug text-primary whitespace-nowrap">
              {fmtPct(dna[d])}
            </span>
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
      <div className="mt-12 grid grid-cols-2 gap-8 text-12 font-body">
        <div className="rounded-md border border-line bg-neutral px-8 py-8">
          <span className="text-secondary">Salary</span>
          <p className="text-ink">PKR {career.roles[0].salary_pkr_min / 1000}k–{career.roles[0].salary_pkr_max / 1000}k</p>
        </div>
        <div className="rounded-md border border-line bg-neutral px-8 py-8">
          <span className="text-secondary">Weeks to ready</span>
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
            lateNight ? "border border-line bg-neutral text-warning" : "border border-line bg-neutral text-success",
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
      <ul className="text-12 mt-4 space-y-2 text-secondary font-body">
        <li>· Pace: {fmtPct(dna.pace)}</li>
        <li>· Time of day: {fmtPct(dna.time_of_day)}</li>
      </ul>
    </div>
  );
}

function heatColor(p: number): string {
  const t = Math.max(0, Math.min(1, p));
  const a = 0.18 + t * 0.42;
  return `rgba(64, 64, 64, ${a})`;
}

function CourseCard({
  course,
  active,
  switching,
  disabled,
  onSelect,
}: {
  course: CourseType;
  active: boolean;
  switching: boolean;
  disabled: boolean;
  onSelect: () => void;
}) {
  const moduleCount = course.modules?.length ?? 0;
  return (
    <div
      className={cn(
        "flex h-full flex-col rounded-md border p-16 transition-colors",
        active
          ? "border-primary bg-aqua-soft/60 shadow-bold"
          : "border-line bg-surface hover:border-primary/40 hover:bg-aqua-soft/35",
      )}
    >
      <div className="flex items-start justify-between gap-8">
        <div className="min-w-0">
          <p className="display text-18 leading-tight text-ink">{course.title}</p>
          <p className="font-body text-12 text-secondary mt-2">{course.tagline}</p>
        </div>
        <span
          className="inline-block h-12 w-12 shrink-0 rounded-sm border border-line"
          style={{ background: course.color || "#0F766E" }}
          aria-hidden
        />
      </div>
      <p className="font-body text-12 text-ink/60 mt-8 leading-relaxed line-clamp-3">
        {course.description}
      </p>
      <div className="mt-auto flex items-center justify-between gap-8 pt-12">
        <span className="font-body text-11 uppercase tracking-[0.1em] text-ink/45">
          {moduleCount} {moduleCount === 1 ? "module" : "modules"}
        </span>
        {active ? (
          <Badge tone="success">Active track</Badge>
        ) : (
          <Button
            type="button"
            variant="outline"
            onClick={onSelect}
            loading={switching}
            disabled={disabled || switching}
            icon={<Icon name="arrow-right" size={14} />}
            className="!py-6 !px-12 text-12"
          >
            Switch
          </Button>
        )}
      </div>
    </div>
  );
}
