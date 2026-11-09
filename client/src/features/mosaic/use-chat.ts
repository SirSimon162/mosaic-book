"use client";

import { useEffect, useRef, useState } from "react";
import { isAbort } from "@/services/api";
import { MOSAIC, type ChatMessageRecord, type Citation } from "@/services/mosaic";
import { useWorkspaces } from "./use-workspaces";

const MESSAGE_LIMIT = 8000;

function hasThread(loaded: Record<string, ChatMessageRecord[]>, id: string) {
  return Object.prototype.hasOwnProperty.call(loaded, id);
}

export function useWorkspaceChat(workspaceId: string, enabled: boolean) {
  const desk = useWorkspaces();
  const [scope, setScope] = useState(workspaceId);
  const [chatId, setChatId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Record<string, ChatMessageRecord[]>>({});
  const [draftText, setDraftText] = useState("");
  const [liveCitations, setLiveCitations] = useState<Citation[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const tokens = useRef("");
  const frame = useRef(0);
  const listed = useRef(new Set<string>());

  if (scope !== workspaceId) {
    setScope(workspaceId);
    setChatId(null);
    setLoaded({});
    setDraftText("");
    setLiveCitations([]);
    setPending(false);
    setError("");
  }

  const known = chatId ? hasThread(loaded, chatId) : true;
  const messages = chatId && known ? (loaded[chatId] ?? []) : [];

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, [workspaceId]);

  const replaceChats = desk.replaceChats;
  const workspaceReady = desk.active?.id === workspaceId;

  useEffect(() => {
    if (!enabled || !workspaceReady || listed.current.has(workspaceId)) return;
    const controller = new AbortController();
    let ignore = false;
    void MOSAIC.listChats(workspaceId, controller.signal)
      .then((chats) => {
        if (ignore) return;
        listed.current.add(workspaceId);
        replaceChats(chats.map((chat) => ({ id: chat.id, title: chat.title })));
      })
      .catch((cause: unknown) => {
        if (ignore || isAbort(cause)) return;
      });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [enabled, replaceChats, workspaceId, workspaceReady]);

  useEffect(() => {
    if (!chatId || hasThread(loaded, chatId)) return;
    const controller = new AbortController();
    let ignore = false;
    void MOSAIC.getChat(workspaceId, chatId, controller.signal)
      .then((detail) => {
        if (ignore) return;
        setLoaded((current) =>
          hasThread(current, chatId) ? current : { ...current, [chatId]: detail.messages },
        );
      })
      .catch((cause: unknown) => {
        if (ignore || isAbort(cause)) return;
        setError(cause instanceof Error ? cause.message : "Could not open this chat");
      });
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [chatId, loaded, workspaceId]);

  function stop() {
    abortRef.current?.abort();
    abortRef.current = null;
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    tokens.current = "";
  }

  function open(id: string) {
    stop();
    setPending(false);
    setDraftText("");
    setLiveCitations([]);
    setError("");
    setChatId(id);
  }

  function startNew() {
    stop();
    setPending(false);
    setDraftText("");
    setLiveCitations([]);
    setError("");
    setChatId(null);
  }

  function remember(id: string, next: ChatMessageRecord[]) {
    setLoaded((current) => ({ ...current, [id]: next }));
  }

  function pushToken(text: string) {
    tokens.current += text;
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const chunk = tokens.current;
      tokens.current = "";
      if (chunk) setDraftText((current) => current + chunk);
    });
  }

  async function send(text: string) {
    const content = text.trim().slice(0, MESSAGE_LIMIT);
    if (!content || pending) return;
    stop();
    setError("");
    setDraftText("");
    setLiveCitations([]);
    setPending(true);
    const controller = new AbortController();
    abortRef.current = controller;
    let id = chatId;
    let title = desk.active?.chats.find((item) => item.id === id)?.title ?? "New chat";
    try {
      if (!id) {
        title = content.replace(/\s+/g, " ").slice(0, 80);
        const created = await MOSAIC.createChat(workspaceId, { title });
        if (controller.signal.aborted) return;
        id = created.id;
        title = created.title;
        desk.placeChat({ id: created.id, title: created.title });
        setLoaded((current) => ({ ...current, [created.id]: current[created.id] ?? [] }));
        setChatId(created.id);
      }
      const activeId = id;
      let thread = loaded[activeId] ?? [];
      for await (const event of MOSAIC.streamReply(workspaceId, activeId, { content }, controller.signal)) {
        if (controller.signal.aborted) return;
        if (event.type === "user") {
          thread = [...thread, event.message];
          remember(activeId, thread);
        } else if (event.type === "citations") {
          setLiveCitations(event.citations);
        } else if (event.type === "token") {
          pushToken(event.text);
        } else if (event.type === "done") {
          if (frame.current) cancelAnimationFrame(frame.current);
          frame.current = 0;
          tokens.current = "";
          thread = [...thread, event.message];
          remember(activeId, thread);
          setDraftText("");
          setLiveCitations([]);
          desk.placeChat({ id: activeId, title });
        } else if (event.type === "error") {
          setError(event.message);
          setDraftText("");
          setLiveCitations([]);
        }
      }
    } catch (cause) {
      if (!isAbort(cause) && !controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "Could not send the message");
      }
      setDraftText("");
      setLiveCitations([]);
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        setPending(false);
      }
    }
  }

  async function remove(id: string) {
    stop();
    setPending(false);
    try {
      await MOSAIC.deleteChat(workspaceId, id);
    } catch (cause) {
      if (!isAbort(cause)) {
        setError(cause instanceof Error ? cause.message : "Could not delete the chat");
      }
      return;
    }
    setLoaded((current) => {
      if (!hasThread(current, id)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
    desk.removeChat(id);
    if (chatId === id) {
      setChatId(null);
      setDraftText("");
      setLiveCitations([]);
    }
  }

  return {
    chatId,
    messages,
    draftText,
    liveCitations,
    pending,
    loading: Boolean(chatId) && !known,
    error,
    open,
    startNew,
    send,
    remove,
  };
}
