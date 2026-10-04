"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

const sectionIndex: Record<string, number> = {
  path: 1,
  learn: 2,
  workspace: 3,
};

function clamp(value: number) {
  return Math.min(1, Math.max(0, value));
}

function scrollToHash() {
  const id = window.location.hash.replace("#", "");
  const index = sectionIndex[id];
  if (index === undefined) return;
  window.scrollTo({ top: index * window.innerHeight });
}

export function HomeStack({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const frame = frameRef.current;
    if (!root || !frame) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frameId = 0;

    const update = () => {
      const panels = [...frame.querySelectorAll<HTMLElement>(":scope > section")];
      const height = window.innerHeight;
      const count = panels.length;

      panels.forEach((panel, index) => {
        panel.style.zIndex = String(count - index);
      });

      if (reduced.matches) {
        root.style.height = "auto";
        frame.style.position = "static";
        frame.style.height = "auto";
        frame.style.overflow = "visible";
        panels.forEach((panel) => {
          panel.style.position = "relative";
          panel.style.inset = "auto";
          panel.style.height = `${height}px`;
          panel.style.transform = "";
        });
        return;
      }

      root.style.height = `${count * height}px`;
      frame.style.position = "sticky";
      frame.style.top = "0px";
      frame.style.height = `${height}px`;
      frame.style.overflow = "hidden";

      panels.forEach((panel, index) => {
        panel.style.position = "absolute";
        panel.style.inset = "0";
        if (index === count - 1) {
          panel.style.transform = "translate3d(0, 0, 0)";
          return;
        }
        const progress = clamp((window.scrollY - index * height) / height);
        panel.style.transform = `translate3d(0, ${-progress * 100}%, 0)`;
      });
    };

    const onScroll = () => {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(update);
    };

    update();
    scrollToHash();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("hashchange", scrollToHash);
    reduced.addEventListener("change", update);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("hashchange", scrollToHash);
      reduced.removeEventListener("change", update);
    };
  }, []);

  return (
    <main ref={rootRef} className="relative">
      <div ref={frameRef} className="sticky top-0 h-dvh overflow-hidden">
        {children}
      </div>
    </main>
  );
}
