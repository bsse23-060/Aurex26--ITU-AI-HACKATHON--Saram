import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { cn } from "../../lib/cn";

type ToastTone = "info" | "success" | "warning" | "danger";

type Toast = { id: number; title?: string; message: string; tone: ToastTone };

type Ctx = {
  push: (t: Omit<Toast, "id">) => void;
  success: (m: string, title?: string) => void;
  warn: (m: string, title?: string) => void;
  fail: (m: string, title?: string) => void;
  info: (m: string, title?: string) => void;
};

const ToastContext = createContext<Ctx | null>(null);

const accent: Record<ToastTone, string> = {
  info: "border-primary",
  success: "border-success",
  warning: "border-warning",
  danger: "border-danger",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((curr) => curr.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = ++idRef.current;
      setToasts((curr) => [...curr, { id, ...t }]);
      setTimeout(() => dismiss(id), 4800);
    },
    [dismiss],
  );

  const api = useMemo<Ctx>(
    () => ({
      push,
      success: (message, title) => push({ tone: "success", message, title }),
      warn: (message, title) => push({ tone: "warning", message, title }),
      fail: (message, title) => push({ tone: "danger", message, title }),
      info: (message, title) => push({ tone: "info", message, title }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed top-16 right-16 z-50 flex flex-col gap-12 max-w-sm pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ duration: 0.25 }}
              type="button"
              onClick={() => dismiss(t.id)}
              className={cn(
                "pointer-events-auto w-full text-left rounded-lg bg-surface shadow-bold border-l-[6px] px-16 py-12",
                accent[t.tone],
              )}
            >
              {t.title && <p className="label-caps text-secondary mb-4">{t.title}</p>}
              <p className="text-14 text-ink leading-relaxed">{t.message}</p>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): Ctx {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
