const messagesContainer = document.getElementById("messages");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const sendButton = document.getElementById("sendButton");
const typingIndicator = document.getElementById("typingIndicator");
const newChatButton = document.getElementById("newChatButton");
const chatHistoryList = document.getElementById("chatHistory");
const welcomeScreen = document.getElementById("welcomeScreen");
const chatArea = document.getElementById("chatArea");
const currentChatTitle = document.getElementById("currentChatTitle");
const editChatTitleBtn = document.getElementById("editChatTitleBtn");
const appContainer = document.querySelector(".app-container");
const sidebarToggle = document.querySelector(".sidebar-toggle");
const sidebarToggleMain = document.querySelector(".sidebar-toggle-main");
const newChatButtonMain = document.getElementById("newChatButtonMain");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const MESSAGE_LIMITS = {
  maxLines: 5000,
  maxChars: 50000,
  maxWords: 50000,
  maxTextareaHeightPx: 200
};

let lastLimitToastAt = 0;
let lastLimitToastKey = "";

const countLines = (text) => {
  if (!text) return 0;
  return text.split(/\r\n|\r|\n/).length;
};

const countWords = (text) => {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  const matches = trimmed.match(/\S+/g);
  return matches ? matches.length : 0;
};

const sliceToMaxWords = (text, maxWords) => {
  if (!text) return text;
  const re = /\S+/g;
  let match;
  let count = 0;
  let endIndex = 0;
  while ((match = re.exec(text)) !== null) {
    count += 1;
    if (count === maxWords) {
      endIndex = re.lastIndex;
      break;
    }
  }
  return endIndex ? text.slice(0, endIndex) : text;
};

const maybeToastLimit = (key, message) => {
  const now = Date.now();
  if (now - lastLimitToastAt < 1200 && lastLimitToastKey === key) {
    return;
  }
  lastLimitToastAt = now;
  lastLimitToastKey = key;
  showToast(message, "error");
};

const enforceMessageLimits = (value) => {
  let next = value;

  if (next.length > MESSAGE_LIMITS.maxChars) {
    next = next.slice(0, MESSAGE_LIMITS.maxChars);
    maybeToastLimit(
      "chars",
      `Message too long. Max ${MESSAGE_LIMITS.maxChars.toLocaleString()} characters.`
    );
  }

  const lines = countLines(next);
  if (lines > MESSAGE_LIMITS.maxLines) {
    next = next
      .split(/\r\n|\r|\n/)
      .slice(0, MESSAGE_LIMITS.maxLines)
      .join("\n");
    maybeToastLimit(
      "lines",
      `Too many lines. Max ${MESSAGE_LIMITS.maxLines.toLocaleString()} lines.`
    );
  }

  const words = countWords(next);
  if (words > MESSAGE_LIMITS.maxWords) {
    next = sliceToMaxWords(next, MESSAGE_LIMITS.maxWords);
    maybeToastLimit(
      "words",
      `Too many words. Max ${MESSAGE_LIMITS.maxWords.toLocaleString()} words.`
    );
  }

  return next;
};

const renderWordmark = (containerId, isLarge = false) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  const logoWrapper = document.createElement("div");
  logoWrapper.className = `wordmark-wrapper ${isLarge ? "large" : ""}`;

  // SVG Icon
  const svgNS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "wordmark-icon");
  
  // Outer circle (The Q)
  const circle = document.createElementNS(svgNS, "circle");
  circle.setAttribute("cx", "12");
  circle.setAttribute("cy", "12");
  circle.setAttribute("r", "9");
  circle.setAttribute("stroke", "currentColor");
  circle.setAttribute("stroke-width", "2.5");
  circle.setAttribute("fill", "none");

  // The Q slash
  const line = document.createElementNS(svgNS, "line");
  line.setAttribute("x1", "18");
  line.setAttribute("y1", "18");
  line.setAttribute("x2", "22");
  line.setAttribute("y2", "22");
  line.setAttribute("stroke", "currentColor");
  line.setAttribute("stroke-width", "2.5");
  line.setAttribute("stroke-linecap", "round");

  // Inner dot (Representing Dev/AI core)
  const dot = document.createElementNS(svgNS, "circle");
  dot.setAttribute("cx", "12");
  dot.setAttribute("cy", "12");
  dot.setAttribute("r", "3");
  dot.setAttribute("fill", "var(--accent-blue)");

  svg.appendChild(circle);
  svg.appendChild(line);
  svg.appendChild(dot);

  // Text Wordmark
  const text = document.createElement("div");
  text.className = "wordmark-text";
  text.innerHTML = '<span class="q-letter">Q</span><span class="dev-part">-Dev</span><span class="ai-part">-AI</span>';

  logoWrapper.appendChild(svg);
  logoWrapper.appendChild(text);
  container.innerHTML = ""; // Clear existing
  container.appendChild(logoWrapper);
};

// Initialize logos
renderWordmark("sidebarLogo");
renderWordmark("welcomeLogo", true);

const SIDEBAR_COLLAPSED_KEY = "qai-sidebar-collapsed";

const toggleSidebar = () => {
  const isCollapsed = appContainer.classList.toggle("sidebar-collapsed");
  localStorage.setItem(SIDEBAR_COLLAPSED_KEY, isCollapsed);
  
  // Handle mobile overlay
  if (window.innerWidth <= 768) {
    if (isCollapsed) {
      sidebarOverlay.classList.remove("active");
    } else {
      sidebarOverlay.classList.add("active");
    }
  }
};

const closeSidebarOnMobile = () => {
  if (window.innerWidth <= 768) {
    appContainer.classList.add("sidebar-collapsed");
    sidebarOverlay.classList.remove("active");
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
  }
};

sidebarToggle.addEventListener("click", toggleSidebar);
sidebarToggleMain.addEventListener("click", toggleSidebar);
sidebarOverlay.addEventListener("click", closeSidebarOnMobile);

const loadSidebarState = () => {
  let isCollapsed = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
  
  // Default to collapsed on mobile if no preference
  if (isCollapsed === null && window.innerWidth <= 768) {
    isCollapsed = "true";
  } else {
    isCollapsed = isCollapsed === "true";
  }

  if (isCollapsed) {
    appContainer.classList.add("sidebar-collapsed");
    sidebarOverlay.classList.remove("active");
  } else if (window.innerWidth <= 768) {
    sidebarOverlay.classList.add("active");
  }
};

loadSidebarState();

const customModal = document.getElementById("customModal");
const modalTitle = document.getElementById("modalTitle");
const modalMessage = document.getElementById("modalMessage");
const modalCancel = document.getElementById("modalCancel");
const modalConfirm = document.getElementById("modalConfirm");
const toastContainer = document.getElementById("toastContainer");

let modalCallback = null;

const showModal = (title, message, callback) => {
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalCallback = callback;
  customModal.classList.remove("hidden");
};

const hideModal = () => {
  customModal.classList.add("hidden");
  modalCallback = null;
};

modalCancel.addEventListener("click", hideModal);
modalConfirm.addEventListener("click", () => {
  if (modalCallback) modalCallback();
  hideModal();
});

const showToast = (message, type = "success") => {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

const STORAGE_KEY = "qai-chat-history";
const CURRENT_KEY = "qai-current-chat";

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createChat = (messages = [], id = generateId(), title = "New Chat") => ({
  id,
  title,
  titleIsCustom: false,
  messages
});

let chatHistory = [];
let currentChat = createChat();

const loadStoredHistory = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    chatHistory = Array.isArray(parsed) ? parsed.map((entry) => normalizeChatEntry(entry)) : [];
  } catch (error) {
    chatHistory = [];
  }
};

const loadStoredCurrent = () => {
  try {
    const stored = localStorage.getItem(CURRENT_KEY);
    const parsed = stored ? JSON.parse(stored) : null;
    return parsed ? normalizeChatEntry(parsed) : null;
  } catch (error) {
    return null;
  }
};

const persistState = () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(chatHistory));
  localStorage.setItem(CURRENT_KEY, JSON.stringify(currentChat));
};

const getTitleFromMessages = (messages) => {
  const firstUser = messages.find((item) => item.role === "user");
  const base = firstUser?.content?.trim() || "New Chat";
  if (base.length <= 32) {
    return base;
  }
  return `${base.slice(0, 32)}...`;
};

const normalizeMessages = (messages) => {
  if (!Array.isArray(messages)) {
    return [];
  }
  return messages.map((item) => ({
    role: item?.role === "bot" ? "bot" : "user",
    content: String(item?.content ?? ""),
    timestamp: typeof item?.timestamp === "number" ? item.timestamp : Date.now()
  }));
};

const normalizeChatEntry = (chat) => {
  const messages = normalizeMessages(chat?.messages);
  const derivedTitle = getTitleFromMessages(messages);
  const rawTitle =
    typeof chat?.title === "string" ? chat.title.trim() : "";
  const title = rawTitle || derivedTitle;
  const titleIsCustom =
    typeof chat?.titleIsCustom === "boolean"
      ? chat.titleIsCustom
      : Boolean(rawTitle && rawTitle !== derivedTitle);

  return {
    id: typeof chat?.id === "string" && chat.id ? chat.id : generateId(),
    title: titleIsCustom ? title : derivedTitle,
    titleIsCustom,
    messages
  };
};

const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch (fallbackErr) {
      console.error("Failed to copy text: ", fallbackErr);
      return false;
    }
  }
};

const appendMessageToUI = (message) => {
  const bubble = document.createElement("div");
  bubble.className = `message ${message.role}`;
  
  // Create message content
  const content = buildMessageContent(message.content);
  bubble.appendChild(content);
  
  // Create actions container
  const actions = document.createElement("div");
  actions.className = "message-actions";
  
  // Copy button
  const copyButton = document.createElement("button");
  copyButton.className = "message-action-btn copy-btn";
  copyButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
  </svg>`;
  copyButton.title = "Copy message";
  
  copyButton.addEventListener("click", async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      copyButton.classList.add("copied");
      copyButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>`;
      copyButton.title = "Copied!";
      
      setTimeout(() => {
        copyButton.classList.remove("copied");
        copyButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>`;
        copyButton.title = "Copy message";
      }, 2000);
    } else {
      showToast("Failed to copy message", "error");
    }
  });

  // Edit button
  const editButton = document.createElement("button");
  editButton.className = "message-action-btn edit-btn";
  editButton.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
  </svg>`;
  editButton.title = "Edit message";
  
  editButton.addEventListener("click", () => {
    messageInput.value = message.content;
    messageInput.focus();
    // Auto-resize textarea
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
  });
  
  actions.appendChild(copyButton);
  actions.appendChild(editButton);
  bubble.appendChild(actions);
  
  messagesContainer.appendChild(bubble);
  
  // Show chat area and hide welcome screen when messages are present
  if (currentChat.messages.length > 0) {
    welcomeScreen.classList.add("hidden");
    chatArea.classList.remove("hidden");
  } else {
    welcomeScreen.classList.remove("hidden");
    chatArea.classList.add("hidden");
  }
};

const renderMessages = (messages) => {
  messagesContainer.innerHTML = "";
  if (messages && messages.length > 0) {
    messages.forEach((message) => appendMessageToUI(message));
    welcomeScreen.classList.add("hidden");
    chatArea.classList.remove("hidden");
  } else {
    welcomeScreen.classList.remove("hidden");
    chatArea.classList.add("hidden");
  }
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

const renderHistoryList = () => {
  chatHistoryList.innerHTML = "";
  chatHistory.forEach((chat) => {
    const item = document.createElement("div");
    item.className = "history-item";
    if (chat.id === currentChat.id) {
      item.classList.add("active");
    }

    const titleContainer = document.createElement("div");
    titleContainer.className = "history-title-container";

    const title = document.createElement("span");
    title.className = "history-title";
    title.textContent = chat.title || "New Chat";

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "history-action-btn edit-history-btn";
    editButton.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>`;
    
    editButton.addEventListener("click", (event) => {
      event.stopPropagation();
      const input = document.createElement("input");
      input.className = "history-title-input";
      input.value = chat.title || "New Chat";
      
      const saveTitle = () => {
        const newTitle = input.value.trim() || "New Chat";
        chat.title = newTitle;
        chat.titleIsCustom = true;
        if (chat.id === currentChat.id) {
          currentChat.title = newTitle;
          currentChat.titleIsCustom = true;
          if (currentChatTitle) currentChatTitle.textContent = newTitle;
        }
        persistState();
        renderHistoryList();
      };

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveTitle();
        if (e.key === "Escape") renderHistoryList();
      });
      
      input.addEventListener("blur", saveTitle);
      
      titleContainer.replaceChild(input, title);
      input.focus();
      input.select();
      editButton.style.display = "none";
    });

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "history-action-btn delete-history-btn";
    deleteButton.textContent = "✕";

    deleteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      showModal(
        "Delete Chat",
        "Delete this chat history? This cannot be undone.",
        () => deleteHistory(chat.id)
      );
    });

    titleContainer.append(title, editButton);
    item.addEventListener("click", () => loadChatFromHistory(chat.id));
    item.append(titleContainer, deleteButton);
    chatHistoryList.appendChild(item);
  });
};

const handleEditChatTitle = () => {
  const currentTitle = currentChat.title || "New Chat";
  const input = document.createElement("input");
  input.className = "chat-title-input";
  input.value = currentTitle;

  const saveTitle = () => {
    const newTitle = input.value.trim() || "New Chat";
    currentChat.title = newTitle;
    currentChat.titleIsCustom = true;
    
    // Update in history too
    const index = chatHistory.findIndex(c => c.id === currentChat.id);
    if (index !== -1) {
      chatHistory[index].title = newTitle;
      chatHistory[index].titleIsCustom = true;
    }
    
    if (currentChatTitle) {
      currentChatTitle.textContent = newTitle;
      currentChatTitle.style.display = "block";
    }
    editChatTitleBtn.style.display = "flex";
    input.remove();
    persistState();
    renderHistoryList();
  };

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveTitle();
    if (e.key === "Escape") {
      if (currentChatTitle) {
        currentChatTitle.style.display = "block";
      }
      editChatTitleBtn.style.display = "flex";
      input.remove();
    }
  });

  input.addEventListener("blur", saveTitle);

  currentChatTitle.style.display = "none";
  editChatTitleBtn.style.display = "none";
  currentChatTitle.parentNode.insertBefore(input, currentChatTitle.nextSibling);
  input.focus();
  input.select();
};

if (editChatTitleBtn) {
  editChatTitleBtn.addEventListener("click", handleEditChatTitle);
}

const deleteHistory = (id) => {
  chatHistory = chatHistory.filter((chat) => chat.id !== id);
  persistState();
  renderHistoryList();
  showToast("Chat history deleted.", "success");
};

const syncCurrentChatToHistoryIfExists = () => {
  const index = chatHistory.findIndex((chat) => chat.id === currentChat.id);
  if (index >= 0) {
    const derivedTitle = getTitleFromMessages(currentChat.messages);
    const title = currentChat.titleIsCustom ? currentChat.title : derivedTitle;
    chatHistory[index] = {
      ...currentChat,
      title,
      titleIsCustom: Boolean(currentChat.titleIsCustom)
    };
    persistState();
    renderHistoryList();
  }
};

const storeCurrentInHistory = () => {
  if (!currentChat.messages.length) {
    return;
  }
  const derivedTitle = getTitleFromMessages(currentChat.messages);
  const title = currentChat.titleIsCustom ? currentChat.title : derivedTitle;
  const entry = {
    ...currentChat,
    title,
    titleIsCustom: Boolean(currentChat.titleIsCustom)
  };
  const index = chatHistory.findIndex((chat) => chat.id === entry.id);
  if (index >= 0) {
    chatHistory[index] = entry;
  } else {
    chatHistory.unshift(entry);
  }
  persistState();
  renderHistoryList();
};

const ensureCurrentInHistory = () => {
  if (!currentChat.messages.length) {
    return;
  }
  const index = chatHistory.findIndex((chat) => chat.id === currentChat.id);
  if (index === -1) {
    const derivedTitle = getTitleFromMessages(currentChat.messages);
    const title = currentChat.titleIsCustom ? currentChat.title : derivedTitle;
    chatHistory.unshift({
      ...currentChat,
      title,
      titleIsCustom: Boolean(currentChat.titleIsCustom)
    });
    persistState();
  }
};

const setCurrentChat = (chat) => {
  currentChat = normalizeChatEntry(chat);
  if (currentChatTitle) {
    currentChatTitle.textContent = currentChat.title;
  }
  persistState();
  renderMessages(currentChat.messages);
  renderHistoryList();
};

const loadChatFromHistory = async (id) => {
  const chat = chatHistory.find((entry) => entry.id === id);
  if (!chat) {
    showToast("Chat not found.", "error");
    return;
  }
  storeCurrentInHistory();
  setCurrentChat(chat);
  closeSidebarOnMobile();
  showToast("Chat loaded.", "success");
};

const addMessageToCurrent = (role, content) => {
  const message = { role, content, timestamp: Date.now() };
  currentChat.messages.push(message);
  if (!currentChat.titleIsCustom) {
    currentChat.title = getTitleFromMessages(currentChat.messages);
    if (currentChatTitle) {
      currentChatTitle.textContent = currentChat.title;
    }
  }
  appendMessageToUI(message);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
  syncCurrentChatToHistoryIfExists();
  persistState();
};

const decodeEntities = (value) => {
  if (!value) return "";
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
};

const escapeHtml = (value) => {
  if (!value) {
    return "";
  }
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

const highlightCode = (value) => {
  const keywords = [
    "await", "break", "case", "catch", "class", "const", "continue", "debugger",
    "default", "delete", "do", "else", "export", "extends", "false", "finally",
    "for", "function", "if", "import", "in", "instanceof", "let", "new", "null",
    "return", "super", "switch", "this", "throw", "true", "try", "typeof", "var",
    "void", "while", "with", "yield", "async", "from", "as", "interface", "type",
    "enum", "public", "private", "protected", "static", "readonly"
  ];
  const keywordPattern = `\\b(?:${keywords.join("|")})\\b`;
  
  const tokenRegex = new RegExp(
    [
      `("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\\\`(?:\\\\.|[^\\\`\\\\])*\\\`)`, // Strings
      "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)", // Comments
      "(\\b\\d+(?:\\.\\d+)?\\b)", // Numbers
      `(${keywordPattern})`, // Keywords
      "(\\b[A-Za-z_$][\\w$]*\\b)(?=\\s*\\()", // Function calls
      "([()[\\]{}])", // Brackets
      "([\\+\\-\\*\\/\\=%&\\|\\^!<>\\?~\\:]+)" // Operators
    ].join("|"),
    "g"
  );

  let html = "";
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(value)) !== null) {
    // Add text before the match
    html += escapeHtml(value.substring(lastIndex, match.index));

    const [full, str, comm, num, keyw, func, brack, oper] = match;
    let type = "";
    if (str) type = "string";
    else if (comm) type = "comment";
    else if (num) type = "number";
    else if (keyw) type = "keyword";
    else if (func) type = "function";
    else if (brack) type = "bracket";
    else if (oper) type = "operator";

    if (type) {
      html += `<span class="token-${type}">${escapeHtml(full)}</span>`;
    } else {
      html += escapeHtml(full);
    }
    lastIndex = tokenRegex.lastIndex;
  }

  html += escapeHtml(value.substring(lastIndex));
  return html;
};

const formatText = (text) => {
  // 1. Inline Code: `text` -> <code>text</code>
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  
  // 2. Bold: **text** -> <strong>text</strong>
  text = text.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  
  // 3. Italic: *text* -> <em>text</em>
  text = text.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  return text;
};

const buildMessageContent = (content) => {
  const wrapper = document.createElement("div");
  wrapper.className = "message-content";
  const decoded = decodeEntities(content);
  const segments = decoded.split(/```/);

  segments.forEach((segment, index) => {
    if (!segment) return;

    if (index % 2 === 1) {
      // Code block
      const container = document.createElement("div");
      container.className = "code-block-container";

      let language = "code";
      let codeText = segment;
      const newlineIndex = segment.indexOf("\n");
      if (newlineIndex !== -1) {
        language = segment.slice(0, newlineIndex).trim() || "code";
        codeText = segment.slice(newlineIndex + 1);
      }

      // Header
      const header = document.createElement("div");
      header.className = "code-block-header";
      
      const langLabel = document.createElement("span");
      langLabel.className = "code-lang";
      langLabel.textContent = language;

      const copyBtn = document.createElement("button");
      copyBtn.className = "code-copy-btn";
      copyBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Copy</span>
      `;

      copyBtn.addEventListener("click", async () => {
        const success = await copyToClipboard(codeText.trim());
        if (success) {
          const originalHTML = copyBtn.innerHTML;
          copyBtn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Copied!</span>
          `;
          copyBtn.classList.add("success");
          setTimeout(() => {
            copyBtn.innerHTML = originalHTML;
            copyBtn.classList.remove("success");
          }, 2000);
        }
      });

      header.appendChild(langLabel);
      header.appendChild(copyBtn);

      // Pre/Code
      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.dataset.language = language;
      const trimmedCode = codeText.replace(/\n$/, "");
      code.innerHTML = highlightCode(trimmedCode);
      
      pre.appendChild(code);
      container.appendChild(header);
      container.appendChild(pre);
      wrapper.appendChild(container);
      return;
    }

    // Process normal text segments with Markdown support
    const textBlock = document.createElement("div");
    textBlock.className = "message-text";
    
    // Split into lines for block-level Markdown
    const lines = segment.split("\n");
    let currentList = null;
    let htmlContent = "";

    lines.forEach(line => {
      const trimmedLine = line.trim();
      
      // 1. Headers (### Header)
      if (trimmedLine.startsWith("### ")) {
        if (currentList) {
          htmlContent += `</${currentList}>`;
          currentList = null;
        }
        htmlContent += `<h3 class="msg-h3">${formatText(trimmedLine.slice(4))}</h3>`;
      } 
      // 2. Numbered Lists (1. Item)
      else if (/^\d+\.\s/.test(trimmedLine)) {
        if (currentList !== "ol") {
          if (currentList) htmlContent += `</${currentList}>`;
          htmlContent += "<ol>";
          currentList = "ol";
        }
        htmlContent += `<li>${formatText(trimmedLine.replace(/^\d+\.\s/, ""))}</li>`;
      }
      // 3. Bullet Lists (- Item or * Item)
      else if (/^[\-\*]\s/.test(trimmedLine)) {
        if (currentList !== "ul") {
          if (currentList) htmlContent += `</${currentList}>`;
          htmlContent += "<ul>";
          currentList = "ul";
        }
        htmlContent += `<li>${formatText(trimmedLine.slice(2))}</li>`;
      }
      // 4. Regular Paragraphs
      else if (trimmedLine) {
        if (currentList) {
          htmlContent += `</${currentList}>`;
          currentList = null;
        }
        htmlContent += `<p>${formatText(trimmedLine)}</p>`;
      }
      // 5. Empty Lines
      else {
        if (currentList) {
          htmlContent += `</${currentList}>`;
          currentList = null;
        }
      }
    });

    if (currentList) htmlContent += `</${currentList}>`;
    
    textBlock.innerHTML = htmlContent || segment;
    wrapper.appendChild(textBlock);
  });

  if (!wrapper.childNodes.length) {
    const textBlock = document.createElement("div");
    textBlock.className = "message-text";
    textBlock.textContent = decoded;
    wrapper.appendChild(textBlock);
  }

  return wrapper;
};

const setTyping = (active) => {
  typingIndicator.classList.toggle("hidden", !active);
  if (active) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
};

const initializeMessages = async () => {
  loadStoredHistory();
  const storedCurrent = loadStoredCurrent();
  const serverMessages = normalizeMessages(window.__INITIAL_MESSAGES__ || []);
  const storedMessages = normalizeMessages(storedCurrent?.messages || []);
  const initialMessages = storedMessages.length ? storedMessages : serverMessages;

  currentChat = normalizeChatEntry({
    id: storedCurrent?.id,
    title: storedCurrent?.title,
    titleIsCustom: storedCurrent?.titleIsCustom,
    messages: initialMessages
  });

  ensureCurrentInHistory();
  renderMessages(initialMessages);
  renderHistoryList();
  persistState();
  if (!initialMessages.length) {
    addMessageToCurrent(
      "bot",
      "Hello! I am Q-Dev-AI, your coding assistant. Ask me anything!"
    );
  }
};

const handleNewChat = () => {
  showModal(
    "New Chat",
    "Start a new chat? Your current chat will be saved to history.",
    async () => {
      storeCurrentInHistory();
      currentChat = createChat();
      renderMessages([]);
      renderHistoryList();
      persistState();
      addMessageToCurrent(
        "bot",
        "Hello! I am Q-Dev-AI, your coding assistant. Ask me anything!"
      );
      closeSidebarOnMobile();
      showToast("New chat started.", "success");
    }
  );
};

newChatButton.addEventListener("click", handleNewChat);
if (newChatButtonMain) {
  newChatButtonMain.addEventListener("click", handleNewChat);
}

const startStreamEvent = (reader, decoder) => {
  let buffer = "";
  let streamingMsg = null;

  return {
    readNext: async () => {
      while (true) {
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const msg = JSON.parse(line);

          if (msg.type === "typing") {
            setTyping(msg.active);
          } else if (msg.type === "start") {
            streamingMsg = { role: "bot", content: "", timestamp: Date.now() };
            currentChat.messages.push(streamingMsg);
            appendMessageToUI(streamingMsg);
          } else if (msg.type === "chunk" && streamingMsg) {
            streamingMsg.content += msg.text;
            const lastBubble = messagesContainer.lastElementChild;
            if (lastBubble) {
              const tb = lastBubble.querySelector(".message-text");
              if (tb) tb.textContent = streamingMsg.content;
              messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
          } else if (msg.type === "done") {
            if (streamingMsg) {
              const lastBubble = messagesContainer.lastElementChild;
              if (lastBubble) {
                const wrapper = lastBubble.querySelector(".message-content");
                if (wrapper) {
                  const rebuilt = buildMessageContent(streamingMsg.content);
                  wrapper.innerHTML = "";
                  while (rebuilt.firstChild) {
                    wrapper.appendChild(rebuilt.firstChild);
                  }
                }
              }
              if (!currentChat.titleIsCustom) {
                currentChat.title = getTitleFromMessages(currentChat.messages);
                if (currentChatTitle) currentChatTitle.textContent = currentChat.title;
              }
              syncCurrentChatToHistoryIfExists();
              persistState();
              streamingMsg = null;
            }
            return "done";
          } else if (msg.type === "error") {
            if (streamingMsg) {
              const idx = currentChat.messages.indexOf(streamingMsg);
              if (idx !== -1) currentChat.messages.splice(idx, 1);
              if (messagesContainer.lastElementChild?.classList.contains("message")) {
                messagesContainer.lastElementChild.remove();
              }
              streamingMsg = null;
            }
            addMessageToCurrent("bot", msg.message || "Something went wrong.");
            return "error";
          }
        }

        const { done, value } = await reader.read();
        if (done) return "done";
        buffer += decoder.decode(value, { stream: true });
      }
    }
  };
};

messageInput.addEventListener("input", () => {
  const prev = messageInput.value;
  const next = enforceMessageLimits(prev);
  if (next !== prev) {
    const cursor = messageInput.selectionStart ?? next.length;
    const delta = prev.length - next.length;
    messageInput.value = next;
    const nextCursor = Math.max(0, cursor - Math.max(0, delta));
    messageInput.setSelectionRange(nextCursor, nextCursor);
  }

  messageInput.style.height = "auto";
  const targetHeight = Math.min(
    messageInput.scrollHeight,
    MESSAGE_LIMITS.maxTextareaHeightPx
  );
  messageInput.style.height = `${targetHeight}px`;
  messageInput.style.overflowY =
    messageInput.scrollHeight > MESSAGE_LIMITS.maxTextareaHeightPx
      ? "auto"
      : "hidden";
  sendButton.disabled = !messageInput.value.trim();
});

messageInput.addEventListener("keydown", (event) => {
  if (event.isComposing || event.keyCode === 229) {
    return;
  }
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const enforced = enforceMessageLimits(messageInput.value);
  if (enforced !== messageInput.value) {
    messageInput.value = enforced;
  }
  const message = enforced.trim();
  if (!message) {
    return;
  }
  addMessageToCurrent("user", message);
  messageInput.value = "";
  messageInput.style.height = "auto";
  sendButton.disabled = true;

  try {
    const response = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history: currentChat.messages }),
      credentials: "include"
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      addMessageToCurrent("bot", data.error || "Something went wrong.");
      sendButton.disabled = false;
      messageInput.focus();
      return;
    }

    setTyping(true);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const stream = startStreamEvent(reader, decoder);
    await stream.readNext();
  } catch (error) {
    setTyping(false);
    addMessageToCurrent("bot", "Network error. Please try again.");
  } finally {
    sendButton.disabled = false;
    messageInput.focus();
  }
});

initializeMessages();
