import { apiFetch } from "./api.js";
import { showToast } from "./utils.js";

const STORAGE_KEY = "qai-chat-history";
const CURRENT_KEY = "qai-current-chat";

export const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const createChat = (messages = [], id = generateId(), title = "New Chat") => ({
  id, title, titleIsCustom: false, messages
});

export const getTitleFromMessages = (messages) => {
  const firstUser = messages.find((m) => m.role === "user");
  const base = firstUser?.content?.trim() || "New Chat";
  return base.length <= 32 ? base : `${base.slice(0, 32)}...`;
};

export const normalizeMessages = (messages) => {
  if (!Array.isArray(messages)) return [];
  return messages.map((item) => {
    const msg = {
      role: item?.role === "bot" ? "bot" : "user",
      content: String(item?.content ?? ""),
      timestamp: typeof item?.timestamp === "number" ? item.timestamp : Date.now()
    };
    ["images","audios","videos","pdfs","generatedImage","generatedPrompt"].forEach(f => {
      if (item[f]) msg[f] = item[f];
    });
    return msg;
  });
};

export const normalizeChatEntry = (chat) => {
  const messages = normalizeMessages(chat?.messages);
  const derivedTitle = getTitleFromMessages(messages);
  const rawTitle = typeof chat?.title === "string" ? chat.title.trim() : "";
  const title = rawTitle || derivedTitle;
  const titleIsCustom =
    typeof chat?.titleIsCustom === "boolean"
      ? chat.titleIsCustom
      : Boolean(rawTitle && rawTitle !== derivedTitle);
  return {
    id: typeof chat?.id === "string" && chat.id ? chat.id : generateId(),
    title: titleIsCustom ? title : derivedTitle,
    titleIsCustom, messages
  };
};

// --- Shared state ---
let _authUser = null;
let _chatHistory = [];
let _currentChat = createChat();
const _clientIdToServerId = {};

export const getAuthUser = () => _authUser;
export const setAuthUser = (u) => { _authUser = u; };
export const isLoggedIn = () => Boolean(_authUser);

export const getChatHistory = () => _chatHistory;
export const setChatHistory = (h) => { _chatHistory = h; };

export const getCurrentChat = () => _currentChat;
export const setCurrentChatState = (c) => { _currentChat = c; };

export const getServerId = (clientId) => _clientIdToServerId[clientId];
// Server search results carry Mongo _ids; the UI keys everything by clientId.
export const getClientIdByServerId = (serverId) => {
  if (!serverId) return undefined;
  const target = String(serverId);
  return Object.keys(_clientIdToServerId)
    .find((clientId) => String(_clientIdToServerId[clientId]) === target);
};
export const setServerId = (clientId, serverId) => { _clientIdToServerId[clientId] = serverId; };
export const deleteServerId = (clientId) => { delete _clientIdToServerId[clientId]; };
export const clearServerIds = () => { Object.keys(_clientIdToServerId).forEach(k => delete _clientIdToServerId[k]); };

// --- Local storage ---
export const loadStoredHistory = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    _chatHistory = Array.isArray(parsed) ? parsed.map(normalizeChatEntry) : [];
  } catch {
    _chatHistory = [];
  }
};

export const loadStoredCurrent = () => {
  try {
    const stored = localStorage.getItem(CURRENT_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed ? normalizeChatEntry(parsed) : null;
  } catch {
    return null;
  }
};

export const saveLocal = () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(
      _chatHistory.map(c => ({ ...c, messages: c.messages }))
    ));
    localStorage.setItem(CURRENT_KEY, JSON.stringify({
      ..._currentChat, messages: _currentChat.messages
    }));
  } catch {
    // localStorage can overflow with large base64 media
  }
};

// --- Cloud sync ---
let _cloudSaveTimer = null;

export const cloudSaveChat = async (chat) => {
  if (!isLoggedIn() || !chat || !Array.isArray(chat.messages) || !chat.messages.length) return;
  try {
    const res = await apiFetch("/api/chats", {
      method: "POST",
      body: JSON.stringify({
        clientId: chat.id, title: chat.title,
        titleIsCustom: chat.titleIsCustom, messages: chat.messages
      })
    });
    if (res.ok) {
      const data = await res.json();
      if (data.chat && data.chat._id) _clientIdToServerId[chat.id] = data.chat._id;
    }
  } catch { /* offline: localStorage still has data */ }
};

export const scheduleCloudSave = () => {
  if (!isLoggedIn()) return;
  if (_cloudSaveTimer) clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(() => cloudSaveChat(_currentChat), 1200);
};

export const persistState = () => {
  saveLocal();
  scheduleCloudSave();
};

export const cloudDeleteChat = async (clientId) => {
  if (!isLoggedIn()) return;
  const serverId = _clientIdToServerId[clientId];
  if (!serverId) return;
  try {
    await apiFetch(`/api/chats/${serverId}`, { method: "DELETE" });
    delete _clientIdToServerId[clientId];
  } catch { /* ignore */ }
};

export const loadCloudChats = async () => {
  try {
    const res = await apiFetch("/api/chats");
    if (!res.ok) return;
    const data = await res.json();
    const serverChats = (data.chats || []).map((c) => {
      _clientIdToServerId[c.id] = c._id;
      return normalizeChatEntry({
        id: c.id, title: c.title,
        titleIsCustom: c.titleIsCustom, messages: c.messages
      });
    });
    _chatHistory = serverChats;
    const currentHasConversation = _currentChat.messages.some((m) => m.role === "user");
    if (currentHasConversation) {
      ensureCurrentInHistory();
    } else if (serverChats.length) {
      setCurrentChat(serverChats[0]);
    }
    saveLocal();
    return true; // signal to re-render
  } catch { return false; }
};

export const migrateGuestChats = async () => {
  const local = _chatHistory.filter(c => Array.isArray(c.messages) && c.messages.length);
  if (!local.length) return;
  try {
    await apiFetch("/api/chats/migrate", {
      method: "POST",
      body: JSON.stringify({
        chats: local.map(c => ({
          clientId: c.id, id: c.id, title: c.title,
          titleIsCustom: c.titleIsCustom, messages: c.messages
        }))
      })
    });
  } catch { /* ignore */ }
};

// --- History management ---
export const storeCurrentInHistory = () => {
  if (!_currentChat.messages.length) return;
  const derivedTitle = getTitleFromMessages(_currentChat.messages);
  const title = _currentChat.titleIsCustom ? _currentChat.title : derivedTitle;
  const entry = { ..._currentChat, title, titleIsCustom: Boolean(_currentChat.titleIsCustom) };
  const idx = _chatHistory.findIndex(c => c.id === entry.id);
  if (idx >= 0) _chatHistory[idx] = entry;
  else _chatHistory.unshift(entry);
  persistState();
};

export const ensureCurrentInHistory = () => {
  if (!_currentChat.messages.length) return;
  const idx = _chatHistory.findIndex(c => c.id === _currentChat.id);
  if (idx === -1) {
    const derivedTitle = getTitleFromMessages(_currentChat.messages);
    const title = _currentChat.titleIsCustom ? _currentChat.title : derivedTitle;
    _chatHistory.unshift({
      ..._currentChat, title,
      titleIsCustom: Boolean(_currentChat.titleIsCustom)
    });
    persistState();
  }
};

export const syncCurrentChatToHistoryIfExists = () => {
  const idx = _chatHistory.findIndex(c => c.id === _currentChat.id);
  if (idx >= 0) {
    const derivedTitle = getTitleFromMessages(_currentChat.messages);
    const title = _currentChat.titleIsCustom ? _currentChat.title : derivedTitle;
    _chatHistory[idx] = {
      ..._currentChat, title,
      titleIsCustom: Boolean(_currentChat.titleIsCustom)
    };
    persistState();
  }
};

export const setCurrentChat = (chat) => {
  _currentChat = normalizeChatEntry(chat);
  persistState();
  return _currentChat;
};

export const deleteHistory = (id) => {
  cloudDeleteChat(id);
  _chatHistory = _chatHistory.filter(c => c.id !== id);
  persistState();
  showToast("Chat history deleted.", "success");
};
