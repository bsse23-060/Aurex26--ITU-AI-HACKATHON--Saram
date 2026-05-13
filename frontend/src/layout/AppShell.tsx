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
  { to: "/student/skill-graph", label: "Skill Graph", icon: "graph" },
  { to: "/student/career", label: "Career", icon: "career" },
  { to: "/student/twin", label: "Peer Twin", icon: "twin" },
];

const instructorNav: Item[] = [
  { to: "/instructor", label: "Cohort", icon: "dashboard" },
];

const adminNav: Item[] = [{ to: "/admin", label: "Platform", icon: "shield" }];

function navFor(role: string): Item[] {
  if (role === "admin") return adminNav;
  if (role === "instructor") return instructorNav;
  return studentNav;
}

export function AppShell({ children }: { children?: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [location.pathname]);

  const items = user ? navFor(user.role) : studentNav;

  return (
    <div className="min-h-screen flex bg-canvas text-ink">
      <Sidebar items={items} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 backdrop-blur-md bg-surface/80 border-b border-ink/5">
          <div className="mx-auto max-w-7xl px-16 sm:px-24 py-12 flex items-center gap-12">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="lg:hidden inline-flex items-center justify-center rounded-md p-8 border-2 border-ink/10 hover:border-primary"
              aria-label="Open menu"
            >
              <Icon name="menu" size={20} />
            </button>
            <Link to="/" className="flex items-baseline gap-8">
              <span className="label-caps text-secondary">atomcamp</span>
              <span className="display text-22 text-ink">Smart LMS</span>
            </Link>
            <div className="ml-auto flex items-center gap-12">
              {user && (
                <>
                  <div className="hidden sm:block text-right">
                    <p className="text-14 text-ink font-medium leading-tight">{user.full_name}</p>
                    <p className="label-caps text-secondary mt-2">{user.role}</p>
                  </div>
                  <Avatar name={user.full_name} seed={user.avatar_seed} ring />
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="inline-flex items-center gap-8 rounded-md px-12 py-8 font-mono text-12 uppercase tracking-widest text-danger border-2 border-danger/30 hover:bg-danger hover:text-surface transition-colors"
                  >
                    <Icon name="logout" size={14} /> Logout
                  </button>
                </>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 mx-auto w-full max-w-7xl px-16 sm:px-24 py-24">
          {children ?? <Outlet />}
        </main>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25 }}
              className="absolute inset-y-0 left-0 w-72 bg-surface border-r-2 border-ink/5 p-16 flex flex-col"
            >
              <NavLogo />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="absolute top-12 right-12 p-8 rounded-md border-2 border-ink/10"
                aria-label="Close menu"
              >
                <Icon name="x" size={16} />
              </button>
              <NavList items={items} />
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Sidebar({ items }: { items: Item[] }) {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r-2 border-ink/5 bg-surface/60 backdrop-blur-md px-16 py-24 sticky top-0 h-screen">
      <NavLogo />
      <NavList items={items} />
      <div className="mt-auto pt-16 border-t border-ink/5 text-12 text-ink/50 font-mono">
        <p>v0.1 · hackathon build</p>
      </div>
    </aside>
  );
}

function NavLogo() {
  return (
    <Link to="/" className="flex items-center gap-12 mb-32 group">
      <span className="inline-flex h-12 w-12 rounded-md bg-artistic-gradient shadow-bold animate-pulse-ring" />
      <span>
        <span className="block label-caps text-secondary">atomcamp</span>
        <span className="block display text-20 text-ink leading-tight">Smart LMS</span>
      </span>
    </Link>
  );
}

function NavList({ items }: { items: Item[] }) {
  return (
    <nav className="flex flex-col gap-4">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to.endsWith("/student") || item.to.endsWith("/instructor") || item.to.endsWith("/admin")}
          className={({ isActive }) =>
            cn(
              "group flex items-center gap-12 rounded-md px-12 py-12 font-mono text-12 uppercase tracking-widest transition-colors",
              isActive
                ? "bg-artistic-gradient text-surface shadow-bold"
                : "text-ink/70 hover:text-primary hover:bg-primary/5",
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
                <Icon name={item.icon} size={16} />
              </span>
              <span className="truncate">{item.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
