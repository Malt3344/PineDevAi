"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createConversation, signOutAction } from "@/app/chat/actions";

type Conversation = {
  id: string;
  title: string;
};

/**
 * The chat navigation rail: new-chat action, saved-strategies link,
 * conversation list, and account footer (email + sign out). Collapses
 * into a slide-out drawer on narrow screens.
 */
export function ConversationSidebar({
  conversations,
  userEmail,
}: {
  conversations: Conversation[];
  userEmail: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-4">
        <Link href="/chat" className="text-sm font-semibold tracking-tight">
          PineDev
        </Link>
        <button
          type="button"
          className="text-muted hover:text-foreground md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close conversation list"
        >
          ✕
        </button>
      </div>

      <div className="space-y-2 p-3">
        <form action={createConversation}>
          <button
            type="submit"
            className="w-full rounded-md border border-border bg-surface-2 px-3 py-2 text-sm font-medium transition hover:border-accent hover:text-accent"
          >
            + New chat
          </button>
        </form>
        <Link
          href="/chat/strategies"
          onClick={() => setMobileOpen(false)}
          className={`block rounded-md px-3 py-2 text-center text-sm transition ${
            pathname === "/chat/strategies"
              ? "bg-surface-2 text-foreground"
              : "text-muted hover:bg-surface-2 hover:text-foreground"
          }`}
        >
          Saved strategies
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 pb-4">
        {conversations.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted">No conversations yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((conversation) => {
              const href = `/chat/${conversation.id}`;
              const isActive = pathname === href;
              return (
                <li key={conversation.id}>
                  <Link
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    className={`block truncate rounded-md px-3 py-2 text-sm transition ${
                      isActive
                        ? "bg-surface-2 text-foreground"
                        : "text-muted hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    {conversation.title || "New chat"}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-muted" title={userEmail}>
            {userEmail}
          </span>
          <form action={signOutAction}>
            <button
              type="submit"
              className="shrink-0 text-xs text-muted underline-offset-2 hover:text-foreground hover:underline"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-border px-4 py-3 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="text-sm text-muted hover:text-foreground"
          aria-label="Open conversation list"
        >
          ☰ Conversations
        </button>
        <Link href="/chat" className="text-sm font-semibold tracking-tight">
          PineDev
        </Link>
      </div>

      <aside className="hidden w-64 shrink-0 border-r border-border bg-surface md:block">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="w-72 border-r border-border bg-surface">{sidebarContent}</div>
          <div
            className="flex-1 bg-black/60"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
        </div>
      )}
    </>
  );
}
