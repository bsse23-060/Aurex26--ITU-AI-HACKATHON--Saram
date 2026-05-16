import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const HERO_IMG =
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=1200&q=80";

export function LandingPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const q = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
    navigate(`/signup${q}`);
  }

  return (
    <div className="min-h-screen bg-[#f4f4f2] font-body text-[#1a1a1a] antialiased">
      <header className="border-b border-black/[0.06] bg-[#f4f4f2]/90 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1400px] items-center px-6 sm:h-14 sm:px-10 lg:px-14">
          <Link to="/" className="shrink-0 text-[15px] font-normal tracking-[0.02em] sm:text-[17px]">
            atomcamp<span className="align-super text-[10px] sm:text-[11px]">*</span>
          </Link>

          <nav
            className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-10 text-[13px] tracking-wide text-[#4a4a4a] md:flex"
            aria-label="Primary"
          >
            <a href="#programs" className="transition-colors hover:text-[#1a1a1a]">
              Programs
            </a>
            <a href="#learners" className="transition-colors hover:text-[#1a1a1a]">
              Learners
            </a>
            <a href="#about" className="transition-colors hover:text-[#1a1a1a]">
              About
            </a>
          </nav>

          <Link
            to="/login"
            className="ml-auto text-[13px] tracking-wide text-[#4a4a4a] transition-colors hover:text-[#1a1a1a]"
          >
            Sign in
          </Link>
        </div>
        <div className="flex items-center justify-center gap-8 border-t border-black/[0.04] py-2.5 text-[12px] text-[#5a5a5a] md:hidden">
          <a href="#programs" className="hover:text-[#1a1a1a]">
            Programs
          </a>
          <span className="text-black/15">·</span>
          <a href="#learners" className="hover:text-[#1a1a1a]">
            Learners
          </a>
          <span className="text-black/15">·</span>
          <a href="#about" className="hover:text-[#1a1a1a]">
            About
          </a>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1400px]">
        <div className="grid min-h-[calc(100dvh-52px)] lg:min-h-[calc(100vh-56px)] lg:grid-cols-2">
          {/* Left: copy + form — soft glow like reference */}
          <section
            className="relative order-2 flex flex-col justify-center px-6 py-14 sm:px-10 sm:py-20 lg:order-1 lg:px-16 lg:py-24"
            style={{
              background:
                "radial-gradient(ellipse 85% 70% at 0% 45%, rgba(125, 148, 113, 0.14), transparent 55%), #f4f4f2",
            }}
          >
            <div className="relative z-[1] max-w-xl">
              <div className="mb-6 flex flex-wrap items-end gap-4 sm:gap-6">
                <h1 className="max-w-[14ch] text-[clamp(2rem,6vw,3.75rem)] font-normal leading-[0.95] tracking-[-0.02em]">
                  PERSONAL
                  <br />
                  LEARNING
                </h1>
                <span
                  className="mb-1 text-[clamp(3rem,10vw,5.5rem)] font-light leading-none text-[#1a1a1a]/90 tabular-nums"
                  aria-hidden
                >
                  100
                </span>
              </div>

              <p className="mb-10 text-[11px] font-normal uppercase tracking-[0.28em] text-[#5c5c5c]">
                Start your adaptive path
              </p>

              <form onSubmit={onSubmit} className="max-w-md space-y-3">
                <label className="sr-only" htmlFor="landing-email">
                  Email
                </label>
                <input
                  id="landing-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your e-mail"
                  className="min-h-[48px] w-full border border-black/[0.12] bg-white px-4 text-[15px] text-[#1a1a1a] placeholder:text-[#9a9a9a] outline-none transition-shadow focus:shadow-[inset_0_0_0_1px_rgba(26,26,26,0.15)]"
                />
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    className="min-h-[48px] shrink-0 border border-[#6d8468] bg-[#7d9471] px-8 text-[14px] text-white transition-all hover:-translate-y-0.5 hover:bg-[#6d8468] sm:px-10"
                  >
                    Sign up
                  </button>
                  <Link
                    to={email.trim() ? `/login?email=${encodeURIComponent(email.trim())}` : "/login"}
                    className="inline-flex min-h-[48px] items-center justify-center border border-black/[0.12] bg-white px-8 text-[14px] transition-all hover:-translate-y-0.5 hover:border-black/[0.22] hover:bg-[#fbfbf9] sm:px-10"
                  >
                    Try demo login
                  </Link>
                </div>
              </form>

              <div className="mt-6 flex flex-wrap gap-2">
                {[
                  "Adaptive roadmap",
                  "AI tutor",
                  "Mastery tracking",
                  "Roman Urdu support",
                ].map((tag) => (
                  <span
                    key={tag}
                    className="cursor-default rounded-full border border-black/[0.08] bg-white/70 px-3 py-1 text-[12px] text-[#4a4a4a] transition-transform hover:-translate-y-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <p className="mt-8 max-w-sm text-[13px] leading-relaxed text-[#666]">
                Smart LMS for atomcamp — roadmaps, mastery tracking, and an AI tutor tuned to how
                you learn.
              </p>
            </div>
          </section>

          {/* Right: editorial image + accents */}
          <section className="relative order-1 min-h-[38vh] bg-[#e8e8e6] lg:order-2 lg:min-h-0">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              aria-hidden
              style={{
                background:
                  "repeating-conic-gradient(from 0deg at 70% 40%, transparent 0deg 3deg, rgba(255,255,255,0.5) 3deg 3.25deg)",
              }}
            />
            <div className="relative h-full min-h-[38vh] lg:absolute lg:inset-0">
              <img
                src={HERO_IMG}
                alt=""
                className="h-full w-full object-cover object-[center_20%] grayscale contrast-[1.05] lg:min-h-0"
              />
              {/* Soft sage “crystal” wash — minimal, not loud */}
              <div
                className="pointer-events-none absolute bottom-[12%] left-[8%] h-[38%] w-[55%] rounded-[40%_60%_55%_45%] opacity-[0.42] blur-2xl sm:opacity-50"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(125, 148, 113, 0.55), rgba(125, 148, 113, 0.15))",
                }}
              />
              <span className="absolute right-6 top-6 flex h-11 w-11 items-center justify-center rounded-full bg-[#1a1a1a] text-[10px] font-normal uppercase tracking-wider text-white sm:right-10 sm:top-10">
                New
              </span>
            </div>
          </section>
        </div>

        <div
          id="programs"
          className="border-t border-black/[0.06] bg-white/40 px-6 py-12 sm:px-10 lg:px-16"
        >
          <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[#6a6a6a]">Programs</p>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#444]">
            Data, AI, and career tracks — one dashboard for your cohort, your roadmap, and your
            progress.
          </p>
        </div>
        <div id="learners" className="border-t border-black/[0.06] px-6 py-12 sm:px-10 lg:px-16">
          <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-[#6a6a6a]">Learners</p>
          <p className="max-w-2xl text-[15px] leading-relaxed text-[#444]">
            DNA-informed pacing, adaptive quizzes, and a tutor that follows you in English or Roman
            Urdu.
          </p>
        </div>
        <footer
          id="about"
          className="border-t border-black/[0.06] px-6 py-10 text-center text-[12px] text-[#777] sm:px-10"
        >
          atomcamp · ITU AI Hackathon demo ·{" "}
          <Link to="/login" className="underline decoration-black/20 underline-offset-4 hover:text-[#1a1a1a]">
            Sign in with existing account
          </Link>
        </footer>
      </main>
    </div>
  );
}
