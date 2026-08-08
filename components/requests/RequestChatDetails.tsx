"use client";

import { useState, type ReactNode } from "react";
import {
  RequestMediaGallery,
  type RequestMediaItem,
} from "@/components/requests/RequestMediaGallery";
import { RequestChatThread } from "@/components/requests/RequestChatThread";
import { cn } from "@/lib/cn";

type Props = {
  requestId: string;
  currentUserId: string;
  initialBody: string;
  initialCreatedAt: string;
  initialAuthorName: string | null;
  status: "open" | "closed";
  /** Photos à afficher dans le panneau (vide si déjà affichées ailleurs). */
  media?: RequestMediaItem[];
  unreadCount?: number;
  className?: string;
  compact?: boolean;
  allowReplyWhenClosed?: boolean;
  /** `api` = polling cookie `/api/v1` (postgres local / Scalingo). */
  messageTransport?: "supabase" | "api";
  trigger?: ReactNode;
};

/**
 * Monte le fil seulement à l’ouverture, pour éviter Realtime + mark-as-read
 * sur toutes les cartes d’une liste.
 */
export function RequestChatDetails({
  requestId,
  currentUserId,
  initialBody,
  initialCreatedAt,
  initialAuthorName,
  status,
  media = [],
  unreadCount = 0,
  className,
  compact = true,
  allowReplyWhenClosed = false,
  messageTransport = "supabase",
  trigger,
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className={className ?? cn("group", !trigger && "mt-2")}
      onToggle={(e) => {
        setOpen((e.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className="cursor-pointer list-none text-[var(--ink)] hover:text-[var(--accent-warm)]">
        {trigger}
        <span
          className={cn(
            "block text-xs text-[var(--ink-discreet)] group-open:hidden",
            trigger ? "mt-2" : undefined,
          )}
        >
          Voir la discussion
          {media.length > 0
            ? ` (${media.length} photo${media.length > 1 ? "s" : ""})`
            : ""}
          {unreadCount > 0
            ? ` · ${unreadCount} non lu${unreadCount > 1 ? "s" : ""}`
            : ""}
        </span>
        <span
          className={cn(
            "hidden text-xs text-[var(--ink-discreet)] group-open:block",
            trigger ? "mt-2" : undefined,
          )}
        >
          Masquer
        </span>
      </summary>
      {media.length > 0 ? <RequestMediaGallery media={media} /> : null}
      {open ? (
        <RequestChatThread
          requestId={requestId}
          currentUserId={currentUserId}
          initialBody={initialBody}
          initialCreatedAt={initialCreatedAt}
          initialAuthorName={initialAuthorName}
          status={status}
          compact={compact}
          allowReplyWhenClosed={allowReplyWhenClosed}
          messageTransport={messageTransport}
        />
      ) : null}
    </details>
  );
}
