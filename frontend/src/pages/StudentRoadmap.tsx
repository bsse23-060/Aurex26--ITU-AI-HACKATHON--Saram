import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { endpoints, type Roadmap } from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Skeleton } from "../components/ui/Skeleton";
import { Badge } from "../components/ui/Badge";
import { useToast } from "../components/ui/Toaster";
import { Icon } from "../components/ui/Icon";
import { cn, fmtPct } from "../lib/cn";

export function StudentRoadmap() {
  const token = useAuth((s) => s.token)!;
  const toast = useToast();
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    endpoints
      .roadmap(token)
      .then(setRoadmap)
      .finally(() => setLoading(false));
  }, [token]);

  async function complete(id: number | null) {
    if (!id || !roadmap) return;
    try {
      const updated = await endpoints.completeRoadmapStep(id, token);
      setRoadmap({
        ...roadmap,
        steps: roadmap.steps.map((s) => (s.id === id ? updated : s)),
      });
      toast.success("Step marked complete", "Roadmap");
    } catch (err) {
      toast.fail((err as Error).message);
    }
  }

  if (loading) return <Skeleton className="h-64" />;
  if (!roadmap) return <p className="text-ink/60">No roadmap yet.</p>;

  const done = roadmap.steps.filter((s) => s.completed).length;
  const total = roadmap.steps.length;

  return (
    <div className="space-y-24">
      <div>
        <p className="label-caps text-secondary">{roadmap.generated_by.toUpperCase()} plan</p>
        <h1 className="display text-36">{roadmap.course_title}</h1>
        <p className="text-ink/60 mt-4">
          {done}/{total} complete · {fmtPct(done / Math.max(1, total))} of journey
        </p>
      </div>

      <div className="relative pl-24 border-l-2 border-dashed border-secondary/40 space-y-24">
        {roadmap.steps.map((s, i) => (
          <motion.div
            key={s.module_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative"
          >
            <span
              className={cn(
                "absolute -left-[34px] top-12 flex h-16 w-16 items-center justify-center rounded-md text-12 font-display shadow-bold",
                s.completed
                  ? "bg-success text-surface"
                  : i === done
                    ? "bg-artistic-gradient text-surface animate-pulse-ring"
                    : "bg-surface text-ink/60 border-2 border-secondary/40",
              )}
            >
              {s.completed ? <Icon name="check" size={12} /> : s.position}
            </span>
            <Card className="p-20" hover>
              <div className="flex items-start gap-12">
                <div className="flex-1">
                  <div className="flex items-center gap-8 mb-4 flex-wrap">
                    <Badge tone="secondary">Week {s.target_week}</Badge>
                    <Badge tone="ink">{s.estimated_minutes} min</Badge>
                    {s.completed && <Badge tone="success">Done</Badge>}
                  </div>
                  <h3 className="display text-22 mb-4">{s.module_title}</h3>
                  <p className="text-14 text-ink/70 mb-8">{s.module_summary}</p>
                  <p className="text-12 text-secondary font-mono">{s.rationale}</p>
                </div>
                <div className="flex flex-col gap-8 shrink-0">
                  <Link to={`/student/module/${s.module_id}`}>
                    <Button variant={s.completed ? "ghost" : "primary"} icon={<Icon name="book" size={14} />}>
                      {s.completed ? "Revisit" : "Open"}
                    </Button>
                  </Link>
                  {!s.completed && (
                    <Button variant="ghost" onClick={() => complete(s.id)}>
                      Mark complete
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
