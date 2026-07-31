"use client";

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { cn } from "@/lib/cn";
import { getBrowserSupabase } from "@/lib/supabase/client";
import {
  listRequestMessages,
  markRequestThreadRead,
  sendRequestMessage,
  subscribeRequestMessages,
} from "@/lib/requests/queries";
import {
  REQUEST_MESSAGE_MAX_LENGTH,
  type RequestMessage,
} from "@/lib/requests/types";

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function appendMessage(
  prev: RequestMessage[],
  msg: RequestMessage,
  currentUserId: string,
): RequestMessage[] {
  if (prev.some((m) => m.id === msg.id)) return prev;
  const senderName =
    msg.senderName ??
    (msg.senderId === currentUserId
      ? "Vous"
      : prev.find((m) => m.senderId === msg.senderId)?.senderName) ??
    null;
  return [...prev, { ...msg, senderName }];
}

type Props = {
  requestId: string;
  currentUserId: string;
  initialBody: string;
  initialCreatedAt: string;
  initialAuthorName: string | null;
  status: "open" | "closed";
  className?: string;
  compact?: boolean;
};

export function RequestChatThread({
  requestId,
  currentUserId,
  initialBody,
  initialCreatedAt,
  initialAuthorName,
  status,
  className,
  compact = false,
}: Props) {
  const [messages, setMessages] = useState<RequestMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement>(null);
  const canReply = status === "open";

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function boot() {
      const rows = await listRequestMessages(supabase!, requestId);
      if (cancelled) return;
      setMessages(rows);
      setLoading(false);
      await markRequestThreadRead(supabase!, requestId, currentUserId);
    }

    void boot();

    const channel = subscribeRequestMessages(supabase, requestId, (msg) => {
      setMessages((prev) => appendMessage(prev, msg, currentUserId));
      if (msg.senderId !== currentUserId) {
        void markRequestThreadRead(supabase, requestId, currentUserId);
      }
    });

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [requestId, currentUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages.length]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || !canReply || pending) return;

    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError("Connexion indisponible.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const { message, error: sendError } = await sendRequestMessage(
        supabase,
        requestId,
        currentUserId,
        body,
      );
      if (sendError) {
        setError(sendError);
        return;
      }
      setDraft("");
      if (message) {
        setMessages((prev) => appendMessage(prev, message, currentUserId));
      }
    });
  }

  return (
    <div
      className={cn(
        "flex flex-col border border-[var(--line)] bg-[var(--bg)]",
        compact ? "mt-3" : "mt-5",
        className,
      )}
    >
      <div className="border-b border-[var(--line)] px-3 py-2">
        <p className="text-eyebrow">Discussion</p>
      </div>

      <div
        className={cn(
          "flex flex-col gap-3 overflow-y-auto px-3 py-3",
          compact ? "max-h-64" : "max-h-80",
        )}
      >
        <Bubble
          mine={false}
          author={initialAuthorName ?? "Demande initiale"}
          body={initialBody}
          at={initialCreatedAt}
          seed
        />

        {loading ? (
          <p className="text-xs text-[var(--ink-discreet)]">Chargement…</p>
        ) : null}

        {messages.map((msg) => (
          <Bubble
            key={msg.id}
            mine={msg.senderId === currentUserId}
            author={msg.senderName ?? "Utilisateur"}
            body={msg.body}
            at={msg.createdAt}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {canReply ? (
        <form
          onSubmit={onSubmit}
          className="flex flex-col gap-2 border-t border-[var(--line)] p-3"
        >
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={compact ? 2 : 3}
            maxLength={REQUEST_MESSAGE_MAX_LENGTH}
            placeholder="Écrire une réponse…"
            disabled={pending}
            className={cn(
              "w-full resize-y bg-transparent border border-[var(--line-strong)] px-3 py-2 text-sm text-[var(--ink)]",
              "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)]",
            )}
          />
          <div className="flex items-center justify-between gap-3">
            {error ? (
              <p className="text-xs text-[var(--ink-muted)]">{error}</p>
            ) : (
              <span className="text-xs text-[var(--ink-discreet)]">
                {draft.trim().length}/{REQUEST_MESSAGE_MAX_LENGTH}
              </span>
            )}
            <button
              type="submit"
              disabled={pending || draft.trim().length === 0}
              className={cn(
                "inline-flex items-center px-3 py-1.5 text-xs border transition-colors",
                "border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]",
                "disabled:opacity-40 disabled:cursor-not-allowed",
                "hover:bg-[var(--accent-warm)] hover:border-[var(--accent-warm)]",
              )}
            >
              {pending ? "Envoi…" : "Envoyer"}
            </button>
          </div>
        </form>
      ) : (
        <p className="border-t border-[var(--line)] px-3 py-2 text-xs text-[var(--ink-discreet)]">
          Demande traitée — rouvrez-la pour répondre.
        </p>
      )}
    </div>
  );
}

function Bubble({
  mine,
  author,
  body,
  at,
  seed = false,
}: {
  mine: boolean;
  author: string;
  body: string;
  at: string;
  seed?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 max-w-[90%]",
        mine ? "self-end items-end" : "self-start items-start",
      )}
    >
      <div className="flex items-baseline gap-2 text-[10px] uppercase tracking-wider text-[var(--ink-discreet)]">
        <span>{author}</span>
        <span className="tabular-nums normal-case tracking-normal">
          {timeFormatter.format(new Date(at))}
        </span>
      </div>
      <div
        className={cn(
          "px-3 py-2 text-sm whitespace-pre-wrap leading-relaxed",
          seed
            ? "border border-[var(--line-strong)] text-[var(--ink-muted)] bg-[var(--bg-elevated)]"
            : mine
              ? "bg-[var(--ink)] text-[var(--bg)]"
              : "bg-[var(--bg-elevated)] border border-[var(--line)] text-[var(--ink)]",
        )}
      >
        {body}
      </div>
    </div>
  );
}
