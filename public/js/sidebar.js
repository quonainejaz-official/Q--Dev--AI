import { $id, showToast, showModal } from "./utils.js";
import {
  getChatHistory, getCurrentChat, setCurrentChatState, setCurrentChat,
  ensureCurrentInHistory, storeCurrentInHistory, persistState,
  getChatHistory as getHistory, deleteHistory
} from "./state.js";
import { apiFetch } from "./api.js";

const SIDEBAR_COLLAPSED_KEY = "qai-sidebar-collapsed";
const THEME_KEY = "qai_theme";

let appContainer, sidebarToggle, sidebarToggleMain, sidebarOverlay;
let chatHistoryList, newChatButton, newChatButtonMain;
let searchInput, searchResults;

export const closeSidebarOnMobile = () => {
  if (window.innerWidth <= 768 && appContainer) {
    appContainer.classList.add("sidebar-collapsed");
    if (sidebarOverlay) sidebarOverlay.classList.remove("active");
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
  }
};

const toggleSidebar = () => {
  if (!appContainer) return;
  const isCollapsed = appContainer.classList.toggle("sidebar-collapsed");
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isCollapsed);
  if (window.innerWidth <= 768) {
    if (isCollapsed) sidebarOverlay?.classList.remove("active");
    else sidebarOverlay?.classList.add("active");
  }
};

const loadSidebarState = () => {
  if (!appContainer) return;
  let isCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  if (isCollapsed === null && window.innerWidth <= 768) isCollapsed = "true";
  else isCollapsed = isCollapsed === "true";
  if (isCollapsed) {
    appContainer.classList.add("sidebar-collapsed");
    sidebarOverlay?.classList.remove("active");
  } else if (window.innerWidth <= 768) {
    sidebarOverlay?.classList.add("active");
  }
};

// --- Theme ---
const applyTheme = (theme) => {
  document.documentElement.setAttribute("data-theme", theme);
  const btn = $id("themeToggle");
  if (btn) {
    const sun = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
    const moon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
    btn.innerHTML = theme === "light" ? moon : sun;
  }
};

const toggleTheme = () => {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === "light" ? "dark" : "light";
  applyTheme(next);
  localStorage.setItem(THEME_KEY, next);
};

const loadTheme = () => {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved) applyTheme(saved);
  else applyTheme("dark");
};

// --- Search ---
let searchDebounce = null;

const handleSearch = (query) => {
  if (!searchResults) return;
  if (!query.trim()) {
    searchResults.classList.add("hidden");
    searchResults.innerHTML = "";
    return;
  }
  if (searchDebounce) clearTimeout(searchDebounce);
  searchDebounce = setTimeout(async () => {
    try {
      const res = await apiFetch(`/api/chats/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return;
      const data = await res.json();
      renderSearchResults(data.results || []);
    } catch { /* ignore */ }
  }, 300);
};

const renderSearchResults = (results) => {
  if (!searchResults) return;
  if (!results.length) {
    searchResults.innerHTML = '<div class="search-empty">No results found</div>';
    searchResults.classList.remove("hidden");
    return;
  }
  searchResults.innerHTML = "";
  results.forEach(r => {
    const item = document.createElement("div");
    item.className = "search-result-item";
    item.innerHTML = `
      <span class="search-result-title">${r.title || "Untitled"}</span>
      <span class="search-result-snippet">${r.snippet || ""}</span>
    `;
    item.addEventListener("click", () => {
      const chat = getHistory().find(c => c.id === r.chatId || c.id === r.id);
      if (chat) {
        window.dispatchEvent(new CustomEvent("qai:loadChat", { detail: { id: chat.id } }));
        searchResults.classList.add("hidden");
        if (searchInput) searchInput.value = "";
      }
    });
    searchResults.appendChild(item);
  });
  searchResults.classList.remove("hidden");
};

// --- Logo ---
const renderWordmark = (containerId, isLarge = false) => {
  const container = $id(containerId);
  if (!container) return;
  const wrap = document.createElement("div");
  wrap.className = `wordmark-wrapper ${isLarge ? "large" : ""}`;
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "wordmark-icon");
  const circle = document.createElementNS(svgNS, "circle");
  circle.setAttribute("cx", "12"); circle.setAttribute("cy", "12");
  circle.setAttribute("r", "9"); circle.setAttribute("stroke", "currentColor");
  circle.setAttribute("stroke-width", "2.5"); circle.setAttribute("fill", "none");
  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", "18"); line.setAttribute("y1", "18");
  line.setAttribute("x2", "22"); line.setAttribute("y2", "22");
  line.setAttribute("stroke", "currentColor"); line.setAttribute("stroke-width", "2.5");
  line.setAttribute("stroke-linecap", "round");
  const dot = document.createElementNS(svgNS, "circle");
  dot.setAttribute("cx", "12"); dot.setAttribute("cy", "12");
  dot.setAttribute("r", "3"); dot.setAttribute("fill", "var(--accent-blue)");
  svg.append(circle, line, dot);
  const text = document.createElement("div");
  text.className = "wordmark-text";
  text.innerHTML = '<span class="q-letter">Q</span><span class="dev-part">-Dev</span><span class="ai-part">-AI</span>';
  wrap.append(svg, text);
  container.innerHTML = "";
  container.appendChild(wrap);
};

// --- History list ---
export const renderHistoryList = () => {
  if (!chatHistoryList) return;
  const history = getHistory();
  const current = getCurrentChat();
  chatHistoryList.innerHTML = "";
  history.forEach((chat) => {
    const item = document.createElement("div");
    item.className = "history-item" + (chat.id === current.id ? " active" : "");
    const titleContainer = document.createElement("div");
    titleContainer.className = "history-title-container";
    const title = document.createElement("span");
    title.className = "history-title";
    title.textContent = chat.title || "New Chat";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "history-action-btn edit-history-btn";
    editBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>';
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const input = document.createElement("input");
      input.className = "history-title-input";
      input.value = chat.title || "New Chat";
      const save = () => {
        const newTitle = input.value.trim() || "New Chat";
        chat.title = newTitle;
        chat.titleIsCustom = true;
        const cur = getCurrentChat();
        if (chat.id === cur.id) {
          cur.title = newTitle;
          cur.titleIsCustom = true;
          setCurrentChatState(cur);
          const titleEl = $id("currentChatTitle");
          if (titleEl) titleEl.textContent = newTitle;
        }
        persistState();
        renderHistoryList();
      };
      input.addEventListener("keydown", (e2) => {
        if (e2.key === "Enter") save();
        if (e2.key === "Escape") renderHistoryList();
      });
      input.addEventListener("blur", save);
      titleContainer.replaceChild(input, title);
      input.focus();
      input.select();
      editBtn.style.display = "none";
    });
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "history-action-btn delete-history-btn";
    deleteBtn.textContent = "\u2715";
    deleteBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showModal("Delete Chat", "Delete this chat history? This cannot be undone.", () => {
        deleteHistory(chat.id);
        renderHistoryList();
      });
    });
    titleContainer.append(title, editBtn);
    item.addEventListener("click", () => {
      window.dispatchEvent(new CustomEvent("qai:loadChat", { detail: { id: chat.id } }));
    });
    item.append(titleContainer, deleteBtn);
    chatHistoryList.appendChild(item);
  });
};

// --- Init ---
export const initSidebar = () => {
  appContainer = $id("appContainer") || document.querySelector(".app-container");
  sidebarToggle = $id("sidebarToggle") || document.querySelector(".sidebar-toggle");
  sidebarToggleMain = $id("sidebarToggleMain") || document.querySelector(".sidebar-toggle-main");
  sidebarOverlay = $id("sidebarOverlay");
  chatHistoryList = $id("chatHistory");
  newChatButton = $id("newChatButton");
  newChatButtonMain = $id("newChatButtonMain");
  searchInput = $id("chatSearchInput");
  searchResults = $id("searchResults");

  if (sidebarToggle) sidebarToggle.addEventListener("click", toggleSidebar);
  if (sidebarToggleMain) sidebarToggleMain.addEventListener("click", toggleSidebar);
  if (sidebarOverlay) sidebarOverlay.addEventListener("click", closeSidebarOnMobile);

  const themeToggle = $id("themeToggle");
  if (themeToggle) themeToggle.addEventListener("click", toggleTheme);

  if (searchInput) {
    searchInput.addEventListener("input", (e) => handleSearch(e.target.value));
    searchInput.addEventListener("focus", () => {
      if (searchInput.value.trim()) handleSearch(searchInput.value);
    });
    document.addEventListener("click", (e) => {
      if (searchResults && !searchResults.contains(e.target) && e.target !== searchInput) {
        searchResults.classList.add("hidden");
      }
    });
  }

  loadSidebarState();
  loadTheme();
  renderWordmark("sidebarLogo");
  renderWordmark("welcomeLogo", true);
};
