import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { endpoints, type Career } from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Card } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { ProgressBar } from "../components/ui/ProgressBar";
import { fmtPKR, fmtPct } from "../lib/cn";

export function StudentCareer() {
  const token = useAuth((s) => s.token)!;
  const [career, setCareer] = useState<Career | null>(null);

  useEffect(() => {
    endpoints.career(token).then(setCareer).catch(() => setCareer(null));
  }, [token]);

  if (!career) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-24">
      <div>
        <p className="label-caps text-secondary">Career simulator</p>
        <h1 className="display text-36">Where this gets you in Pakistan</h1>
        <p className="text-ink/60 mt-4">
          Projected mastery and role-readiness based on your weekly hours and current skill state.
        </p>
      </div>

      <div className="grid gap-16 md:grid-cols-4">
        <Card accent="primary">
          <p className="label-caps text-secondary">Now</p>
          <p className="display text-30">{fmtPct(career.current_mastery_avg)}</p>
          <p className="text-12 text-ink/60 mt-4">average mastery</p>
        </Card>
        {career.projections.map((p) => (
          <Card key={p.horizon_weeks} accent="secondary">
            <p className="label-caps text-secondary">{p.label}</p>
            <p className="display text-30">{fmtPct(p.projected_mastery_avg)}</p>
            <p className="text-12 text-ink/60 mt-4">{p.horizon_weeks}w projection</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-16">
        {career.roles.map((r, i) => (
          <motion.div
            key={r.role_slug}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card accent={i === 0 ? "primary" : "none"} pad="md">
              <div className="grid gap-16 md:grid-cols-[1fr_220px]">
                <div>
                  <div className="flex items-baseline gap-8 flex-wrap mb-4">
                    <h3 className="display text-24">{r.role_title}</h3>
                    {i === 0 && <Badge tone="primary">Top match</Badge>}
                    <Badge tone="ink">demand {fmtPct(r.market_demand)}</Badge>
                  </div>
                  <p className="text-14 text-ink/70 mb-12">{r.description}</p>
                  <ProgressBar value={r.match_pct / 100} tone="gradient" label={`Match · ${Math.round(r.match_pct)}%`} />
                  {r.skill_gaps.length > 0 && (
                    <>
                      <p className="label-caps text-secondary mt-16 mb-4">Skill gaps to close</p>
                      <div className="flex flex-wrap gap-8">
                        {r.skill_gaps.map((g) => (
                          <span
                            key={g.concept_slug}
                            className="inline-flex items-center gap-8 rounded-md bg-warning/10 text-warning px-12 py-4 font-mono text-12"
                          >
                            <span>{g.concept_name}</span>
                            <span className="opacity-70">
                              {fmtPct(g.current)} → {fmtPct(g.required)}
                            </span>
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </div>
                <aside className="space-y-12">
                  <div className="rounded-md bg-ink/5 px-12 py-8">
                    <p className="label-caps text-ink/50">Salary (PKR / mo)</p>
                    <p className="display text-22">
                      {fmtPKR(r.salary_pkr_min)}–{fmtPKR(r.salary_pkr_max)}
                    </p>
                  </div>
                  <div className="rounded-md bg-ink/5 px-12 py-8">
                    <p className="label-caps text-ink/50">Weeks to ready</p>
                    <p className="display text-22">{r.weeks_to_ready ?? "—"}</p>
                  </div>
                </aside>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
