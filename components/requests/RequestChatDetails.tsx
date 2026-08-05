"use client";

import { useState } from "react";
import {
  RequestMediaGallery,
  type RequestMediaItem,
} from "@/components/requests/RequestMediaGallery";
import { RequestChatThread } from "@/components/requests/RequestChatThread";

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
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <details
      className={className ?? "group mt-2"}
      onToggle={(e) => {
        setOpen((e.currentTarget as HTMLDetailsElement).open);
      }}
    >
      <summary className="cursor-pointer list-none text-[var(--ink)] hover:text-[var(--accent-warm)]">
        <span className="text-xs text-[var(--ink-discreet)] group-open:hidden">
          Voir la discussion
          {media.length > 0
            ? ` (${media.length} photo${media.length > 1 ? "s" : ""})`
            : ""}
          {unreadCount > 0
            ? ` · ${unreadCount} non lu${unreadCount > 1 ? "s" : ""}`
            : ""}
        </span>
        <span className="text-xs text-[var(--ink-discreet)] hidden group-open:inline">
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
        />
      ) : null}
    </details>
  );
}
