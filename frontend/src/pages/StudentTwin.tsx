import { useEffect, useState } from "react";
import { endpoints, type PeerTwin } from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Card } from "../components/ui/Card";
import { Avatar } from "../components/ui/Avatar";
import { Badge } from "../components/ui/Badge";
import { Skeleton } from "../components/ui/Skeleton";
import { fmtPct } from "../lib/cn";

export function StudentTwin() {
  const token = useAuth((s) => s.token)!;
  const [twin, setTwin] = useState<PeerTwin>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    endpoints
      .twin(token)
      .then(setTwin)
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div className="space-y-24 max-w-3xl">
      <div>
        <p className="label-caps text-secondary">Peer twin</p>
        <h1 className="display text-36">Learn alongside someone like you</h1>
        <p className="text-ink/60 mt-4">
          We match learners whose Learning DNA and current mastery look most like yours, so the
          path that worked for them tells us what to try next for you.
        </p>
      </div>

      {loading && <Skeleton className="h-32" />}
      {!loading && !twin && (
        <Card accent="warning">
          <p className="text-ink/70">No twin yet — make some progress and we'll find one.</p>
        </Card>
      )}
      {!loading && twin && (
        <Card accent="primary">
          <div className="flex items-center gap-16 mb-16">
            <Avatar name={twin.twin_name} seed={twin.avatar_seed} size={72} ring />
            <div>
              <p className="label-caps text-secondary">Twin</p>
              <h2 className="display text-30">{twin.twin_name}</h2>
            </div>
            <div className="ml-auto text-right">
              <p className="display text-36 text-primary">{fmtPct(twin.similarity)}</p>
              <p className="label-caps text-ink/50">similarity</p>
            </div>
          </div>
          <p className="text-14 text-ink/70 mb-12">{twin.note}</p>
          <div className="grid gap-12 md:grid-cols-2">
            <div className="rounded-md bg-ink/5 px-12 py-12">
              <p className="label-caps text-ink/50">Modules ahead</p>
              <p className="display text-30">{twin.modules_ahead}</p>
            </div>
            <div className="rounded-md bg-ink/5 px-12 py-12">
              <p className="label-caps text-ink/50">Shared strengths</p>
              <div className="flex flex-wrap gap-8 mt-4">
                {twin.shared_strengths.length === 0 && (
                  <p className="text-12 text-ink/60">No overlap yet.</p>
                )}
                {twin.shared_strengths.map((s) => (
                  <Badge key={s} tone="secondary">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
