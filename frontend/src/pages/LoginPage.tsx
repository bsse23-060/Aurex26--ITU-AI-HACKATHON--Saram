import { type FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ApiError, endpoints } from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { cn } from "../lib/cn";

type DemoAccount = { role: string; email: string; password: string; label: string };

const roleTone: Record<string, string> = {
  student: "border-primary text-primary hover:bg-primary",
  instructor: "border-secondary text-secondary hover:bg-secondary",
  admin: "border-warning text-warning hover:bg-warning",
};

function destFor(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor";
  return "/student";
}

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState("student@atomcamp.dev");
  const [password, setPassword] = useState("student123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demos, setDemos] = useState<DemoAccount[]>([]);

  useEffect(() => {
    endpoints
      .demoAccounts()
      .then((d) => setDemos(d.accounts))
      .catch(() => setDemos([]));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const u = await login(email, password);
      navigate(destFor(u.role), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? `${err.status}: ${err.body ?? err.message}` : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(acc: DemoAccount) {
    setEmail(acc.email);
    setPassword(acc.password);
    setError(null);
    setLoading(true);
    try {
      const u = await login(acc.email, acc.password);
      navigate(destFor(u.role), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? `${err.status}: ${err.body ?? err.message}` : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <BackgroundBlobs />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-32 px-24 py-32 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p className="label-caps text-secondary mb-16">atomcamp · Pakistan</p>
          <h1 className="display text-48 sm:text-[64px] leading-[1.1] text-ink mb-16">
            A Smart Adaptive <span className="bg-artistic-gradient bg-clip-text text-transparent">LMS</span>
          </h1>
          <p className="max-w-md text-18 text-ink/70 leading-relaxed mb-24">
            Personalised roadmaps, mastery-tracked adaptive quizzes, a bilingual AI tutor, and
            real career outcomes — designed for atomcamp learners.
          </p>
          <ul className="space-y-8 text-14 text-ink/80">
            {[
              "Learning DNA fingerprint at onboarding",
              "Bayesian Knowledge Tracing + FSRS reviews",
              "Roman-Urdu / English code-switching tutor",
              "At-risk prediction with plain-English reasons",
            ].map((item) => (
              <li key={item} className="flex items-start gap-12">
                <span className="mt-4 inline-flex h-4 w-4 rounded-md bg-artistic-gradient" />
                {item}
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="card relative p-32 border-t-[8px] border-t-primary"
        >
          <h2 className="display text-30 mb-8">Sign in</h2>
          <p className="text-14 text-ink/60 mb-24">Use a demo account below or your own credentials.</p>

          {demos.length > 0 && (
            <div className="mb-24 space-y-8">
              <p className="label-caps text-secondary">Demo accounts</p>
              <div className="flex flex-col gap-8">
                {demos.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={loading}
                    onClick={() => quickLogin(acc)}
                    className={cn(
                      "group w-full text-left rounded-md border-2 px-16 py-12 font-mono text-12 uppercase tracking-wide transition-all hover:text-surface disabled:opacity-50",
                      roleTone[acc.role] ?? "border-ink/20",
                    )}
                  >
                    <div className="flex items-center justify-between gap-8">
                      <span>{acc.label}</span>
                      <Icon name="arrow-right" size={14} className="opacity-70 group-hover:translate-x-1 transition-transform" />
                    </div>
                    <p className="mt-4 text-12 normal-case tracking-normal text-ink/50 group-hover:text-surface/80">
                      {acc.email}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-16">
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                autoComplete="email"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                autoComplete="current-password"
              />
            </Field>
            {error && (
              <p className="rounded-md bg-danger/10 border-2 border-danger px-12 py-8 font-mono text-12 text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>
        </motion.div>
      </div>
      <style>{`
        .input {
          width: 100%;
          border-radius: 8px;
          border: 2px solid rgba(17, 24, 39, 0.12);
          padding: 12px 14px;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 15px;
          color: #111827;
          background: white;
          transition: border-color 120ms, box-shadow 120ms;
        }
        .input:focus {
          outline: none;
          border-color: #3B82F6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps text-secondary block mb-8">{label}</span>
      {children}
    </label>
  );
}

function BackgroundBlobs() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full bg-primary/30 blur-3xl animate-blob-drift" />
      <div className="absolute -bottom-32 -right-16 h-[460px] w-[460px] rounded-full bg-secondary/30 blur-3xl animate-blob-drift" style={{ animationDelay: "2s" }} />
      <div className="absolute top-1/3 right-1/3 h-[260px] w-[260px] rounded-full bg-danger/20 blur-3xl animate-blob-drift" style={{ animationDelay: "4s" }} />
    </div>
  );
}
