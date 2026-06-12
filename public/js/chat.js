(function () {
  "use strict";

  // ----- State -----
  const state = {
    messages: [],
    currentChatId: null,
    chats: {},
    currentAttachments: [],
    isStreaming: false,
    isGeneratingImage: false,
    initialized: false,
    MAX_ATTACHMENTS: 5,
    MAX_FILE_SIZE: 25 * 1024 * 1024,
    MAX_IMAGE_SIZE: 5 * 1024 * 1024,
    allowedImageTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    allowedAudioTypes: ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/webm"],
    allowedVideoTypes: ["video/mp4", "video/webm"],
    allowedPdfTypes: ["application/pdf"]
  };

  // ----- DOM refs -----
  const $ = (id) => document.getElementById(id);

  const chatForm = $("chatForm");
  const messageInput = $("messageInput");
  const sendButton = $("sendButton");
  const messagesEl = $("messages");
  const chatArea = $("chatArea");
  const welcomeScreen = $("welcomeScreen");
  const attachmentPreviewBar = $("attachmentPreviewBar");
  const previewAttachmentsList = $("previewAttachmentsList");
  const fileInput = $("fileInput");
  const attachButton = $("attachButton");
  const typingIndicator = $("typingIndicator");
  const newChatButton = $("newChatButton");
  const newChatButtonMain = $("newChatButtonMain");
  const sidebarOverlay = $("sidebarOverlay");
  const currentChatTitle = $("currentChatTitle");
  const editChatTitleBtn = $("editChatTitleBtn");
  const exportPdfBtn = $("exportPdfBtn");
  const imageGenBtn = $("imageGenBtn");
  const imageGenPanel = $("imageGenPanel");
  const imageGenPrompt = $("imageGenPrompt");
  const imageGenSubmitBtn = $("imageGenSubmitBtn");
  const imageGenCloseBtn = $("imageGenCloseBtn");

  // ----- Utilities -----
  function showElement(el) { el.classList.remove("hidden"); }
  function hideElement(el) { el.classList.add("hidden"); }

  function showToast(msg, type) {
    const container = $("toastContainer");
    const toast = document.createElement("div");
    toast.className = "toast" + (type ? " " + type : "");
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.animation = "toastOut 0.3s ease forwards";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function decodeHtml(str) {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = str;
    return textarea.value;
  }

  function escHtml(str) {
    const div = document.createElement("div");
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
  }

  function getFileType(file) {
    if (state.allowedImageTypes.includes(file.type)) return "image";
    if (state.allowedAudioTypes.includes(file.type)) return "audio";
    if (state.allowedVideoTypes.includes(file.type)) return "video";
    if (state.allowedPdfTypes.includes(file.type)) return "pdf";
    return null;
  }

  function getFileSizeLimit(type) {
    return type === "image" ? state.MAX_IMAGE_SIZE : state.MAX_FILE_SIZE;
  }

  function getIconSvg(type) {
    const svgs = {
      image: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
      audio: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
      video: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>',
      pdf: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="8" y1="13" x2="16" y2="13"/><line x1="8" y1="17" x2="16" y2="17"/></svg>'
    };
    return svgs[type] || "";
  }

  function truncateFilename(name, max) {
    if (name.length <= max) return name;
    const ext = name.lastIndexOf(".");
    if (ext > 0) {
      return name.slice(0, max - (name.length - ext) - 3) + "..." + name.slice(ext);
    }
    return name.slice(0, max - 3) + "...";
  }

  // ----- Read file as DataUrl -----
  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Failed to read file"));
      reader.readAsDataURL(file);
    });
  }

  // ----- Attachment management -----
  function getAttachmentsCount() {
    return state.currentAttachments.length;
  }

  async function addAttachment(file) {
    const type = getFileType(file);
    if (!type) {
      showToast("Unsupported file type: " + file.type, "error");
      return;
    }

    if (getAttachmentsCount() >= state.MAX_ATTACHMENTS) {
      showToast("Maximum " + state.MAX_ATTACHMENTS + " files allowed", "error");
      return;
    }

    const sizeLimit = getFileSizeLimit(type);
    if (file.size > sizeLimit) {
      const mb = sizeLimit / (1024 * 1024);
      showToast("File too large. Max " + mb + "MB for " + type + " files", "error");
      return;
    }

    try {
      const dataUrl = await readFileAsDataUrl(file);
      state.currentAttachments.push({ type, dataUrl, name: file.name });
      renderAttachmentPreview();
      enableDisableSend();
    } catch (err) {
      showToast("Failed to read file", "error");
    }
  }

  function removeAttachment(index) {
    state.currentAttachments.splice(index, 1);
    renderAttachmentPreview();
    enableDisableSend();
  }

  function renderAttachmentPreview() {
    const attachments = state.currentAttachments;
    if (attachments.length === 0) {
      hideElement(attachmentPreviewBar);
      return;
    }
    showElement(attachmentPreviewBar);
    previewAttachmentsList.innerHTML = "";

    attachments.forEach((att, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "preview-thumb";

      if (att.type === "image") {
        const img = document.createElement("img");
        img.src = att.dataUrl;
        img.alt = att.name || "Image";
        wrapper.appendChild(img);
      } else {
        wrapper.classList.add("media-icon");
        wrapper.innerHTML = getIconSvg(att.type);
        const label = document.createElement("div");
        label.className = "media-filename";
        label.textContent = truncateFilename(att.name || att.type, 12);
        wrapper.appendChild(label);
      }

      const removeBtn = document.createElement("button");
      removeBtn.className = "remove-thumb-btn";
      removeBtn.innerHTML = "&times;";
      removeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        removeAttachment(index);
      });
      wrapper.appendChild(removeBtn);
      previewAttachmentsList.appendChild(wrapper);
    });

    const countLabel = document.createElement("span");
    countLabel.className = "attachment-count-label";
    countLabel.textContent = attachments.length + "/" + state.MAX_ATTACHMENTS;
    previewAttachmentsList.appendChild(countLabel);
  }

  function resetAttachments() {
    state.currentAttachments = [];
    renderAttachmentPreview();
    fileInput.value = "";
  }

  function enableDisableSend() {
    const hasText = messageInput.value.trim().length > 0;
    const hasAttachments = getAttachmentsCount() > 0;
    sendButton.disabled = !(hasText || hasAttachments);
  }

  // ----- Rich text formatting for bot messages -----
  function formatText(text) {
    let result = escHtml(text);

    // Inline code (must be before bold/italic)
    result = result.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Strikethrough ~~text~~
    result = result.replace(/~~([^~]+)~~/g, "<s>$1</s>");

    // Bold **text**
    result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");

    // Italic *text*
    result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");

    return result;
  }

  function highlightCode(code) {
    const patterns = [
      { re: /\b(if|else|for|while|do|return|function|const|let|var|class|import|export|from|async|await|try|catch|throw|new|this|typeof|instanceof|switch|case|break|continue|in|of|yield|static|get|set|extends|super|delete|void|with|default)\b/g, cls: "token-keyword" },
      { re: /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)/g, cls: "token-string" },
      { re: /\b(\d+\.?\d*)\b/g, cls: "token-number" },
      { re: /(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, cls: "token-comment" },
      { re: /([\(\)\[\]\{\}])/g, cls: "token-bracket" },
      { re: /([=+\-*/<>&|!?:;.,~^%]+)/g, cls: "token-operator" },
      { re: /\b([a-zA-Z_$][\w$]*)\s*(?=\()/g, cls: "token-function" }
    ];

    let highlighted = escHtml(code);
    patterns.forEach(({ re, cls }) => {
      highlighted = highlighted.replace(re, (match) => {
        return `<span class="${cls}">${match}</span>`;
      });
    });
    return highlighted;
  }

  function buildMessageContent(segment) {
    const wrapper = document.createElement("div");
    wrapper.className = "message-content";

    // Check for code blocks
    const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;
    let hasContent = false;

    while ((match = codeBlockRegex.exec(segment)) !== null) {
      hasContent = true;
      const beforeCode = segment.slice(lastIndex, match.index);
      if (beforeCode.trim()) {
        processTextBlock(wrapper, beforeCode);
      }

      const language = match[1] || "plaintext";
      const codeText = match[2];

      const container = document.createElement("div");
      container.className = "code-block-container";

      const header = document.createElement("div");
      header.className = "code-block-header";

      const langLabel = document.createElement("span");
      langLabel.className = "code-lang";
      langLabel.textContent = language;

      const copyBtn = document.createElement("button");
      copyBtn.className = "code-copy-btn";
      copyBtn.textContent = "Copy";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(codeText).then(() => {
          copyBtn.textContent = "Copied!";
          copyBtn.classList.add("success");
          setTimeout(() => {
            copyBtn.textContent = "Copy";
            copyBtn.classList.remove("success");
          }, 2000);
        });
      });

      header.appendChild(langLabel);
      header.appendChild(copyBtn);

      const pre = document.createElement("pre");
      const code = document.createElement("code");
      code.dataset.language = language;
      const trimmedCode = codeText.replace(/\n$/, "");
      code.innerHTML = highlightCode(trimmedCode);

      pre.appendChild(code);
      container.appendChild(header);
      container.appendChild(pre);
      wrapper.appendChild(container);

      lastIndex = match.index + match[0].length;
    }

    const remaining = segment.slice(lastIndex);
    if (remaining.trim()) {
      hasContent = true;
      processTextBlock(wrapper, remaining);
    }

    if (!hasContent) {
      processTextBlock(wrapper, segment);
    }

    return wrapper;
  }

  function processTextBlock(container, segment) {
    const textBlock = document.createElement("div");
    textBlock.className = "message-text";

    const lines = segment.split("\n");
    let currentList = null;
    let inTable = false;
    let htmlContent = "";

    // Process table rows
    function flushTable() {
      if (inTable) {
        htmlContent += "</tbody></table>";
        inTable = false;
      }
    }

    function closeList() {
      if (currentList) {
        htmlContent += "</" + currentList + ">";
        currentList = null;
      }
    }

    lines.forEach((line) => {
      const trimmedLine = line.trim();

      // Empty line
      if (!trimmedLine) {
        flushTable();
        closeList();
        return;
      }

      // Horizontal rule ---, ***, ___
      if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmedLine)) {
        flushTable();
        closeList();
        htmlContent += "<hr>";
        return;
      }

      // Table row: | col1 | col2 |
      if (/^\|.+\|$/.test(trimmedLine)) {
        closeList();
        const cells = trimmedLine.split("|").slice(1, -1).map((c) => c.trim());
        // Check if it's a separator row: |---|---|
        if (cells.every((c) => /^-+\s*:?$/.test(c))) return;
        if (!inTable) {
          htmlContent += "<table><thead><tr>";
          cells.forEach((c) => { htmlContent += "<th>" + formatText(c) + "</th>"; });
          htmlContent += "</tr></thead><tbody>";
          inTable = true;
        } else {
          htmlContent += "<tr>";
          cells.forEach((c) => { htmlContent += "<td>" + formatText(c) + "</td>"; });
          htmlContent += "</tr>";
        }
        return;
      }

      flushTable();

      // Blockquote: > text
      if (/^>\s/.test(trimmedLine)) {
        closeList();
        const quoteContent = trimmedLine.replace(/^>\s*/, "");
        htmlContent += "<blockquote><p>" + formatText(quoteContent) + "</p></blockquote>";
        return;
      }

      // Header: ### Title
      if (trimmedLine.startsWith("### ")) {
        closeList();
        htmlContent += '<h3 class="msg-h3">' + formatText(trimmedLine.slice(4)) + "</h3>";
        return;
      }

      // Numbered list
      if (/^\d+\.\s/.test(trimmedLine)) {
        flushTable();
        if (currentList !== "ol") {
          closeList();
          htmlContent += "<ol>";
          currentList = "ol";
        }
        htmlContent += "<li>" + formatText(trimmedLine.replace(/^\d+\.\s/, "")) + "</li>";
        return;
      }

      // Bullet list
      if (/^[\-\*]\s/.test(trimmedLine)) {
        flushTable();
        if (currentList !== "ul") {
          closeList();
          htmlContent += "<ul>";
          currentList = "ul";
        }
        htmlContent += "<li>" + formatText(trimmedLine.slice(2)) + "</li>";
        return;
      }

      // Regular paragraph
      closeList();
      htmlContent += "<p>" + formatText(trimmedLine) + "</p>";
    });

    flushTable();
    closeList();

    textBlock.innerHTML = htmlContent || segment;
    container.appendChild(textBlock);
  }

  // ----- Message append -----
  function appendUserMessage(text, attachments) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message user";

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    if (Array.isArray(attachments) && attachments.length > 0) {
      const attDiv = document.createElement("div");
      attDiv.className = "message-attachments";

      attachments.forEach((att) => {
        if (att.type === "image") {
          if (att.dataUrl && att.dataUrl.startsWith("data:image/")) {
            const img = document.createElement("img");
            img.className = "message-attachment-image";
            img.src = att.dataUrl;
            img.alt = att.name || "Image";
            attDiv.appendChild(img);
          } else {
            const tag = document.createElement("div");
            tag.className = "message-attachment-tag";
            tag.innerHTML = getIconSvg("image") + "<span>Image</span>";
            attDiv.appendChild(tag);
          }
        } else {
          const tag = document.createElement("div");
          tag.className = "message-attachment-tag";
          tag.innerHTML = getIconSvg(att.type) + '<span>' + (att.name || att.type) + '</span>';
          attDiv.appendChild(tag);
        }
      });
      contentDiv.appendChild(attDiv);
    }

    if (text.trim()) {
      const textEl = document.createElement("div");
      textEl.className = "message-text";
      textEl.textContent = text;
      contentDiv.appendChild(textEl);
    }

    msgDiv.appendChild(contentDiv);
    messagesEl.appendChild(msgDiv);
    scrollToBottom();
  }

  function appendBotMessage(content) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message bot";

    const contentEl = buildMessageContent(content);

    const actionsDiv = document.createElement("div");
    actionsDiv.className = "message-actions";

    const copyBtn = document.createElement("button");
    copyBtn.className = "message-action-btn";
    copyBtn.title = "Copy";
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(content).then(() => {
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
          copyBtn.classList.remove("copied");
        }, 2000);
      });
    });

    actionsDiv.appendChild(copyBtn);
    contentEl.appendChild(actionsDiv);
    msgDiv.appendChild(contentEl);
    messagesEl.appendChild(msgDiv);
    scrollToBottom();

    // Highlight code blocks
    msgDiv.querySelectorAll("pre code").forEach((block) => {
      hljs && hljs.highlightElement(block);
    });
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // ----- Typing -----
  function setTyping(active) {
    if (active) showElement(typingIndicator);
    else hideElement(typingIndicator);
    scrollToBottom();
  }

  // ----- Streaming message -----
  let currentBotMsg = null;
  let currentBotContentEl = null;
  let currentBotText = "";

  function startStream() {
    state.isStreaming = true;
    currentBotText = "";

    const msgDiv = document.createElement("div");
    msgDiv.className = "message bot";
    currentBotContentEl = buildMessageContent("");
    msgDiv.appendChild(currentBotContentEl);
    messagesEl.appendChild(msgDiv);

    // Actions
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "message-actions";
    const copyBtn = document.createElement("button");
    copyBtn.className = "message-action-btn";
    copyBtn.title = "Copy";
    copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(currentBotText).then(() => {
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
        copyBtn.classList.add("copied");
        setTimeout(() => {
          copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
          copyBtn.classList.remove("copied");
        }, 2000);
      });
    });
    actionsDiv.appendChild(copyBtn);
    currentBotContentEl.appendChild(actionsDiv);

    scrollToBottom();
  }

  function addChunk(text) {
    if (!currentBotContentEl) return;
    currentBotText += text;
    const decoded = decodeHtml(currentBotText);
    const newContent = buildMessageContent(decoded);
    currentBotContentEl.replaceWith(newContent);
    currentBotContentEl = newContent;
    scrollToBottom();
  }

  function endStream() {
    state.isStreaming = false;
    currentBotMsg = null;
    currentBotContentEl = null;
    currentBotText = "";
    saveMessageToHistory();
  }

  // ----- Save to localStorage history -----
  function saveMessageToHistory() {
    if (!state.currentChatId) return;
    const chat = state.chats[state.currentChatId];
    if (!chat) return;

    const msgs = messagesEl.querySelectorAll(".message");
    const newMessages = [];
    msgs.forEach((m) => {
      if (m.classList.contains("user")) {
        const textEl = m.querySelector(".message-text");
        const text = textEl ? textEl.textContent : "";
        const attEls = m.querySelectorAll(".message-attachment-image, .message-attachment-tag");
        const attachments = [];
        attEls.forEach((att) => {
          if (att.tagName === "IMG") attachments.push({ type: "image", name: "Image" });
          else {
            const span = att.querySelector("span");
            attachments.push({ type: "audio", name: span ? span.textContent : "file" });
          }
        });
        newMessages.push({ role: "user", text, attachments });
      } else if (m.classList.contains("bot")) {
        const allText = Array.from(m.querySelectorAll(".message-text")).map((t) => t.textContent).join("\n");
        newMessages.push({ role: "bot", text: allText });
      }
    });
    chat.messages = newMessages;
    chat.timestamp = Date.now();
    persistChats();
  }

  function persistChats() {
    try {
      localStorage.setItem("qdevai_chats", JSON.stringify(state.chats));
      localStorage.setItem("qdevai_active_chat", JSON.stringify(state.currentChatId));
    } catch (e) {
      // storage full
    }
  }

  // ----- Chat history management -----
  function loadChats() {
    try {
      const saved = localStorage.getItem("qdevai_chats");
      state.chats = saved ? JSON.parse(saved) : {};
      const active = localStorage.getItem("qdevai_active_chat");
      state.currentChatId = active ? JSON.parse(active) : null;
    } catch (e) {
      state.chats = {};
      state.currentChatId = null;
    }
  }

  // ----- Image generation -----
  async function generateImage(prompt) {
    if (state.isGeneratingImage) return;
    state.isGeneratingImage = true;
    imageGenSubmitBtn.disabled = true;
    imageGenSubmitBtn.textContent = "Generating...";

    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Generation failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === "image") {
              // Append as bot message with the generated image
              appendGeneratedImageResult(data.dataUrl, data.prompt || prompt);
              hideImageGenPanel();
            } else if (data.type === "error") {
              showToast(data.message || "Generation failed", "error");
            }
          } catch (e) {
            // partial line
          }
        }
      }
    } catch (err) {
      showToast(err.message || "Image generation failed", "error");
    } finally {
      state.isGeneratingImage = false;
      imageGenSubmitBtn.disabled = false;
      imageGenSubmitBtn.textContent = "Generate";
    }
  }

  function appendGeneratedImageResult(dataUrl, prompt) {
    const msgDiv = document.createElement("div");
    msgDiv.className = "message bot";

    const contentDiv = document.createElement("div");
    contentDiv.className = "message-content";

    const textEl = document.createElement("p");
    textEl.className = "message-text";
    textEl.style.padding = "0 0 8px 0";
    textEl.textContent = 'Generated image: "' + prompt + '"';
    contentDiv.appendChild(textEl);

    const imgContainer = document.createElement("div");
    imgContainer.style.textAlign = "center";
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = prompt;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "400px";
    img.style.borderRadius = "12px";
    img.style.border = "1px solid var(--border-color)";
    imgContainer.appendChild(img);
    contentDiv.appendChild(imgContainer);

    msgDiv.appendChild(contentDiv);
    messagesEl.appendChild(msgDiv);
    scrollToBottom();
    saveMessageToHistory();
  }

  function showImageGenPanel() {
    showElement(imageGenPanel);
    imageGenPrompt.value = "";
    imageGenPrompt.focus();
    imageGenSubmitBtn.disabled = false;
    imageGenSubmitBtn.textContent = "Generate";
  }

  function hideImageGenPanel() {
    hideElement(imageGenPanel);
    imageGenPrompt.value = "";
  }

  // ----- PDF Export -----
  function exportChatAsPdf() {
    window.print();
  }

  // ----- Send message -----
  async function sendMessage(text, attachments) {
    if (state.isStreaming) return;

    const hasText = text.trim().length > 0;
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;

    if (!hasText && !hasAttachments) return;

    // Show chat area
    hideElement(welcomeScreen);
    showElement(chatArea);
    if (!state.currentChatId) createNewChat();

    // Append user message
    appendUserMessage(text, attachments);

    // Reset input
    messageInput.value = "";
    resetAttachments();
    enableDisableSend();
    setTyping(true);
    startStream();

    try {
      const response = await fetch("/api/message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          attachments: attachments || [],
          history: buildHistoryPayload()
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "Request failed");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === "typing") {
              setTyping(data.active);
            } else if (data.type === "start") {
              // already started
            } else if (data.type === "chunk") {
              addChunk(data.text);
            } else if (data.type === "done") {
              setTyping(false);
              endStream();
            } else if (data.type === "error") {
              setTyping(false);
              showToast(data.message || "An error occurred", "error");
              endStream();
            }
          } catch (e) {
            // partial JSON line
          }
        }
      }
    } catch (err) {
      setTyping(false);
      showToast("Network error. Please try again.", "error");
      endStream();
    }
  }

  function buildHistoryPayload() {
    if (!state.chats[state.currentChatId]) return [];
    const msgs = state.chats[state.currentChatId].messages || [];
    const payload = [];
    msgs.forEach((m) => {
      if (m.role === "user" || m.role === "bot") {
        payload.push({
          role: m.role === "bot" ? "assistant" : "user",
          content: m.text || ""
        });
      }
    });
    return payload;
  }

  function createNewChat() {
    state.currentChatId = "chat_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
    state.chats[state.currentChatId] = { title: "New Chat", messages: [], timestamp: Date.now() };
    currentChatTitle.textContent = "New Chat";
    persistChats();
    renderHistory();
  }

  // ----- History rendering -----
  function renderHistory() {
    const historyList = document.getElementById("chatHistory");
    if (!historyList) return;
    historyList.innerHTML = "";

    const sorted = Object.entries(state.chats).sort((a, b) => b[1].timestamp - a[1].timestamp);
    sorted.forEach(([id, chat]) => {
      const item = document.createElement("div");
      item.className = "history-item" + (id === state.currentChatId ? " active" : "");

      const titleContainer = document.createElement("div");
      titleContainer.className = "history-title-container";

      const title = document.createElement("span");
      title.className = "history-title";
      title.textContent = chat.title || "New Chat";
      titleContainer.appendChild(title);
      item.appendChild(titleContainer);

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "history-action-btn delete-history-btn";
      deleteBtn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>';
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        delete state.chats[id];
        if (state.currentChatId === id) {
          state.currentChatId = null;
          clearChatUI();
        }
        persistChats();
        renderHistory();
      });
      item.appendChild(deleteBtn);

      item.addEventListener("click", () => switchToChat(id));
      historyList.appendChild(item);
    });
  }

  function switchToChat(id) {
    if (state.isStreaming) return;
    state.currentChatId = id;
    persistChats();
    renderChat();
    renderHistory();
    hideElement(welcomeScreen);
    showElement(chatArea);
  }

  function renderChat() {
    messagesEl.innerHTML = "";
    const chat = state.chats[state.currentChatId];
    if (!chat) return;

    currentChatTitle.textContent = chat.title || "Chat";

    (chat.messages || []).forEach((m) => {
      if (m.role === "user") {
        appendUserMessage(m.text || "", m.attachments || []);
      } else if (m.role === "bot") {
        const content = m.text || "";
        const msgDiv = document.createElement("div");
        msgDiv.className = "message bot";
        const contentEl = buildMessageContent(content);

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "message-actions";
        const copyBtn = document.createElement("button");
        copyBtn.className = "message-action-btn";
        copyBtn.title = "Copy";
        copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
        copyBtn.addEventListener("click", () => {
          navigator.clipboard.writeText(content).then(() => {
            copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>';
            copyBtn.classList.add("copied");
            setTimeout(() => {
              copyBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>';
              copyBtn.classList.remove("copied");
            }, 2000);
          });
        });
        actionsDiv.appendChild(copyBtn);
        contentEl.appendChild(actionsDiv);

        msgDiv.appendChild(contentEl);
        messagesEl.appendChild(msgDiv);
      }
    });

    scrollToBottom();
  }

  function clearChatUI() {
    messagesEl.innerHTML = "";
    showElement(welcomeScreen);
    hideElement(chatArea);
    currentChatTitle.textContent = "New Chat";
    hideImageGenPanel();
    resetAttachments();
  }

  // ----- Event Handlers -----
  // Form submit
  chatForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (state.isStreaming) return;
    const text = messageInput.value;
    const attachments = state.currentAttachments.slice();
    if (!text.trim() && attachments.length === 0) return;
    sendMessage(text, attachments);
  });

  // Input
  messageInput.addEventListener("input", enableDisableSend);

  // File input
  attachButton.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", async () => {
    const files = Array.from(fileInput.files);
    for (const file of files) {
      await addAttachment(file);
    }
    fileInput.value = "";
  });

  // Paste handler (images from clipboard)
  document.addEventListener("paste", async (e) => {
    const items = e.clipboardData && e.clipboardData.items;
    if (!items) return;

    let hasImage = false;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        hasImage = true;
        const file = item.getAsFile();
        if (file) {
          await addAttachment(file);
        }
      }
    }
  });

  // Textarea auto-resize
  messageInput.addEventListener("input", () => {
    messageInput.style.height = "auto";
    messageInput.style.height = Math.min(messageInput.scrollHeight, 200) + "px";
  });

  // Enter to send (Shift+Enter for newline)
  messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event("submit"));
    }
  });

  // New chat
  newChatButton.addEventListener("click", () => {
    if (state.isStreaming) return;
    clearChatUI();
    createNewChat();
  });
  newChatButtonMain.addEventListener("click", () => {
    if (state.isStreaming) return;
    clearChatUI();
    createNewChat();
  });

  // Sidebar toggle
  document.querySelectorAll(".sidebar-toggle, .sidebar-toggle-main").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelector(".app-container").classList.toggle("sidebar-collapsed");
      sidebarOverlay.classList.toggle("active");
    });
  });
  sidebarOverlay.addEventListener("click", () => {
    document.querySelector(".app-container").classList.add("sidebar-collapsed");
    sidebarOverlay.classList.remove("active");
  });

  // Edit title
  editChatTitleBtn.addEventListener("click", () => {
    const current = currentChatTitle.textContent;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "chat-title-input";
    input.value = current;
    currentChatTitle.replaceWith(input);
    input.focus();
    input.select();

    const finish = () => {
      const newTitle = input.value.trim() || current;
      const titleEl = document.createElement("h2");
      titleEl.id = "currentChatTitle";
      titleEl.className = "chat-title";
      titleEl.textContent = newTitle;
      input.replaceWith(titleEl);
      if (state.currentChatId && state.chats[state.currentChatId]) {
        state.chats[state.currentChatId].title = newTitle;
        persistChats();
        renderHistory();
      }
    };

    input.addEventListener("blur", finish);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); input.blur(); }
    });
  });

  // Export PDF
  exportPdfBtn.addEventListener("click", exportChatAsPdf);

  // Image generation
  imageGenBtn.addEventListener("click", () => {
    if (imageGenPanel.classList.contains("hidden")) {
      showImageGenPanel();
    } else {
      hideImageGenPanel();
    }
  });

  imageGenCloseBtn.addEventListener("click", hideImageGenPanel);

  imageGenSubmitBtn.addEventListener("click", () => {
    const prompt = imageGenPrompt.value.trim();
    if (!prompt) return;
    hideElement(welcomeScreen);
    showElement(chatArea);
    generateImage(prompt);
  });

  imageGenPrompt.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      imageGenSubmitBtn.click();
    }
  });

  // Clicking outside image gen panel to close
  document.addEventListener("click", (e) => {
    if (!imageGenPanel.classList.contains("hidden") &&
        !imageGenPanel.contains(e.target) &&
        e.target !== imageGenBtn &&
        !imageGenBtn.contains(e.target)) {
      hideImageGenPanel();
    }
  });

  // ----- Init -----
  function init() {
    if (state.initialized) return;
    state.initialized = true;

    loadChats();
    renderHistory();

    const msgs = window.__INITIAL_MESSAGES__ || [];
    if (msgs.length > 0 || state.currentChatId) {
      if (state.currentChatId) {
        renderChat();
      }
      hideElement(welcomeScreen);
      showElement(chatArea);
    }

    enableDisableSend();
    messageInput.focus();
  }

  // ----- Override stripImages for localStorage compatibility -----
  // Legacy: strip image/audio data URLs from serialized messages
  function stripAttachments(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) {
      return obj.map(stripAttachments);
    }
    const stripped = {};
    for (const key of Object.keys(obj)) {
      if (key === "dataUrl" && typeof obj[key] === "string" && obj[key].startsWith("data:")) {
        stripped[key] = obj[key].startsWith("data:image/") ? obj[key] : "";
      } else if (key === "attachments" && Array.isArray(obj[key])) {
        stripped[key] = obj[key].map((att) => {
          if (att.type === "image" && att.dataUrl && att.dataUrl.startsWith("data:")) {
            return { ...att, dataUrl: att.dataUrl };
          }
          return { ...att, dataUrl: "" };
        });
      } else if (typeof obj[key] === "object") {
        stripped[key] = stripAttachments(obj[key]);
      } else {
        stripped[key] = obj[key];
      }
    }
    return stripped;
  }

  // Patch persistChats to strip large data URLs from localStorage
  const origPersist = persistChats;
  persistChats = function () {
    try {
      const stripped = stripAttachments(state.chats);
      localStorage.setItem("qdevai_chats", JSON.stringify(stripped));
      localStorage.setItem("qdevai_active_chat", JSON.stringify(state.currentChatId));
    } catch (e) {
      // storage full or serialization error
    }
  };

  // DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
