import { type FormEvent, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ApiError, endpoints } from "../lib/api";
import { useAuth } from "../lib/authStore";
import { Button } from "../components/ui/Button";
import { Icon } from "../components/ui/Icon";
import { cn } from "../lib/cn";

type DemoAccount = { role: string; email: string; password: string; label: string };

const roleTone: Record<string, string> = {
  student: "border-line hover:bg-neutral",
  instructor: "border-line hover:bg-neutral",
  admin: "border-line hover:bg-neutral",
};

function destFor(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor";
  return "/student";
}

export function LoginPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useAuth((s) => s.login);
  const [email, setEmail] = useState("student@atomcamp.dev");
  const [password, setPassword] = useState("student123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demos, setDemos] = useState<DemoAccount[]>([]);

  useEffect(() => {
    const q = params.get("email");
    if (q) setEmail(q);
  }, [params]);

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
    <div className="relative min-h-screen overflow-hidden bg-canvas">
      <Link
        to="/"
        className="absolute left-6 top-6 z-10 text-14 text-secondary transition-colors hover:text-ink sm:left-10"
      >
        ← Home
      </Link>
      <BackgroundWash />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-32 px-24 py-32 lg:grid-cols-2">
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <p className="label-caps mb-16">atomcamp · Pakistan</p>
          <h1 className="display text-36 sm:text-48 leading-tight text-ink mb-16 font-normal">
            A Smart Adaptive LMS
          </h1>
          <p className="max-w-md text-18 text-secondary leading-relaxed mb-24">
            Personalised roadmaps, mastery-tracked adaptive quizzes, a bilingual AI tutor, and real
            career outcomes — designed for atomcamp learners.
          </p>
          <ul className="space-y-8 text-14 text-ink/85">
            {[
              "Learning DNA fingerprint at onboarding",
              "Bayesian Knowledge Tracing + FSRS reviews",
              "Roman-Urdu / English code-switching tutor",
              "At-risk prediction with plain-English reasons",
            ].map((item) => (
              <li key={item} className="flex items-start gap-12">
                <span className="mt-4 inline-block h-4 w-4 shrink-0 rounded-sm border border-line bg-neutral" />
                {item}
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.08 }}
          className="card relative border-l-[3px] border-l-ink/30 p-24 sm:p-32"
        >
          <h2 className="display text-30 mb-8 font-normal">Sign in</h2>
          <p className="text-14 text-secondary mb-24">Use a demo account below or your own credentials.</p>

          {demos.length > 0 && (
            <div className="mb-24 space-y-8">
              <p className="label-caps">Demo accounts</p>
              <div className="flex flex-col gap-8">
                {demos.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    disabled={loading}
                    onClick={() => quickLogin(acc)}
                    className={cn(
                      "group w-full rounded-md border bg-surface px-16 py-12 text-left font-body text-14 transition-colors disabled:opacity-50",
                      roleTone[acc.role] ?? "border-line",
                    )}
                  >
                    <div className="flex items-center justify-between gap-8">
                      <span>{acc.label}</span>
                      <Icon
                        name="arrow-right"
                        size={14}
                        className="opacity-50 transition-transform group-hover:translate-x-1"
                      />
                    </div>
                    <p className="mt-4 text-12 text-secondary">{acc.email}</p>
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
              <p className="rounded-md border border-danger/40 bg-danger/10 px-12 py-8 font-body text-14 text-danger">
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
          border-radius: 6px;
          border: 1px solid #e5e5e5;
          padding: 12px 14px;
          font-family: "Times New Roman", Times, serif;
          font-size: 16px;
          color: #262626;
          background: #fff;
          transition: border-color 120ms, box-shadow 120ms;
        }
        .input:focus {
          outline: none;
          border-color: #404040;
          box-shadow: 0 0 0 2px rgba(64, 64, 64, 0.12);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label-caps block mb-8">{label}</span>
      {children}
    </label>
  );
}

function BackgroundWash() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-20 h-[320px] w-[320px] rounded-full bg-neutral blur-3xl opacity-80" />
      <div className="absolute -bottom-32 -left-20 h-[280px] w-[280px] rounded-full bg-line blur-3xl opacity-60" />
    </div>
  );
}
