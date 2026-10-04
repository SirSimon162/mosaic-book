"use client";

import { BookOpen, MessageSquare, Upload } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/branding/brand";
import { ThemeIcon } from "@/components/marginals/navbar/theme-switch";
import { threads, workspaceName, type Mode } from "./data";

const modes: { id: Mode; label: string; icon: typeof Upload }[] = [
  { id: "upload", label: "Upload", icon: Upload },
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "learn", label: "Learn", icon: BookOpen },
];

export function Sidebar({
  mode,
  chatId,
  onMode,
  onChat,
}: {
  mode: Mode;
  chatId: string | null;
  onMode: (mode: Mode) => void;
  onChat: (id: string) => void;
}) {
  return (
    <aside className="flex max-h-[46dvh] w-full shrink-0 flex-col border-b border-primary bg-secondary md:h-full md:max-h-none md:w-[280px] md:border-r md:border-b-0">
      <div className="px-4 pt-5 pb-3">
        <Link href="/" className="inline-flex">
          <Brand className="h-6" />
        </Link>
        <p className="mt-5 font-tertiary text-[10px] tracking-[0.16em] text-secondary">WORKSPACE</p>
        <p className="mt-1 font-secondary text-2xl tracking-tight text-primary">{workspaceName}</p>
      </div>

      <div className="grid grid-cols-3 gap-1 px-3 md:grid-cols-1">
        {modes.map((item) => {
          const Icon = item.icon;
          const selected = mode === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onMode(item.id)}
              className={`flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm md:justify-start ${
                selected ? "bg-tertiary text-primary" : "text-secondary hover:bg-primary hover:text-primary"
              }`}
            >
              <Icon className={`size-4 ${selected ? "text-accent" : ""}`} strokeWidth={1.75} />
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col px-3 pb-3">
        <p className="px-2 font-tertiary text-[10px] tracking-[0.16em] text-secondary">RECENT</p>
        <ul className="mt-2 min-h-0 flex-1 space-y-0.5 overflow-y-auto">
          {threads.map((thread) => {
            const selected = mode === "chat" && chatId === thread.id;

            return (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => onChat(thread.id)}
                  className={`w-full rounded-lg px-2 py-2 text-left ${
                    selected ? "bg-tertiary" : "hover:bg-primary"
                  }`}
                >
                  <span className="block truncate text-sm text-primary">{thread.title}</span>
                  <span className="mt-0.5 block font-tertiary text-[10px] text-secondary">{thread.when}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 flex justify-end border-t border-primary pt-2">
          <ThemeIcon />
        </div>
      </div>
    </aside>
  );
}
