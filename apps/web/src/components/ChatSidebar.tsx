import { useEffect, useRef, useState } from "react";
import type { AuthResponse, ChatSessionSummary } from "@disa/shared-types";
import { filterSessionsByTitle } from "../chat/filterSessions";
import { groupSessionsByPinned } from "../chat/groupSessions";
import { useAutoHideScrollbar } from "../chat/useAutoHideScrollbar";
import { IconEdit, IconLogout, IconMoreVertical, IconPanelLeft, IconPin, IconSearch, IconTrash } from "./icons";

interface Props {
  sessions: ChatSessionSummary[];
  activeId: string | null;
  loading: boolean;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, currentTitle: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  username: string;
  role: AuthResponse["role"];
  onLogout: () => void;
}

const COLLAPSED_KEY = "disa_sidebar_collapsed";
const SLIDE_IN_MS_PER_PX = 30;
const SLIDE_IN_MIN_MS = 600;
const SLIDE_OUT_MS = 150;

function initials(name: string): string {
  return name.trim().slice(0, 2).toUpperCase() || "?";
}

/** Reveals overflowing session titles on hover by sliding the text left until its end is visible, then snaps back quickly on mouse-out. */
function SessionTitleText({ title }: { title: string }) {
  const clipRef = useRef<HTMLSpanElement>(null);
  const [offset, setOffset] = useState(0);
  const [durationMs, setDurationMs] = useState(SLIDE_OUT_MS);

  function handleMouseEnter() {
    const clip = clipRef.current;
    if (!clip) return;
    const overflow = clip.scrollWidth - clip.clientWidth;
    if (overflow > 0) {
      setOffset(overflow);
      setDurationMs(Math.max(SLIDE_IN_MIN_MS, overflow * SLIDE_IN_MS_PER_PX));
    }
  }

  function handleMouseLeave() {
    setOffset(0);
    setDurationMs(SLIDE_OUT_MS);
  }

  return (
    <span
      ref={clipRef}
      className={`chat-session-item-title-clip${offset === 0 ? " fade-end" : ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <span
        className="chat-session-item-title-text"
        style={{
          transform: `translateX(-${offset}px)`,
          transitionDuration: `${durationMs}ms`,
        }}
      >
        {title}
      </span>
    </span>
  );
}

interface SessionMenuProps {
  session: ChatSessionSummary;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  onRename: () => void;
  onPin: () => void;
  onDelete: () => void;
}

/** Replaces the old separate edit/delete icon buttons with a single overflow menu (Pin/Rename/Delete), open state driven by a CSS transition rather than mount/unmount. */
function SessionMenu({ session, open, onToggle, onClose, onRename, onPin, onDelete }: SessionMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) onClose();
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  return (
    <div className="chat-session-menu-container" ref={containerRef}>
      <button
        type="button"
        className={`chat-session-item-action${open ? " chat-session-item-action-open" : ""}`}
        aria-label={`Options for "${session.title}"`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
      >
        <IconMoreVertical size={15} />
      </button>
      <div className={`chat-session-menu${open ? " open" : ""}`} role="menu">
        <button type="button" role="menuitem" className="chat-session-menu-item" onClick={onPin}>
          <IconPin size={13} />
          {session.pinned ? "Unpin" : "Pin"}
        </button>
        <button type="button" role="menuitem" className="chat-session-menu-item" onClick={onRename}>
          <IconEdit size={13} />
          Rename
        </button>
        <button type="button" role="menuitem" className="chat-session-menu-item chat-session-menu-item-danger" onClick={onDelete}>
          <IconTrash size={13} />
          Delete
        </button>
      </div>
    </div>
  );
}

/**
 * Build Plan V2.5 — collapsible icon sidebar. Expanded order: New chat,
 * Search chats, Recents, user at the bottom. Collapsed order: New chat,
 * Search chats, user — Recents disappears entirely rather than becoming
 * icon-only, since a list of session titles has no icon-only equivalent.
 */
export function ChatSidebar({ sessions, activeId, loading, onSelect, onNewChat, onDelete, onRename, onPin, username, role, onLogout }: Props) {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const sessionListRef = useAutoHideScrollbar<HTMLDivElement>();
  const filtered = filterSessionsByTitle(sessions, query);
  const { pinned, unpinned } = groupSessionsByPinned(filtered);

  function renderSessionItem(session: ChatSessionSummary) {
    return (
      <div key={session.id} className={`chat-session-item${session.id === activeId ? " active" : ""}`}>
        <button type="button" className="chat-session-item-title" onClick={() => onSelect(session.id)}>
          <SessionTitleText title={session.title} />
        </button>
        <SessionMenu
          session={session}
          open={openMenuId === session.id}
          onToggle={() => setOpenMenuId(openMenuId === session.id ? null : session.id)}
          onClose={() => setOpenMenuId(null)}
          onRename={() => {
            setOpenMenuId(null);
            onRename(session.id, session.title);
          }}
          onPin={() => {
            setOpenMenuId(null);
            onPin(session.id, !session.pinned);
          }}
          onDelete={() => {
            setOpenMenuId(null);
            if (window.confirm(`Delete "${session.title}"? This cannot be undone.`)) {
              onDelete(session.id);
            }
          }}
        />
      </div>
    );
  }

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  function setCollapsedPersisted(next: boolean) {
    setCollapsed(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
    } catch {
      // localStorage can be unavailable (private browsing); the preference just won't persist.
    }
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
  }

  function openSearch() {
    if (collapsed) setCollapsedPersisted(false);
    setSearchOpen(true);
  }

  return (
    <nav className={`chat-sidebar${collapsed ? " collapsed" : ""}`} aria-label="Chat navigation">
      <div className="chat-sidebar-top">
        <button
          type="button"
          className="chat-brand-toggle"
          onClick={() => setCollapsedPersisted(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          data-tooltip={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          data-tooltip-pos="bottom"
        >
          <div className="app-brand-mark">DI</div>
        </button>
        {!collapsed && (
          <button
            type="button"
            className="chat-sidebar-collapse-btn"
            onClick={() => setCollapsedPersisted(true)}
            aria-label="Collapse sidebar"
            data-tooltip="Collapse sidebar"
            data-tooltip-pos="bottom"
          >
            <IconPanelLeft size={17} />
          </button>
        )}
      </div>

      <button type="button" className="chat-nav-row" onClick={onNewChat} aria-label="New chat">
        <IconEdit size={17} />
        <span className="chat-nav-label">New chat</span>
      </button>

      {searchOpen ? (
          <div className="chat-sidebar-search-box">
            <IconSearch size={14} />
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search chats…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") closeSearch();
              }}
              onBlur={() => {
                if (!query) closeSearch();
              }}
              aria-label="Search chats"
            />
            <button type="button" className="chat-sidebar-search-clear" onClick={closeSearch} aria-label="Close search">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        ) : (
          <button type="button" className="chat-nav-row" onClick={openSearch} aria-label="Search chats">
            <IconSearch size={17} />
            <span className="chat-nav-label">Search chats</span>
          </button>
        )}

      <div className="chat-sidebar-recents">
        {pinned.length === 0 && <div className="chat-sidebar-section-label">Recents</div>}
        {loading ? (
          <div className="chat-sidebar-loading">
            <span className="spinner" /> Loading…
          </div>
        ) : sessions.length === 0 ? (
          <div className="chat-sidebar-empty">No sessions yet.</div>
        ) : filtered.length === 0 ? (
          <div className="chat-sidebar-empty">No chats match &quot;{query}&quot;.</div>
        ) : (
          <div className="chat-session-scroll" ref={sessionListRef}>
            {pinned.length > 0 && (
              <div className="chat-session-list">
                <div className="chat-sidebar-section-sublabel">Pinned</div>
                {pinned.map(renderSessionItem)}
              </div>
            )}
            <div className="chat-session-list">
              {pinned.length > 0 && <div className="chat-sidebar-section-sublabel">Recents</div>}
              {unpinned.length === 0 ? <div className="chat-sidebar-empty">No other chats.</div> : unpinned.map(renderSessionItem)}
            </div>
          </div>
        )}
      </div>

      <div className="chat-sidebar-footer">
        <div className="chat-sidebar-user" title={username}>
          <div className="chat-sidebar-avatar">{initials(username)}</div>
          <div className="chat-sidebar-user-text">
            <strong>{username}</strong>
            {role === "admin" ? "Administrator" : "Standard user"}
          </div>
        </div>
        <button type="button" className="chat-sidebar-logout" onClick={onLogout} aria-label="Log out">
          <IconLogout size={17} />
          <span className="chat-sidebar-logout-label">Log out</span>
        </button>
      </div>
    </nav>
  );
}
