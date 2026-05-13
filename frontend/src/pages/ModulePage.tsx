import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  endpoints,
  type AdaptiveQuiz,
  type ModuleDetail,
  type QuizAnswerResult,
} from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Card, CardTitle } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { ProgressBar } from "../components/ui/ProgressBar";
import { Skeleton } from "../components/ui/Skeleton";
import { Icon } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toaster";
import { cn, fmtPct } from "../lib/cn";

type Phase = "read" | "quiz" | "review";

type AnswerRecord = {
  itemId: number;
  selected: number;
  result: QuizAnswerResult;
  startedAt: number;
};

export function ModulePage() {
  const { id } = useParams();
  const moduleId = Number(id);
  const token = useAuth((s) => s.token)!;
  const toast = useToast();
  const [detail, setDetail] = useState<ModuleDetail | null>(null);
  const [quiz, setQuiz] = useState<AdaptiveQuiz | null>(null);
  const [phase, setPhase] = useState<Phase>("read");
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [retries, setRetries] = useState(0);
  const [startedAt, setStartedAt] = useState<number>(Date.now());
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);

  useEffect(() => {
    setPhase("read");
    setIdx(0);
    setSelected(null);
    setRetries(0);
    setAnswers([]);
    endpoints.module(moduleId, token).then(setDetail);
  }, [moduleId, token]);

  async function startQuiz() {
    const q = await endpoints.adaptiveQuiz(moduleId, token);
    setQuiz(q);
    setPhase("quiz");
    setStartedAt(Date.now());
  }

  async function submit() {
    if (!quiz || selected === null) return;
    const item = quiz.items[idx];
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
    try {
      const result = await endpoints.answerQuiz(
        { quiz_item_id: item.id, selected_index: selected, seconds, retries },
        token,
      );
      setAnswers((a) => [...a, { itemId: item.id, selected, result, startedAt }]);
      if (result.confusion_triggered && result.confusion_message) {
        toast.warn(result.confusion_message, "Confusion detected");
      } else if (result.correct) {
        toast.success(
          `+${fmtPct(result.mastery_delta.after - result.mastery_delta.before)} on ${result.mastery_delta.concept_name}`,
          "Mastery up",
        );
      }
      if (idx + 1 >= quiz.items.length) {
        setPhase("review");
      } else {
        setIdx((i) => i + 1);
        setSelected(null);
        setRetries(0);
        setStartedAt(Date.now());
      }
    } catch (err) {
      toast.fail((err as Error).message);
    }
  }

  if (!detail) return <Skeleton className="h-64" />;

  return (
    <div className="space-y-24">
      <div>
        <Link to="/student" className="label-caps text-secondary hover:text-primary">
          ← back
        </Link>
        <div className="flex flex-wrap items-baseline gap-12 mt-4">
          <h1 className="display text-36">{detail.title}</h1>
          <Badge tone="primary">{detail.estimated_minutes} min</Badge>
        </div>
        <p className="text-ink/60 mt-4">{detail.summary}</p>
      </div>

      {phase === "read" && (
        <div className="grid gap-24 lg:grid-cols-[1fr_320px]">
          <Card accent="primary" className="prose prose-zinc max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{detail.content_md}</ReactMarkdown>
            <div className="mt-16 not-prose">
              <Button onClick={startQuiz} icon={<Icon name="brain" size={14} />}>
                Start adaptive quiz
              </Button>
            </div>
          </Card>
          <aside className="space-y-16">
            <Card accent="secondary">
              <CardTitle kicker="Concepts">In this module</CardTitle>
              <ul className="space-y-8">
                {detail.concepts.map((c) => (
                  <li key={c.id} className="text-14">
                    <p className="display text-16">{c.name}</p>
                    <p className="text-12 text-ink/60">{c.description}</p>
                  </li>
                ))}
              </ul>
            </Card>
            {detail.refresher_concepts.length > 0 && (
              <Card accent="warning">
                <CardTitle kicker="FSRS">Due for review</CardTitle>
                <p className="text-12 text-ink/60 mb-8">
                  These prerequisites are due before you dive in.
                </p>
                <ul className="space-y-4">
                  {detail.refresher_concepts.map((c) => (
                    <li key={c.id} className="text-14 font-body text-warning">
                      · {c.name}
                    </li>
                  ))}
                </ul>
              </Card>
            )}
            {detail.related_recommendations.length > 0 && (
              <Card accent="success">
                <CardTitle kicker="Embedding-rec">Next picks</CardTitle>
                <ul className="space-y-8">
                  {detail.related_recommendations.map((m) => (
                    <li key={m.id}>
                      <Link
                        to={`/student/module/${m.id}`}
                        className="block rounded-md border-2 border-ink/10 px-12 py-8 hover:border-primary hover:text-primary"
                      >
                        <span className="display text-14">{m.title}</span>
                        <span className="block text-12 text-ink/60">{m.summary}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </aside>
        </div>
      )}

      {phase === "quiz" && quiz && (
        <Card accent="primary">
          <div className="flex items-center justify-between mb-12">
            <p className="label-caps text-secondary">
              Question {idx + 1} / {quiz.items.length}
            </p>
            <Badge tone="warning">
              difficulty {quiz.items[idx].difficulty.toFixed(2)}
            </Badge>
          </div>
          <ProgressBar value={idx / quiz.items.length} tone="gradient" />
          <p className="display text-22 mt-16 mb-16">{quiz.items[idx].prompt}</p>
          <div className="grid gap-8 md:grid-cols-2">
            <AnimatePresence>
              {quiz.items[idx].options.map((opt, oi) => (
                <motion.button
                  key={oi}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: oi * 0.04 }}
                  type="button"
                  onClick={() => {
                    if (selected !== null && selected !== oi) setRetries((r) => r + 1);
                    setSelected(oi);
                  }}
                  className={cn(
                    "text-left rounded-md border-2 px-16 py-12 transition-all",
                    selected === oi
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-ink/10 hover:border-primary",
                  )}
                >
                  <span className="label-caps text-secondary mr-8">{String.fromCharCode(65 + oi)}</span>
                  {opt}
                </motion.button>
              ))}
            </AnimatePresence>
          </div>
          <div className="mt-16 flex justify-between">
            <p className="text-12 text-secondary font-body">{quiz.rationale}</p>
            <Button onClick={submit} disabled={selected === null} icon={<Icon name="arrow-right" size={14} />}>
              {idx + 1 === quiz.items.length ? "Finish" : "Next"}
            </Button>
          </div>
        </Card>
      )}

      {phase === "review" && quiz && (
        <Card accent="success">
          <CardTitle kicker="Review">Quiz summary</CardTitle>
          <div className="grid gap-12 md:grid-cols-3 mb-16">
            <Stat label="Correct" value={`${answers.filter((a) => a.result.correct).length} / ${answers.length}`} />
            <Stat
              label="Avg mastery shift"
              value={fmtPct(
                answers.reduce(
                  (a, b) => a + (b.result.mastery_delta.after - b.result.mastery_delta.before),
                  0,
                ) / Math.max(1, answers.length),
              )}
            />
            <Stat
              label="Confusion alerts"
              value={String(answers.filter((a) => a.result.confusion_triggered).length)}
            />
          </div>
          <ul className="space-y-8">
            {answers.map((a, i) => (
              <li key={a.itemId} className="rounded-md border-2 border-ink/5 p-12">
                <div className="flex items-center gap-8 mb-4">
                  <span
                    className={cn(
                      "inline-flex h-6 w-6 items-center justify-center rounded-md text-surface",
                      a.result.correct ? "bg-success" : "bg-danger",
                    )}
                  >
                    <Icon name={a.result.correct ? "check" : "x"} size={12} />
                  </span>
                  <p className="text-14 display">
                    Q{i + 1} · {a.result.mastery_delta.concept_name}
                  </p>
                  <span className="ml-auto label-caps text-secondary">
                    {fmtPct(a.result.mastery_delta.before)} → {fmtPct(a.result.mastery_delta.after)}
                  </span>
                </div>
                <p className="text-12 text-ink/60 mt-4">{a.result.explanation}</p>
              </li>
            ))}
          </ul>
          <div className="mt-16 flex gap-8">
            <Button onClick={startQuiz}>Try another set</Button>
            <Link to="/student">
              <Button variant="ghost">Back to dashboard</Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-ink/5 px-12 py-8">
      <p className="label-caps text-ink/50">{label}</p>
      <p className="display text-22">{value}</p>
    </div>
  );
}
