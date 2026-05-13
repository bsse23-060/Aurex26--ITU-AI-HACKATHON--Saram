import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { endpoints, type StudentDetail } from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Card, CardTitle } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Skeleton } from "../components/ui/Skeleton";
import { Icon } from "../components/ui/Icon";
import { fmtPct } from "../lib/cn";

export function InstructorStudent() {
  const { id } = useParams();
  const token = useAuth((s) => s.token)!;
  const [s, setS] = useState<StudentDetail | null>(null);

  useEffect(() => {
    endpoints.studentDetail(Number(id), token).then(setS);
  }, [id, token]);

  if (!s) return <Skeleton className="h-64" />;
  const tone = s.risk_prob >= 0.66 ? "danger" : s.risk_prob >= 0.33 ? "warning" : "success";

  return (
    <div className="space-y-24">
      <div>
        <Link to="/instructor" className="label-caps text-secondary hover:text-primary">
          ← cohort
        </Link>
        <div className="mt-8 flex items-center gap-16">
          <Avatar name={s.full_name} seed={s.avatar_seed} size={64} ring />
          <div>
            <h1 className="display text-36">{s.full_name}</h1>
            <p className="text-12 font-body text-ink/60">
              {s.email} · {s.course_title}
            </p>
          </div>
          <div className="ml-auto text-right">
            <Badge tone={tone}>Risk {fmtPct(s.risk_prob)}</Badge>
            {s.burnout_flag && (
              <span className="block text-12 font-body text-warning mt-4">
                <Icon name="fire" size={12} /> burnout
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-16 md:grid-cols-4">
        <Stat label="Mastery" value={fmtPct(s.mastery_avg)} />
        <Stat label="Completion" value={fmtPct(s.completion_pct)} />
        <Stat label="Attempts 14d" value={s.recent_attempts} />
        <Stat label="Tutor Qs 14d" value={s.recent_tutor_questions} />
      </div>

      <div className="grid gap-24 lg:grid-cols-2">
        <Card accent="danger">
          <CardTitle kicker="Explainer">Why we flagged this</CardTitle>
          <ul className="space-y-12">
            {s.top_reasons.map((r) => (
              <li key={r.feature} className="rounded-md border-2 border-ink/10 p-12">
                <p className="display text-16">{r.label}</p>
                <ProgressBar value={Math.min(1, Math.abs(r.contribution))} tone="warning" />
                <p className="text-12 font-body text-ink/50 mt-4">
                  feature · {r.feature} · contribution {r.contribution.toFixed(2)}
                </p>
              </li>
            ))}
            {s.top_reasons.length === 0 && (
              <li className="text-ink/60">No strong negative signals. Keep monitoring.</li>
            )}
          </ul>
        </Card>

        <Card accent="primary">
          <CardTitle kicker="Concept mastery">Where the gaps are</CardTitle>
          <ul className="space-y-8 max-h-[420px] overflow-y-auto scrollbar-thin">
            {s.concept_mastery
              .sort((a, b) => a.avg_mastery - b.avg_mastery)
              .slice(0, 10)
              .map((c) => (
                <li key={c.concept_id} className="rounded-md border-2 border-ink/5 p-12">
                  <p className="display text-14">{c.concept_name}</p>
                  <p className="text-12 text-ink/50">{c.module_title}</p>
                  <ProgressBar value={c.avg_mastery} tone={c.avg_mastery < 0.4 ? "danger" : "primary"} />
                  <p className="text-12 mt-2 text-ink/50 font-body">{fmtPct(c.avg_mastery)}</p>
                </li>
              ))}
          </ul>
        </Card>
      </div>

      <Card accent="warning">
        <CardTitle kicker="Confusion">Behavioral signal</CardTitle>
        <p className="text-14 text-ink/70">
          {s.confusion_incidents > 0
            ? `${s.confusion_incidents} confusion incidents logged from quiz attempts.`
            : "No confusion incidents detected."}
        </p>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card pad="sm">
      <p className="label-caps text-secondary">{label}</p>
      <p className="display text-30">{value}</p>
    </Card>
  );
}
