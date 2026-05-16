import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  endpoints,
  type Course,
  type DiagnosticItem,
  type DnaScenario,
  type Roadmap,
} from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { useToast } from "../components/ui/Toaster";
import { cn } from "../lib/cn";

type Step = 0 | 1 | 2 | 3;

export function OnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { token, user, setSession } = useAuth();
  const [step, setStep] = useState<Step>(0);

  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState<number | null>(null);
  const [goal, setGoal] = useState<string>("Land a junior data role");
  const [weeklyHours, setWeeklyHours] = useState(6);
  const [priorExp, setPriorExp] = useState("beginner");
  const [langPref, setLangPref] = useState("auto");

  const [scenarios, setScenarios] = useState<DnaScenario[]>([]);
  const [dnaAnswers, setDnaAnswers] = useState<Record<string, number>>({});

  const [diagnostic, setDiagnostic] = useState<DiagnosticItem[]>([]);
  const [diagAnswers, setDiagAnswers] = useState<Record<number, number>>({});

  const [submitting, setSubmitting] = useState(false);
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null);

  useEffect(() => {
    if (!token) return;
    endpoints.courses(token).then(setCourses).catch(() => setCourses([]));
    endpoints
      .dnaScenarios(token)
      .then((d) => setScenarios(d.scenarios))
      .catch(() => setScenarios([]));
  }, [token]);

  useEffect(() => {
    if (step === 2 && courseId && token) {
      endpoints
        .diagnostic(courseId, token)
        .then((d) => setDiagnostic(d.items))
        .catch(() => setDiagnostic([]));
    }
  }, [step, courseId, token]);

  const dna = useMemo(() => {
    const groups: Record<string, number[]> = {};
    scenarios.forEach((s) => {
      const a = dnaAnswers[s.id];
      if (a === undefined) return;
      if (!groups[s.dim]) groups[s.dim] = [];
      groups[s.dim].push(a);
    });
    return {
      modality: avg(groups.modality, 0.5),
      depth: avg(groups.depth, 0.5),
      pace: avg(groups.pace, 0.5),
      abstraction: avg(groups.abstraction, 0.5),
      time_of_day: avg(groups.time_of_day, 0.5),
    };
  }, [scenarios, dnaAnswers]);

  const canAdvance: Record<Step, boolean> = {
    0: courseId !== null && goal.trim().length > 1,
    1: scenarios.length > 0 && scenarios.every((s) => dnaAnswers[s.id] !== undefined),
    2: diagnostic.length === 0 || diagnostic.every((q) => diagAnswers[q.quiz_item_id] !== undefined),
    3: false,
  };

  async function finish() {
    if (!token || !courseId || !user) return;
    setSubmitting(true);
    try {
      const diagPayload = diagnostic.map((q) => ({
        concept_slug: q.concept_slug,
        correct: diagAnswers[q.quiz_item_id] === 0, // option 0 is typically the canonical correct in our seed
      }));
      const result = await endpoints.completeOnboarding(
        {
          course_id: courseId,
          goal,
          prior_experience: priorExp,
          weekly_hours: weeklyHours,
          language_pref: langPref,
          dna,
          diagnostic: diagPayload,
        },
        token,
      );
      setRoadmap(result);
      setStep(3);
      const refreshed = await endpoints.me(token);
      setSession(token, refreshed);
      toast.success("Your personalised roadmap is ready.", "Onboarding complete");
    } catch (err) {
      toast.fail((err as Error).message, "Onboarding failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <BgBlobs />
      <div className="relative mx-auto max-w-5xl px-24 py-32">
        <Header step={step} />
        <AnimatePresence mode="wait">
          {step === 0 && (
            <Panel key="track">
              <h2 className="display text-30 mb-12">Choose your track</h2>
              <p className="text-ink/60 mb-24 max-w-xl">
                Pick the program you want to crush this cohort. We'll calibrate everything from
                here.
              </p>
              <div className="grid gap-16 md:grid-cols-2">
                {courses.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCourseId(c.id)}
                    className={cn(
                      "card text-left p-24 transition-shadow hover:shadow-bold",
                      courseId === c.id ? "ring-1 ring-ink/25 border-ink/20" : "",
                    )}
                  >
                    <p className="label-caps mb-8">{c.icon}</p>
                    <h3 className="display text-22 mb-4 font-normal">{c.title}</h3>
                    <p className="text-14 text-secondary mb-12">{c.tagline}</p>
                    <p className="text-12 font-body text-secondary">
                      {c.modules.length} modules · {sumMinutes(c)}h estimated
                    </p>
                  </button>
                ))}
              </div>
              <div className="mt-24 grid gap-16 md:grid-cols-3">
                <FieldBlock label="Your goal">
                  <input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} />
                </FieldBlock>
                <FieldBlock label="Weekly hours">
                  <input
                    type="number"
                    min={1}
                    max={40}
                    className="input"
                    value={weeklyHours}
                    onChange={(e) => setWeeklyHours(Number(e.target.value))}
                  />
                </FieldBlock>
                <FieldBlock label="Prior experience">
                  <select
                    className="input"
                    value={priorExp}
                    onChange={(e) => setPriorExp(e.target.value)}
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </FieldBlock>
                <FieldBlock label="Tutor language">
                  <select
                    className="input"
                    value={langPref}
                    onChange={(e) => setLangPref(e.target.value)}
                  >
                    <option value="auto">Auto-detect (recommended)</option>
                    <option value="english">English only</option>
                    <option value="roman_urdu">Roman Urdu / Urdu</option>
                  </select>
                </FieldBlock>
              </div>
            </Panel>
          )}

          {step === 1 && (
            <Panel key="dna">
              <h2 className="display text-30 mb-12">Learning DNA</h2>
              <p className="text-ink/60 mb-24 max-w-xl">
                Six quick scenarios. We capture how you learn — modality, depth, pace, abstraction
                and the time of day you peak.
              </p>
              <div className="space-y-16">
                {scenarios.map((s, i) => (
                  <div key={s.id} className="card p-24">
                    <p className="label-caps text-secondary mb-8">
                      Scenario {i + 1} · {s.dim}
                    </p>
                    <p className="text-18 mb-16">{s.prompt}</p>
                    <div className="flex flex-wrap gap-8">
                      {s.options.map((o) => {
                        const active = dnaAnswers[s.id] === o.value;
                        return (
                          <button
                            key={o.label}
                            type="button"
                            onClick={() =>
                              setDnaAnswers((d) => ({ ...d, [s.id]: o.value }))
                            }
                            className={cn(
                              "rounded-md border px-16 py-12 text-14 transition-colors",
                              active
                                ? "border-ink bg-ink text-surface"
                                : "border-line bg-surface text-ink hover:border-ink/25",
                            )}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {step === 2 && (
            <Panel key="diag">
              <h2 className="display text-30 mb-12">5-question diagnostic</h2>
              <p className="text-ink/60 mb-24 max-w-xl">
                Just to calibrate where you start. No grade — your mastery gets seeded from this.
              </p>
              <div className="space-y-16">
                {diagnostic.map((q, idx) => (
                  <div key={q.quiz_item_id} className="card p-24">
                    <p className="label-caps text-secondary mb-8">
                      Q{idx + 1} · {q.concept_slug}
                    </p>
                    <p className="text-18 mb-16">{q.prompt}</p>
                    <div className="grid gap-8 md:grid-cols-2">
                      {q.options.map((opt, oi) => {
                        const picked = diagAnswers[q.quiz_item_id] === oi;
                        return (
                          <button
                            key={oi}
                            type="button"
                            onClick={() =>
                              setDiagAnswers((d) => ({ ...d, [q.quiz_item_id]: oi }))
                            }
                            className={cn(
                              "rounded-md border px-16 py-12 text-14 text-left transition-colors",
                              picked
                                ? "border-ink bg-neutral text-ink"
                                : "border-line bg-surface hover:border-ink/20",
                            )}
                          >
                            <span className="font-body text-12 text-secondary mr-8">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
                {diagnostic.length === 0 && (
                  <p className="text-ink/60">No diagnostic for this track. Continue.</p>
                )}
              </div>
            </Panel>
          )}

          {step === 3 && roadmap && (
            <Panel key="reveal">
              <p className="label-caps text-secondary mb-8">
                Generated by · {roadmap.generated_by.toUpperCase()}
              </p>
              <h2 className="display text-36 mb-16 font-normal">
                Your roadmap: {roadmap.course_title}
              </h2>
              <p className="text-ink/60 mb-24 max-w-xl">
                {roadmap.steps.length} modules personalised to your DNA. Hit the dashboard to
                start.
              </p>
              <div className="space-y-12">
                {roadmap.steps.map((s, i) => (
                  <motion.div
                    key={s.module_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className="card p-16 flex items-start gap-12"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-line bg-neutral font-body text-14 text-ink">
                      {s.position}
                    </span>
                    <div className="flex-1">
                      <p className="display text-18 leading-tight">{s.module_title}</p>
                      <p className="text-12 text-ink/60 mt-4">{s.rationale}</p>
                      <p className="text-12 font-body text-secondary mt-4">
                        Week {s.target_week} · {s.estimated_minutes} min
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="mt-24 flex gap-12">
                <Button onClick={() => navigate("/student")}>Open dashboard</Button>
                <Button variant="ghost" onClick={() => navigate("/student/tutor")}>Try the AI tutor</Button>
              </div>
            </Panel>
          )}
        </AnimatePresence>

        {step < 3 && (
          <div className="mt-32 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep((s) => (s > 0 ? ((s - 1) as Step) : s))}
              disabled={step === 0}
              icon={<Icon name="arrow-left" size={14} />}
            >
              Back
            </Button>
            {step < 2 ? (
              <Button
                onClick={() => setStep((s) => ((s + 1) as Step))}
                disabled={!canAdvance[step]}
                icon={<Icon name="arrow-right" size={14} />}
              >
                Continue
              </Button>
            ) : (
              <Button onClick={finish} loading={submitting} disabled={!canAdvance[step]}>
                Generate roadmap
              </Button>
            )}
          </div>
        )}
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 6px;
          border: 1px solid #e5e5e5;
          padding: 12px 14px;
          font-family: "Times New Roman", Times, serif;
          font-size: 16px;
          color: #262626;
          background: #fff;
        }
        .input:focus { outline: none; border-color: #404040; box-shadow: 0 0 0 2px rgba(64,64,64,0.1); }
      `}</style>
    </div>
  );
}

function avg(xs: number[] | undefined, fallback: number): number {
  if (!xs || xs.length === 0) return fallback;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sumMinutes(c: Course): number {
  return Math.round(c.modules.reduce((a, m) => a + m.estimated_minutes, 0) / 60);
}

function FieldBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps block mb-4">{label}</span>
      {children}
    </label>
  );
}

function Header({ step }: { step: Step }) {
  const labels = ["Track", "Learning DNA", "Diagnostic", "Roadmap"];
  return (
    <div className="mb-32">
      <p className="label-caps mb-8">Onboarding</p>
      <h1 className="display text-36 mb-16 font-normal">Let&apos;s calibrate.</h1>
      <div className="flex gap-8">
        {labels.map((l, i) => (
          <div key={l} className="flex-1">
            <div
              className={cn(
                "h-1 rounded-sm transition-colors",
                i <= step ? "bg-ink/70" : "bg-line",
              )}
            />
            <p
              className={cn(
                "label-caps mt-8",
                i === step ? "text-ink" : "text-secondary",
              )}
            >
              {String(i + 1).padStart(2, "0")} · {l}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.section>
  );
}

function BgBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-20 h-[300px] w-[300px] rounded-full bg-neutral blur-3xl opacity-90" />
      <div className="absolute -bottom-40 -right-20 h-[280px] w-[280px] rounded-full bg-line blur-3xl opacity-70" />
    </div>
  );
}
