"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Icon, type MosaicIconName } from "./icons";

export type ToastTone = "success" | "error" | "info" | "warning";

export type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
};

type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
  duration: number;
};

type ToastContextValue = {
  push: (toast: ToastInput) => string;
  dismiss: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_ICON: Record<ToastTone, MosaicIconName> = {
  success: "check",
  error: "close",
  info: "bulb",
  warning: "help",
};

let toastSeq = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const reduce = useReducedMotion();
  const timers = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (toast: ToastInput) => {
      const id = `toast-${Date.now()}-${(toastSeq += 1)}`;
      const duration = toast.duration ?? (toast.action ? 6500 : 4200);
      const item: ToastItem = {
        id,
        title: toast.title,
        description: toast.description,
        tone: toast.tone ?? "info",
        duration,
        action: toast.action,
      };
      setItems((current) => [item, ...current].slice(0, 4));
      if (duration > 0) {
        const timer = window.setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss],
  );

  useEffect(() => {
    const timersMap = timers.current;
    return () => {
      timersMap.forEach((timer) => window.clearTimeout(timer));
      timersMap.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      push,
      dismiss,
      success: (title, description) => push({ title, description, tone: "success" }),
      error: (title, description) => push({ title, description, tone: "error" }),
      info: (title, description) => push({ title, description, tone: "info" }),
    }),
    [push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="m-toast-stack" aria-live="polite" aria-relevant="additions text">
        <AnimatePresence initial={false}>
          {items.map((item) => (
            <motion.div
              key={item.id}
              layout
              className="m-toast-card"
              data-tone={item.tone}
              role="status"
              initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, y: 10, scale: 0.98 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              <span className="m-toast-icon" aria-hidden>
                <Icon name={TONE_ICON[item.tone]} size={16} />
              </span>
              <div className="m-toast-copy min-w-0">
                <p className="m-toast-title">{item.title}</p>
                {item.description ? <p className="m-toast-desc">{item.description}</p> : null}
              </div>
              {item.action ? (
                <button
                  type="button"
                  className="m-toast-action"
                  onClick={() => {
                    item.action?.onClick();
                    dismiss(item.id);
                  }}
                >
                  {item.action.label}
                </button>
              ) : null}
              <button
                type="button"
                className="m-toast-close"
                aria-label="Dismiss"
                onClick={() => dismiss(item.id)}
              >
                <Icon name="close" size={14} />
              </button>
              {item.duration > 0 ? (
                <span
                  className="m-toast-progress"
                  style={{ animationDuration: `${item.duration}ms` }}
                />
              ) : null}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const value = useContext(ToastContext);
  if (!value) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return value;
}
