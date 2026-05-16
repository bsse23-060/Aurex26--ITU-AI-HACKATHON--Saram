import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { endpoints, type AtRiskStudent, type InstructorDashboard } from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Card } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Icon } from "../components/ui/Icon";
import { cn, fmtPct } from "../lib/cn";

type SortKey = "risk_prob" | "mastery_avg" | "completion_pct" | "days_since_active";
type Filter = "all" | "high" | "burnout" | "active";

export function InstructorHome() {
  const token = useAuth((s) => s.token)!;
  const [data, setData] = useState<InstructorDashboard | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("risk_prob");
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    endpoints.instructorDashboard(token).then(setData);
  }, [token]);

  const filtered = useMemo<AtRiskStudent[]>(() => {
    if (!data) return [];
    return data.students
      .filter((s) => {
        if (filter === "high") return s.risk_band === "high";
        if (filter === "burnout") return s.burnout_flag;
        if (filter === "active") return s.days_since_active <= 7;
        return true;
      })
      .filter((s) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return s.full_name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        const dir = sortKey === "days_since_active" ? 1 : -1;
        return (a[sortKey] - b[sortKey]) * dir;
      });
  }, [data, filter, query, sortKey]);

  if (!data) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-24">
      <div>
        <p className="label-caps text-secondary">Instructor</p>
        <h1 className="display text-36">{data.course_title ?? "Cohort"}</h1>
        <p className="text-ink/60 mt-4">
          {data.total_students} learners · {data.active_last_7d} active in last 7 days
        </p>
      </div>

      <div className="grid gap-12 md:grid-cols-4">
        <StatCard label="High risk" value={data.high_risk_count} tone="danger" />
        <StatCard label="Burnout flags" value={data.burnout_count} tone="warning" />
        <StatCard label="Avg completion" value={fmtPct(data.avg_completion_pct)} tone="primary" />
        <StatCard label="Avg mastery" value={fmtPct(data.avg_mastery)} tone="success" />
      </div>

      <Card pad="sm" accent="primary">
        <div className="p-12 flex flex-wrap items-center gap-8 border-b border-ink/5">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search learners..."
            className="rounded-md border-2 border-line px-12 py-8 text-14 focus:outline-none focus:border-ink/30"
          />
          <Filters filter={filter} setFilter={setFilter} />
          <div className="ml-auto flex items-center gap-8">
            <span className="label-caps text-ink/50">Sort</span>
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="rounded-md border border-line px-8 py-4 font-body text-12 capitalize"
            >
              <option value="risk_prob">Risk</option>
              <option value="mastery_avg">Mastery</option>
              <option value="completion_pct">Completion</option>
              <option value="days_since_active">Idle days</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-14">
            <thead>
              <tr className="text-left label-caps text-ink/50">
                <th className="px-16 py-12">Learner</th>
                <th className="px-12 py-12">Risk</th>
                <th className="px-12 py-12">Mastery</th>
                <th className="px-12 py-12">Completion</th>
                <th className="px-12 py-12">Idle</th>
                <th className="px-12 py-12">Why</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => (
                <motion.tr
                  key={s.user_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}
                  className="border-t border-line hover:bg-neutral/80"
                >
                  <td className="px-16 py-12">
                    <Link to={`/instructor/student/${s.user_id}`} className="flex items-center gap-12">
                      <Avatar name={s.full_name} seed={s.avatar_seed} size={36} />
                      <span>
                        <span className="display text-16">{s.full_name}</span>
                        <span className="block text-12 text-ink/60">{s.email}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-12 py-12">
                    <RiskBadge prob={s.risk_prob} band={s.risk_band} burnout={s.burnout_flag} />
                  </td>
                  <td className="px-12 py-12 w-32">
                    <ProgressBar value={s.mastery_avg} tone="success" />
                    <p className="text-12 mt-2 text-secondary font-body">{fmtPct(s.mastery_avg)}</p>
                  </td>
                  <td className="px-12 py-12 w-32">
                    <ProgressBar value={s.completion_pct} tone="primary" />
                    <p className="text-12 mt-2 text-secondary font-body">{fmtPct(s.completion_pct)}</p>
                  </td>
                  <td className="px-12 py-12 font-body text-12 text-secondary">
                    <span className={cn(s.days_since_active > 7 && "text-warning")}>
                      {s.days_since_active}d
                    </span>
                  </td>
                  <td className="px-12 py-12">
                    <ul className="space-y-2">
                      {s.top_reasons.slice(0, 2).map((r) => (
                        <li key={r.feature} className="text-12 text-ink/70">
                          · {r.label}
                        </li>
                      ))}
                    </ul>
                  </td>
                </motion.tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-16 py-32 text-center text-ink/50">
                    No learners match this filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Filters({ filter, setFilter }: { filter: Filter; setFilter: (f: Filter) => void }) {
  const opts: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "high", label: "High risk" },
    { id: "burnout", label: "Burnout" },
    { id: "active", label: "Active 7d" },
  ];
  return (
    <div className="flex gap-4">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => setFilter(o.id)}
          className={cn(
            "rounded-md border px-12 py-6 font-body text-12 tracking-wide",
            filter === o.id
              ? "border-ink bg-ink text-surface"
              : "border-line bg-surface text-secondary hover:border-ink/20",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string | number; tone: "primary" | "success" | "warning" | "danger" }) {
  const styles: Record<typeof tone, string> = {
    primary: "border-t-primary",
    success: "border-t-success",
    warning: "border-t-warning",
    danger: "border-t-danger",
  };
  return (
    <Card className={cn("border-t-[6px]", styles[tone])} pad="sm">
      <p className="label-caps text-secondary">{label}</p>
      <p className="display text-36">{value}</p>
    </Card>
  );
}

function RiskBadge({ prob, band, burnout }: { prob: number; band: string; burnout: boolean }) {
  const tone = band === "high" ? "danger" : band === "medium" ? "warning" : "success";
  return (
    <div className="flex items-center gap-8">
      <Badge tone={tone}>{fmtPct(prob)}</Badge>
      {burnout && (
        <span className="inline-flex items-center gap-4 font-body text-12 text-warning">
          <Icon name="fire" size={12} /> burnout
        </span>
      )}
    </div>
  );
}
