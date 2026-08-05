/**
 * SearchModal — ChatGPT-style command-palette search.
 *
 * Opens from the search icon in the sidebar header, or Ctrl/Cmd+K.
 *
 * Two sources are merged:
 *   1. Local chat history (titles + message bodies) — instant, works offline
 *      and for signed-out guests.
 *   2. Server message search — only when signed in; adds chats that have been
 *      pruned from localStorage.
 *
 * Results are built with createElement, never innerHTML: titles and snippets
 * are chat content, so interpolating them would be an XSS vector.
 */

import { $id } from "../utils.js";
import { apiFetch } from "../api.js";
import { getChatHistory, getClientIdByServerId } from "../state.js";

const MAX_LOCAL_RESULTS = 30;
const SNIPPET_RADIUS = 48;
const DEBOUNCE_MS = 180;

let overlay, panel, input, resultsEl, hintEl;
let isOpen = false;
let activeIndex = -1;
let rows = [];          // flat list of selectable { chatId, title, snippet, ts }
let debounceTimer = null;
let lastQuery = "";
let requestSeq = 0;
let lastFocused = null;

/* ---------- helpers ---------- */

const lastActivity = (chat) => {
  const msgs = chat?.messages;
  if (!Array.isArray(msgs) || !msgs.length) return 0;
  const ts = msgs[msgs.length - 1]?.timestamp;
  return typeof ts === "number" ? ts : 0;
};

const bucketFor = (ts) => {
  if (!ts) return "Older";
  const day = 24 * 60 * 60 * 1000;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const start = startOfToday.getTime();
  if (ts >= start) return "Today";
  if (ts >= start - day) return "Yesterday";
  if (ts >= start - 7 * day) return "Previous 7 days";
  if (ts >= start - 30 * day) return "Previous 30 days";
  return "Older";
};

/** Build a snippet centred on the first match, with the match offset kept. */
const snippetAround = (text, query) => {
  const flat = String(text || "").replace(/\s+/g, " ").trim();
  if (!query) return { text: flat.slice(0, 120), at: -1 };
  const at = flat.toLowerCase().indexOf(query.toLowerCase());
  if (at === -1) return { text: flat.slice(0, 120), at: -1 };
  const from = Math.max(0, at - SNIPPET_RADIUS);
  const to = Math.min(flat.length, at + query.length + SNIPPET_RADIUS);
  const prefix = from > 0 ? "…" : "";
  return {
    text: prefix + flat.slice(from, to) + (to < flat.length ? "…" : ""),
    at: at - from + prefix.length
  };
};

/**
 * Append text to `parent`, wrapping the match in <mark>.
 * `at` is a known offset (from snippetAround) or -1 to search for it.
 */
const appendHighlighted = (parent, text, query, at = -1) => {
  const value = String(text || "");
  const idx = at >= 0 ? at : (query ? value.toLowerCase().indexOf(query.toLowerCase()) : -1);
  if (idx < 0 || !query) {
    parent.appendChild(document.createTextNode(value));
    return;
  }
  parent.appendChild(document.createTextNode(value.slice(0, idx)));
  const mark = document.createElement("mark");
  mark.className = "search-hit";
  mark.textContent = value.slice(idx, idx + query.length);
  parent.appendChild(mark);
  parent.appendChild(document.createTextNode(value.slice(idx + query.length)));
};

/* ---------- search ---------- */

const searchLocal = (query) => {
  const q = query.toLowerCase();
  const out = [];
  for (const chat of getChatHistory()) {
    const title = chat.title || "New Chat";
    const ts = lastActivity(chat);
    if (title.toLowerCase().includes(q)) {
      out.push({ chatId: chat.id, title, snippet: null, ts, source: "title" });
      continue;
    }
    const hit = (chat.messages || []).find(
      (m) => typeof m.content === "string" && m.content.toLowerCase().includes(q)
    );
    if (hit) {
      out.push({ chatId: chat.id, title, snippet: snippetAround(hit.content, query), ts, source: "message" });
    }
  }
  return out.sort((a, b) => b.ts - a.ts).slice(0, MAX_LOCAL_RESULTS);
};

const searchServer = async (query, seq) => {
  try {
    const res = await apiFetch(`/api/chats/search?q=${encodeURIComponent(query)}`);
    if (seq !== requestSeq) return [];           // a newer query already ran
    if (!res.ok) return [];                       // 401 for guests — local results stand
    const data = await res.json();
    const seen = new Set();
    const out = [];
    for (const r of data.results || []) {
      // The API keys results by Mongo _id; the UI navigates by clientId.
      const clientId = getClientIdByServerId(r.chatId);
      if (!clientId || seen.has(clientId)) continue;
      seen.add(clientId);
      out.push({
        chatId: clientId,
        title: r.chatTitle || "Untitled",
        snippet: snippetAround(r.matchPreview || r.content, query),
        ts: r.timestamp ? new Date(r.timestamp).getTime() : 0,
        source: "server"
      });
    }
    return out;
  } catch {
    return [];
  }
};

const runSearch = async (query) => {
  const seq = ++requestSeq;
  const local = searchLocal(query);
  render(query, local);                           // paint instantly

  const remote = await searchServer(query, seq);
  if (seq !== requestSeq) return;
  if (!remote.length) return;

  const known = new Set(local.map((r) => r.chatId));
  const merged = local.concat(remote.filter((r) => !known.has(r.chatId)));
  render(query, merged.sort((a, b) => b.ts - a.ts));
};

/* ---------- render ---------- */

const chatIcon = () => {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("class", "search-row-icon");
  const p = document.createElementNS(ns, "path");
  p.setAttribute("d", "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z");
  svg.appendChild(p);
  return svg;
};

const buildRow = (result, query, index) => {
  const row = document.createElement("button");
  row.type = "button";
  row.className = "search-row";
  row.dataset.index = String(index);
  row.setAttribute("role", "option");
  row.setAttribute("aria-selected", "false");

  row.appendChild(chatIcon());

  const body = document.createElement("span");
  body.className = "search-row-body";

  const title = document.createElement("span");
  title.className = "search-row-title";
  if (result.source === "title") appendHighlighted(title, result.title, query);
  else title.textContent = result.title;
  body.appendChild(title);

  if (result.snippet) {
    const snip = document.createElement("span");
    snip.className = "search-row-snippet";
    appendHighlighted(snip, result.snippet.text, query, result.snippet.at);
    body.appendChild(snip);
  }
  row.appendChild(body);

  if (result.ts) {
    const when = document.createElement("span");
    when.className = "search-row-time";
    when.textContent = new Date(result.ts).toLocaleDateString(undefined, {
      month: "short", day: "numeric"
    });
    row.appendChild(when);
  }

  row.addEventListener("click", () => choose(index));
  return row;
};

const render = (query, results) => {
  if (!resultsEl) return;
  resultsEl.textContent = "";
  rows = results;
  activeIndex = results.length ? 0 : -1;

  if (!query.trim()) {
    const tip = document.createElement("div");
    tip.className = "search-empty";
    tip.textContent = "Search your chats by title or message content.";
    resultsEl.appendChild(tip);
    updateHint(0);
    return;
  }

  if (!results.length) {
    const empty = document.createElement("div");
    empty.className = "search-empty";
    empty.textContent = `No chats match "${query}".`;
    resultsEl.appendChild(empty);
    updateHint(0);
    return;
  }

  let currentBucket = null;
  results.forEach((result, index) => {
    const bucket = bucketFor(result.ts);
    if (bucket !== currentBucket) {
      currentBucket = bucket;
      const label = document.createElement("div");
      label.className = "search-group-label";
      label.textContent = bucket;
      resultsEl.appendChild(label);
    }
    resultsEl.appendChild(buildRow(result, query, index));
  });

  updateHint(results.length);
  paintActive();
};

const updateHint = (count) => {
  if (!hintEl) return;
  hintEl.textContent = count
    ? `${count} result${count === 1 ? "" : "s"} — ↑↓ to navigate, Enter to open`
    : "Esc to close";
};

const paintActive = () => {
  const els = resultsEl?.querySelectorAll(".search-row") || [];
  els.forEach((el) => {
    const on = Number(el.dataset.index) === activeIndex;
    el.classList.toggle("active", on);
    el.setAttribute("aria-selected", on ? "true" : "false");
    if (on) el.scrollIntoView({ block: "nearest" });
  });
  if (input) {
    const active = resultsEl?.querySelector(".search-row.active");
    if (active) {
      if (!active.id) active.id = `search-row-${activeIndex}`;
      input.setAttribute("aria-activedescendant", active.id);
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }
};

const move = (delta) => {
  if (!rows.length) return;
  activeIndex = (activeIndex + delta + rows.length) % rows.length;
  paintActive();
};

const choose = (index) => {
  const result = rows[index];
  if (!result) return;
  close();
  window.dispatchEvent(new CustomEvent("qai:loadChat", { detail: { id: result.chatId } }));
};

/* ---------- open / close ---------- */

export const openSearch = () => {
  if (!overlay || isOpen) return;
  isOpen = true;
  lastFocused = document.activeElement;
  overlay.classList.remove("hidden");
  // Let the class land before transitioning, so the animation actually plays.
  requestAnimationFrame(() => overlay.classList.add("open"));
  if (input) {
    input.value = "";
    input.focus();
  }
  lastQuery = "";
  render("", []);
};

export const close = () => {
  if (!overlay || !isOpen) return;
  isOpen = false;
  requestSeq++;                                   // invalidate in-flight requests
  overlay.classList.remove("open");
  overlay.classList.add("hidden");
  if (debounceTimer) clearTimeout(debounceTimer);
  if (lastFocused && typeof lastFocused.focus === "function") lastFocused.focus();
};

const onInput = () => {
  const query = input.value;
  if (query === lastQuery) return;
  lastQuery = query;
  if (debounceTimer) clearTimeout(debounceTimer);
  if (!query.trim()) {
    requestSeq++;
    render("", []);
    return;
  }
  // Local results are synchronous; only the server call needs debouncing.
  debounceTimer = setTimeout(() => runSearch(query.trim()), DEBOUNCE_MS);
  render(query, searchLocal(query.trim()));
};

const onKeydown = (e) => {
  if (e.key === "Escape") { e.preventDefault(); close(); return; }
  if (e.key === "ArrowDown") { e.preventDefault(); move(1); return; }
  if (e.key === "ArrowUp") { e.preventDefault(); move(-1); return; }
  if (e.key === "Enter") { e.preventDefault(); choose(activeIndex); }
};

export const initSearchModal = () => {
  overlay = $id("searchOverlay");
  panel = $id("searchPanel");
  input = $id("searchModalInput");
  resultsEl = $id("searchModalResults");
  hintEl = $id("searchModalHint");
  if (!overlay) return;

  input?.addEventListener("input", onInput);
  overlay.addEventListener("keydown", onKeydown);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  $id("searchModalClose")?.addEventListener("click", close);
  $id("sidebarSearchBtn")?.addEventListener("click", openSearch);
  $id("searchBtnMain")?.addEventListener("click", openSearch);

  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      isOpen ? close() : openSearch();
    }
  });
};
