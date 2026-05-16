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

type AuthMode = "login" | "register";

type LoginPageProps = {
  initialMode?: AuthMode;
};

export function LoginPage({ initialMode = "login" }: LoginPageProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const [email, setEmail] = useState("student@atomcamp.dev");
  const [password, setPassword] = useState("student123");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [demos, setDemos] = useState<DemoAccount[]>([]);
  const isRegister = mode === "register";
  const passwordScore = getPasswordScore(password);
  const passwordsMatch = !isRegister || password === confirmPassword;

  useEffect(() => {
    const q = params.get("email");
    if (q) setEmail(q);
    const nextMode = params.get("mode");
    if (nextMode === "login" || nextMode === "register") setMode(nextMode);
  }, [params, initialMode]);

  useEffect(() => {
    endpoints
      .demoAccounts()
      .then((d) => setDemos(d.accounts))
      .catch(() => setDemos([]));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSignupSuccess(false);
    if (isRegister) {
      if (fullName.trim().length < 2) {
        setError("Please enter your full name.");
        return;
      }
      if (password.length < 8) {
        setError("Use at least 8 characters for your password.");
        return;
      }
      if (!passwordsMatch) {
        setError("Passwords do not match.");
        return;
      }
    }
    setLoading(true);
    try {
      const u =
        isRegister
          ? await register(fullName.trim(), email, password)
          : await login(email, password);
      if (isRegister) {
        setSignupSuccess(true);
        window.setTimeout(() => {
          navigate("/onboarding", { replace: true });
        }, 900);
      } else {
        navigate(destFor(u.role), { replace: true });
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? `${err.status}: ${err.body ?? err.message}`
          : isRegister
            ? "Sign up failed"
            : "Login failed",
      );
    } finally {
      setLoading(false);
    }
  }

  async function quickLogin(acc: DemoAccount) {
    setEmail(acc.email);
    setPassword(acc.password);
    setConfirmPassword("");
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

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setError(null);
    setSignupSuccess(false);
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
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
          {signupSuccess ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.28 }}
              className="space-y-16 rounded-2xl border border-success/25 bg-success/8 p-24"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-success/30 bg-success/15 text-success">
                <Icon name="check" size={18} />
              </div>
              <div className="space-y-6">
                <h2 className="display text-30 font-normal text-ink">Account ready</h2>
                <p className="text-14 leading-relaxed text-secondary">
                  We created your account. Taking you to onboarding so you can personalize your learning path.
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-white/70">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.8, ease: "easeInOut" }}
                  className="h-full rounded-full bg-success"
                />
              </div>
            </motion.div>
          ) : (
            <>
          <h2 className="display text-30 mb-8 font-normal">{isRegister ? "Create account" : "Sign in"}</h2>
          <p className="text-14 text-secondary mb-24">
            {isRegister
              ? "Create a student account to start your onboarding flow."
              : "Use a demo account below or your own credentials."}
          </p>

          <div className="mb-20 flex rounded-md border border-line bg-surface p-4 text-14">
            <button
              type="button"
              className={cn(
                "flex-1 rounded-sm px-12 py-8 transition-colors",
                !isRegister ? "bg-ink text-white" : "text-secondary hover:text-ink",
              )}
              onClick={() => switchMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={cn(
                "flex-1 rounded-sm px-12 py-8 transition-colors",
                isRegister ? "bg-ink text-white" : "text-secondary hover:text-ink",
              )}
              onClick={() => switchMode("register")}
            >
              Sign up
            </button>
          </div>

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
            {isRegister && (
              <Field label="Full name">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="input"
                  autoComplete="name"
                  required
                />
              </Field>
            )}
            <Field label="Email">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input"
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Password">
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pr-52"
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  required
                />
                <button
                  type="button"
                  className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full border border-line bg-surface px-10 py-6 text-12 text-secondary transition-colors hover:border-ink hover:text-ink"
                  onClick={() => setShowPassword((current) => !current)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              {isRegister && (
                <div className="mt-8 space-y-6">
                  <div className="h-2 overflow-hidden rounded-full bg-neutral/70">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        passwordScore >= 3 ? "bg-success" : passwordScore === 2 ? "bg-warning" : "bg-danger",
                      )}
                      style={{ width: `${Math.max(12, (passwordScore / 4) * 100)}%` }}
                    />
                  </div>
                  <p className="text-12 text-secondary">
                    Password strength: {passwordStrengthLabel(passwordScore)}
                  </p>
                </div>
              )}
            </Field>
            {isRegister && (
              <Field label="Confirm password">
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={cn("input pr-52", confirmPassword.length > 0 && !passwordsMatch && "border-danger")}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    className="absolute right-6 top-1/2 -translate-y-1/2 rounded-full border border-line bg-surface px-10 py-6 text-12 text-secondary transition-colors hover:border-ink hover:text-ink"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <p className={cn("mt-8 text-12", passwordsMatch ? "text-success" : "text-danger")}>{passwordsMatch ? "Passwords match" : "Passwords do not match"}</p>
                )}
              </Field>
            )}
            {error && (
              <p className="rounded-md border border-danger/40 bg-danger/10 px-12 py-8 font-body text-14 text-danger">
                {error}
              </p>
            )}
            <Button type="submit" loading={loading} className="w-full" disabled={isRegister && (!passwordsMatch || passwordScore < 2)}>
              {isRegister ? "Create account" : "Sign in"}
            </Button>
            {isRegister ? (
              <p className="text-center text-12 text-secondary">
                Already have an account?{" "}
                <button type="button" className="text-ink underline underline-offset-4" onClick={() => switchMode("login")}>
                  Sign in
                </button>
              </p>
            ) : (
              <p className="text-center text-12 text-secondary">
                Need an account?{" "}
                <button
                  type="button"
                  className="text-ink underline underline-offset-4"
                  onClick={() => switchMode("register")}
                >
                  Sign up
                </button>
              </p>
            )}
          </form>
            </>
          )}
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

function getPasswordScore(password: string): number {
  const checks = [password.length >= 8, /[A-Z]/.test(password), /[0-9]/.test(password), /[^A-Za-z0-9]/.test(password)];
  return checks.filter(Boolean).length;
}

function passwordStrengthLabel(score: number): string {
  if (score >= 4) return "strong";
  if (score === 3) return "good";
  if (score === 2) return "fair";
  return "weak";
}
