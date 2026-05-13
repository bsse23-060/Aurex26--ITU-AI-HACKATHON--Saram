import { type ReactNode, useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../lib/authStore";
import { cn } from "../lib/cn";
import { Avatar } from "../components/ui/Avatar";
import { Icon } from "../components/ui/Icon";

type Item = { to: string; label: string; icon: Parameters<typeof Icon>[0]["name"] };

const studentNav: Item[] = [
  { to: "/student", label: "Dashboard", icon: "dashboard" },
  { to: "/student/roadmap", label: "Roadmap", icon: "map" },
  { to: "/student/tutor", label: "AI Tutor", icon: "spark" },
  { to: "/student/skill-graph", label: "Skills", icon: "graph" },
  { to: "/student/career", label: "Career", icon: "career" },
  { to: "/student/twin", label: "Peer Twin", icon: "twin" },
];

const instructorNav: Item[] = [{ to: "/instructor", label: "Cohort", icon: "dashboard" }];

const adminNav: Item[] = [{ to: "/admin", label: "Analytics", icon: "shield" }];

function navFor(role: string): Item[] {
  if (role === "admin") return adminNav;
  if (role === "instructor") return instructorNav;
  return studentNav;
}

function homePath(role: string): string {
  if (role === "admin") return "/admin";
  if (role === "instructor") return "/instructor";
  return "/student";
}

function navEndMatch(path: string): boolean {
  return (
    path.endsWith("/student") ||
    path.endsWith("/instructor") ||
    path.endsWith("/admin")
  );
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => setDrawerOpen(false), [location.pathname]);

  const items = user ? navFor(user.role) : studentNav;
  const home = user ? homePath(user.role) : "/";

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink">
      <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur-md shadow-[0_1px_0_rgba(15,118,110,0.06)]">
        <div className="mx-auto flex h-[52px] max-w-7xl items-center gap-12 px-16 sm:px-24 lg:h-[60px] lg:gap-16">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink hover:border-primary/35 hover:bg-aqua-soft transition-colors"
            aria-label="Open navigation menu"
            aria-expanded={drawerOpen}
          >
            <Icon name="menu" size={22} />
          </button>

          <Link
            to={home}
            className="flex shrink-0 flex-col justify-center leading-none rounded-md outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="label-caps text-primary">atomcamp</span>
            <span className="display text-18 text-ink sm:text-20">Smart LMS</span>
          </Link>

          <nav
            className="hidden lg:flex flex-1 items-center justify-center gap-4 min-w-0 px-16"
            aria-label="Main"
          >
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={navEndMatch(item.to)}
                className={({ isActive }) =>
                  cn(
                    "relative flex items-center gap-8 rounded-md px-12 py-8 font-body text-12 tracking-wide transition-colors whitespace-nowrap",
                    isActive
                      ? "text-primary font-medium"
                      : "text-secondary hover:text-ink hover:bg-aqua-soft/70",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon name={item.icon} size={15} className={cn(isActive ? "text-primary" : "text-secondary")} />
                    <span>{item.label}</span>
                    {isActive && (
                      <motion.span
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-8 right-8 h-px bg-primary"
                        transition={{ type: "spring", stiffness: 380, damping: 30 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex h-full items-center gap-8 sm:gap-12">
            {user && (
              <>
                <div className="hidden min-w-0 max-w-[12rem] items-center sm:flex md:max-w-[16rem]">
                  <p className="truncate text-left text-14 font-medium leading-tight text-ink">
                    {user.full_name}
                  </p>
                </div>
                <Avatar
                  name={user.full_name}
                  seed={user.avatar_seed}
                  size={36}
                  variant="neutral"
                  ring
                  className="shrink-0"
                />
                <button
                  type="button"
                  onClick={() => logout()}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-surface text-ink transition-colors hover:border-primary/35 hover:bg-aqua-soft sm:h-9 sm:w-auto sm:gap-6 sm:px-14"
                  title="Sign out"
                >
                  <Icon name="logout" size={14} />
                  <span className="hidden sm:inline font-body text-12 text-ink/90">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-16 py-20 sm:px-24 sm:py-28">
        {children ?? <Outlet />}
      </main>

      <AnimatePresence>
        {drawerOpen && (
          <motion.div
            className="fixed inset-0 z-[60] lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-ink/20"
              aria-label="Close menu"
              onClick={() => setDrawerOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col border-r border-line bg-surface shadow-bold"
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
            >
              <div className="flex items-center justify-between border-b border-line px-16 py-14">
                <span className="label-caps text-secondary">Menu</span>
                <button
                  type="button"
                  onClick={() => setDrawerOpen(false)}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-line hover:border-ink/25"
                  aria-label="Close"
                >
                  <Icon name="x" size={18} />
                </button>
              </div>
              <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-16 scrollbar-thin" aria-label="Mobile main">
                {items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={navEndMatch(item.to)}
                    onClick={() => setDrawerOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-12 rounded-md px-14 py-14 font-body text-14 transition-colors",
                        isActive
                          ? "bg-primary text-surface border border-primary"
                          : "text-ink/80 border border-transparent hover:bg-aqua-soft",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span
                          className={cn(
                            "inline-flex h-8 w-8 items-center justify-center rounded-md",
                            isActive ? "text-surface" : "text-secondary",
                          )}
                        >
                          <Icon name={item.icon} size={18} />
                        </span>
                        <span>{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
              {user && (
                <div className="border-t border-line p-16">
                  <div className="flex items-center gap-12 rounded-md bg-canvas px-12 py-12">
                    <Avatar name={user.full_name} seed={user.avatar_seed} size={40} variant="neutral" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-14 font-medium">{user.full_name}</p>
                    </div>
                  </div>
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
