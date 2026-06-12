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
const attachButton = document.getElementById("attachButton");
const imageInput = document.getElementById("imageInput");
const imagePreviewBar = document.getElementById("imagePreviewBar");
const previewImagesList = document.getElementById("previewImagesList");
const audioAttachButton = document.getElementById("audioAttachButton");
const audioInput = document.getElementById("audioInput");
const fileInput = document.getElementById("fileInput");
const exportPdfBtn = document.getElementById("exportPdfBtn");
const addButton = document.getElementById("addButton");
const addMenu = document.getElementById("addMenu");
const imageModeBanner = document.getElementById("imageModeBanner");
const exitImageModeBtn = document.getElementById("exitImageModeBtn");
const micButton = document.getElementById("micButton");
const imageViewer = document.getElementById("imageViewer");
const imageViewerImg = document.getElementById("imageViewerImg");
const imageViewerTitle = document.getElementById("imageViewerTitle");
const imageViewerCopy = document.getElementById("imageViewerCopy");
const imageViewerDownload = document.getElementById("imageViewerDownload");
const imageViewerEdit = document.getElementById("imageViewerEdit");
const imageViewerClose = document.getElementById("imageViewerClose");
const imageViewerEditPanel = document.getElementById("imageViewerEditPanel");
const imageViewerEditInput = document.getElementById("imageViewerEditInput");
const imageViewerEditSubmit = document.getElementById("imageViewerEditSubmit");

let lastGeneratedImageDataUrl = "";
let lastGeneratedPrompt = "";

// Image Viewer
const openImageViewer = (dataUrl, prompt) => {
  imageViewerImg.src = dataUrl;
  imageViewerTitle.textContent = prompt ? `Generated: "${prompt}"` : "Generated Image";
  lastGeneratedImageDataUrl = dataUrl;
  lastGeneratedPrompt = prompt || "";
  imageViewerEditPanel.classList.add("hidden");
  imageViewer.classList.remove("hidden");
};

const closeImageViewer = () => {
  imageViewer.classList.add("hidden");
  imageViewerEditPanel.classList.add("hidden");
};

if (imageViewerClose) imageViewerClose.addEventListener("click", closeImageViewer);

if (imageViewer) {
  imageViewer.addEventListener("click", (e) => {
    if (e.target === imageViewer) closeImageViewer();
  });
}

if (imageViewerCopy) {
  imageViewerCopy.addEventListener("click", async () => {
    try {
      const response = await fetch(lastGeneratedImageDataUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);
      imageViewerCopy.textContent = "Copied!";
      setTimeout(() => { imageViewerCopy.textContent = "Copy"; }, 2000);
    } catch (e) {
      // fallback: copy the URL
      try {
        await navigator.clipboard.writeText(lastGeneratedImageDataUrl);
        imageViewerCopy.textContent = "Copied!";
        setTimeout(() => { imageViewerCopy.textContent = "Copy"; }, 2000);
      } catch (e2) {
        showToast("Failed to copy image", "error");
      }
    }
  });
}

if (imageViewerDownload) {
  imageViewerDownload.addEventListener("click", () => {
    const link = document.createElement("a");
    link.href = lastGeneratedImageDataUrl;
    link.download = "generated-image.svg";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });
}

if (imageViewerEdit) {
  imageViewerEdit.addEventListener("click", () => {
    imageViewerEditInput.value = lastGeneratedPrompt;
    imageViewerEditPanel.classList.remove("hidden");
    imageViewerEditInput.focus();
  });
}

if (imageViewerEditSubmit) {
  imageViewerEditSubmit.addEventListener("click", async () => {
    const newPrompt = imageViewerEditInput.value.trim();
    if (!newPrompt) return;
    closeImageViewer();
    setTyping(true);
    await generateImageAndAppend(newPrompt);
    setTyping(false);
  });
}

if (imageViewerEditInput) {
  imageViewerEditInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (imageViewerEditSubmit) imageViewerEditSubmit.click();
    }
  });
}

let isImageMode = false;


const enterImageMode = () => {
  isImageMode = true;
  imageModeBanner.classList.remove("hidden");
  messageInput.placeholder = "Describe what to create";
  messageInput.focus();
  addMenu.classList.add("hidden");
};

const exitImageMode = () => {
  isImageMode = false;
  imageModeBanner.classList.add("hidden");
  messageInput.placeholder = "Message";
};

if (exitImageModeBtn) {
  exitImageModeBtn.addEventListener("click", exitImageMode);
}

if (addButton) {
  addButton.addEventListener("click", (e) => {
    e.stopPropagation();
    addMenu.classList.toggle("hidden");
  });
}

if (addMenu) {
  addMenu.querySelectorAll(".add-menu-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      if (action === "file") fileInput.click();
      else if (action === "audio") audioInput.click();
      else if (action === "image-gen") enterImageMode();
      addMenu.classList.add("hidden");
    });
  });
}

document.addEventListener("click", () => {
  if (addMenu) addMenu.classList.add("hidden");
});

// ----- Speech Recognition -----

let isRecording = false;
let recognition = null;
let recordingStoppedIntentionally = false;

const recordingIndicator = document.getElementById("recordingIndicator");

const createRecognition = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const rec = new SR();
  rec.lang = "en-US";
  rec.interimResults = true;
  rec.continuous = false;
  return rec;
};

const startRecording = () => {
  recognition = createRecognition();
  if (!recognition) {
    if (micButton) micButton.style.display = "none";
    return;
  }

  recordingStoppedIntentionally = false;

  recognition.onresult = (event) => {
    let transcript = "";
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
    }
    messageInput.value = transcript;
    messageInput.style.height = "auto";
    messageInput.style.height = messageInput.scrollHeight + "px";
    sendButton.disabled = false;
  };

  recognition.onerror = (event) => {
    if (event.error === "no-speech") {
      // quiet
    } else if (event.error !== "aborted") {
      showToast("Voice input error: " + event.error, "error");
    }
    stopRecordingUI();
  };

  recognition.onend = () => {
    if (isRecording && !recordingStoppedIntentionally) {
      const text = messageInput.value.trim();
      if (text) {
        submitMessage();
      }
    }
    stopRecordingUI();
  };

  try {
    recognition.start();
    isRecording = true;
    micButton.classList.add("recording");
    micButton.title = "Tap to stop & send";
    if (recordingIndicator) recordingIndicator.classList.remove("hidden");
  } catch (e) {
    // already started — shouldn't happen with a fresh instance
  }
};

const stopRecordingUI = () => {
  isRecording = false;
  recordingStoppedIntentionally = true;
  if (micButton) {
    micButton.classList.remove("recording");
    micButton.title = "Voice input";
  }
  if (recordingIndicator) recordingIndicator.classList.add("hidden");
};

const stopRecording = () => {
  recordingStoppedIntentionally = true;
  if (recognition) {
    try { recognition.stop(); } catch (e) { }
  }
  stopRecordingUI();
  const text = messageInput.value.trim();
  if (text) {
    submitMessage();
  }
};

if (micButton) {
  micButton.addEventListener("click", () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  });
}


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

let currentImages = [];
const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
let currentVideos = [];
const MAX_VIDEOS = 3;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
let currentPdfs = [];
const MAX_PDFS = 3;
const MAX_PDF_SIZE = 25 * 1024 * 1024;

const getFileType = (file) => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  if (file.type === "application/pdf") return "pdf";
  return null;
};

const renderImagePreviews = () => {
  previewImagesList.innerHTML = "";
  const hasAny = currentImages.length > 0 || currentAudios.length > 0 || currentVideos.length > 0 || currentPdfs.length > 0;
  if (!hasAny) {
    imagePreviewBar.classList.add("hidden");
    return;
  }
  imagePreviewBar.classList.remove("hidden");

  // Images
  currentImages.forEach((dataUrl, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "preview-thumb";
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = `Image ${idx + 1}`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-thumb-btn";
    btn.textContent = "\u00d7";
    btn.title = "Remove";
    btn.addEventListener("click", () => {
      currentImages.splice(idx, 1);
      renderImagePreviews();
    });
    thumb.append(img, btn);
    previewImagesList.appendChild(thumb);
  });

  // Audio
  currentAudios.forEach((dataUrl, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "preview-thumb audio";
    thumb.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-thumb-btn";
    btn.textContent = "\u00d7";
    btn.title = "Remove";
    btn.addEventListener("click", () => {
      currentAudios.splice(idx, 1);
      renderImagePreviews();
    });
    thumb.appendChild(btn);
    previewImagesList.appendChild(thumb);
  });

  // Video
  currentVideos.forEach((dataUrl, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "preview-thumb audio";
    thumb.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-thumb-btn";
    btn.textContent = "\u00d7";
    btn.title = "Remove";
    btn.addEventListener("click", () => {
      currentVideos.splice(idx, 1);
      renderImagePreviews();
    });
    thumb.appendChild(btn);
    previewImagesList.appendChild(thumb);
  });

  // PDF
  currentPdfs.forEach((dataUrl, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "preview-thumb audio";
    thumb.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-thumb-btn";
    btn.textContent = "\u00d7";
    btn.title = "Remove";
    btn.addEventListener("click", () => {
      currentPdfs.splice(idx, 1);
      renderImagePreviews();
    });
    thumb.appendChild(btn);
    previewImagesList.appendChild(thumb);
  });
};

const addImagesFromFiles = (files) => {
  const remaining = MAX_IMAGES - currentImages.length;
  if (remaining <= 0) {
    showToast(`Max ${MAX_IMAGES} images allowed.`, "error");
    return;
  }
  const toProcess = Array.from(files).slice(0, remaining);
  toProcess.forEach((file) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_SIZE) {
      showToast(`"${file.name}" skipped (max 5MB).`, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      currentImages.push(e.target.result);
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
};

attachButton.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", (e) => {
  if (e.target.files.length) {
    const files = Array.from(e.target.files);
    const imgFiles = files.filter((f) => f.type.startsWith("image/"));
    const audioFiles = files.filter((f) => f.type.startsWith("audio/"));
    const videoFiles = files.filter((f) => f.type.startsWith("video/"));
    const pdfFiles = files.filter((f) => f.type === "application/pdf");
    if (imgFiles.length) addImagesFromFiles(imgFiles);
    if (audioFiles.length) addAudiosFromFiles(audioFiles);
    if (videoFiles.length) addVideosFromFiles(videoFiles);
    if (pdfFiles.length) addPdfsFromFiles(pdfFiles);
  }
  fileInput.value = "";
});

imageInput.addEventListener("change", (e) => {
  if (e.target.files.length) addImagesFromFiles(e.target.files);
  imageInput.value = "";
});

let currentAudios = [];
const MAX_AUDIOS = 3;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;



const addAudiosFromFiles = (files) => {
  const remaining = MAX_AUDIOS - currentAudios.length;
  if (remaining <= 0) {
    showToast(`Max ${MAX_AUDIOS} audio files allowed.`, "error");
    return;
  }
  const toProcess = Array.from(files).slice(0, remaining);
  toProcess.forEach((file) => {
    if (!file.type.startsWith("audio/")) return;
    if (file.size > MAX_AUDIO_SIZE) {
      showToast(`"${file.name}" skipped (max 25MB).`, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      currentAudios.push(e.target.result);
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
};

audioAttachButton.addEventListener("click", () => {
  audioInput.click();
});

audioInput.addEventListener("change", (e) => {
  if (e.target.files.length) addAudiosFromFiles(e.target.files);
  audioInput.value = "";
});

const addVideosFromFiles = (files) => {
  const remaining = MAX_VIDEOS - currentVideos.length;
  if (remaining <= 0) {
    showToast(`Max ${MAX_VIDEOS} video files allowed.`, "error");
    return;
  }
  const toProcess = Array.from(files).slice(0, remaining);
  toProcess.forEach((file) => {
    if (!file.type.startsWith("video/")) return;
    if (file.size > MAX_VIDEO_SIZE) {
      showToast(`"${file.name}" skipped (max 50MB).`, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      currentVideos.push(e.target.result);
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
};

const addPdfsFromFiles = (files) => {
  const remaining = MAX_PDFS - currentPdfs.length;
  if (remaining <= 0) {
    showToast(`Max ${MAX_PDFS} PDF files allowed.`, "error");
    return;
  }
  const toProcess = Array.from(files).slice(0, remaining);
  toProcess.forEach((file) => {
    if (file.type !== "application/pdf") return;
    if (file.size > MAX_PDF_SIZE) {
      showToast(`"${file.name}" skipped (max 25MB).`, "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      currentPdfs.push(e.target.result);
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
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

const stripMedia = (messages) =>
  messages.map(({ images, audios, videos, pdfs, ...rest }) => rest);

const persistState = () => {
  const historyToSave = chatHistory.map((chat) => ({
    ...chat,
    messages: chat.messages
  }));
  const currentToSave = {
    ...currentChat,
    messages: currentChat.messages
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(historyToSave));
  localStorage.setItem(CURRENT_KEY, JSON.stringify(currentToSave));
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
  return messages.map((item) => {
    const msg = {
      role: item?.role === "bot" ? "bot" : "user",
      content: String(item?.content ?? ""),
      timestamp: typeof item?.timestamp === "number" ? item.timestamp : Date.now()
    };
    // Preserve media fields for persistence
    ["images","audios","videos","pdfs","generatedImage","generatedPrompt"].forEach(f => {
      if (item[f]) msg[f] = item[f];
    });
    return msg;
  });
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

  if (message.role === "user") {
    if (message.images && message.images.length) {
      const imagesWrap = document.createElement("div");
      imagesWrap.className = "message-images";
      message.images.forEach((src) => {
        const img = document.createElement("img");
        img.className = "message-image";
        img.src = src;
        img.alt = "Attached image";
        imagesWrap.appendChild(img);
      });
      bubble.appendChild(imagesWrap);
    }
    if (message.audios && message.audios.length) {
      const audiosWrap = document.createElement("div");
      audiosWrap.className = "message-audios";
      message.audios.forEach(() => {
        const tag = document.createElement("div");
        tag.className = "message-audio-tag";
        tag.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg><span>Audio file</span>`;
        audiosWrap.appendChild(tag);
      });
      bubble.appendChild(audiosWrap);
    }
    if (message.videos && message.videos.length) {
      const wrap = document.createElement("div");
      wrap.className = "message-audios";
      message.videos.forEach(() => {
        const tag = document.createElement("div");
        tag.className = "message-audio-tag";
        tag.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg><span>Video file</span>`;
        wrap.appendChild(tag);
      });
      bubble.appendChild(wrap);
    }
    if (message.pdfs && message.pdfs.length) {
      const wrap = document.createElement("div");
      wrap.className = "message-audios";
      message.pdfs.forEach(() => {
        const tag = document.createElement("div");
        tag.className = "message-audio-tag";
        tag.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg><span>PDF file</span>`;
        wrap.appendChild(tag);
      });
      bubble.appendChild(wrap);
    }
  }

  // Create message content
  const content = buildMessageContent(message.content);
  bubble.appendChild(content);

  // Generated image
  if (message.generatedImage) {
    const dataUrl = message.generatedImage;
    const prompt = message.generatedPrompt || "";

    const imgContainer = document.createElement("div");
    imgContainer.style.textAlign = "center";
    imgContainer.style.padding = "12px 0";
    const img = document.createElement("img");
    img.src = dataUrl;
    img.alt = prompt;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "400px";
    img.style.borderRadius = "12px";
    img.style.border = "1px solid var(--border-color)";
    img.style.cursor = "pointer";
    img.addEventListener("click", () => openImageViewer(dataUrl, prompt));
    imgContainer.appendChild(img);

    const actionsRow = document.createElement("div");
    actionsRow.style.display = "flex";
    actionsRow.style.gap = "8px";
    actionsRow.style.justifyContent = "center";
    actionsRow.style.marginTop = "8px";

    const makeActionBtn = (label, onClick) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.style.cssText = "background:transparent;border:1px solid var(--border-color);border-radius:8px;padding:6px 14px;color:var(--text-primary);cursor:pointer;font-size:13px;font-family:inherit;transition:all 0.2s ease";
      btn.addEventListener("mouseenter", () => { btn.style.background = "var(--hover-bg)"; });
      btn.addEventListener("mouseleave", () => { btn.style.background = "transparent"; });
      btn.addEventListener("click", onClick);
      return btn;
    };

    actionsRow.appendChild(makeActionBtn("Copy", async () => {
      try {
        const r = await fetch(dataUrl);
        const blob = await r.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        showToast("Image copied", "success");
      } catch (e) {
        showToast("Failed to copy", "error");
      }
    }));
    actionsRow.appendChild(makeActionBtn("Download", () => {
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = "generated-image.svg";
      link.click();
    }));
    actionsRow.appendChild(makeActionBtn("Edit", () => {
      openImageViewer(dataUrl, prompt);
      imageViewerEditInput.value = prompt || "";
      imageViewerEditPanel.classList.remove("hidden");
      imageViewerEditInput.focus();
    }));

    imgContainer.appendChild(actionsRow);
    content.appendChild(imgContainer);
  }

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

// ----- Image Generation (/imagine command) -----
let isGeneratingImage = false;

const IMG_CMD = "/imagine ";

const generateImageAndAppend = async (prompt) => {
  if (isGeneratingImage) return;
  isGeneratingImage = true;

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
            appendGeneratedImage(data.dataUrl, prompt);
          } else if (data.type === "error") {
            addMessageToCurrent("bot", data.message || "Image generation failed.");
          }
        } catch (e) { /* partial line */ }
      }
    }
  } catch (err) {
    addMessageToCurrent("bot", "Image generation failed: " + err.message);
  } finally {
    isGeneratingImage = false;
  }
};

const appendGeneratedImage = (dataUrl, prompt) => {
  const displayText = 'Generated: "' + prompt + '"';
  addMessageToCurrent("bot", displayText, { generatedImage: dataUrl, generatedPrompt: prompt });
};

// ----- PDF Export -----
const exportChatAsPdf = () => {
  window.print();
};

// ----- Export PDF Event Listener -----
if (exportPdfBtn) {
  exportPdfBtn.addEventListener("click", exportChatAsPdf);
}

const addMessageToCurrent = (role, content, media) => {
  const message = { role, content, timestamp: Date.now() };
  if (media) {
    if (media.images && media.images.length) message.images = media.images;
    if (media.audios && media.audios.length) message.audios = media.audios;
    if (media.videos && media.videos.length) message.videos = media.videos;
    if (media.pdfs && media.pdfs.length) message.pdfs = media.pdfs;
    if (media.generatedImage) message.generatedImage = media.generatedImage;
    if (media.generatedPrompt) message.generatedPrompt = media.generatedPrompt;
  }
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

const decodeHtml = (value) => {
  if (!value) return "";
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
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

  // 4. Strikethrough: ~~text~~ -> <s>text</s>
  text = text.replace(/~~([^~]+)~~/g, '<s>$1</s>');

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

    let inTable = false;

    const closeList = () => {
      if (currentList) {
        htmlContent += `</${currentList}>`;
        currentList = null;
      }
    };

    const flushTable = () => {
      if (inTable) {
        htmlContent += "</tbody></table>";
        inTable = false;
      }
    };

    lines.forEach(line => {
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
        htmlContent += `<h3 class="msg-h3">${formatText(trimmedLine.slice(4))}</h3>`;
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
        htmlContent += `<li>${formatText(trimmedLine.replace(/^\d+\.\s/, ""))}</li>`;
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
        htmlContent += `<li>${formatText(trimmedLine.slice(2))}</li>`;
        return;
      }

      // Regular paragraph
      closeList();
      htmlContent += `<p>${formatText(trimmedLine)}</p>`;
    });

    flushTable();
    closeList();

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
            streamingMsg.content += decodeHtml(msg.text);
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
  if (event.key === "Enter") {
    event.preventDefault();
    if (!event.shiftKey) {
      submitMessage();
    } else {
      const start = messageInput.selectionStart;
      const end = messageInput.selectionEnd;
      const val = messageInput.value;
      messageInput.value = val.substring(0, start) + "\n" + val.substring(end);
      messageInput.selectionStart = messageInput.selectionEnd = start + 1;
      messageInput.style.height = "auto";
      messageInput.style.height = messageInput.scrollHeight + "px";
    }
  }
});

messageInput.addEventListener("paste", (event) => {
  const items = event.clipboardData.items;
  const images = [];

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      if (file) images.push(file);
    }
  }

  if (images.length) {
    event.preventDefault();
    addImagesFromFiles(images);
  }
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  submitMessage();
});

const submitMessage = async () => {
  const enforced = enforceMessageLimits(messageInput.value);
  if (enforced !== messageInput.value) {
    messageInput.value = enforced;
  }
  const message = enforced.trim();
  const hasImages = currentImages.length > 0;
  const hasAudios = currentAudios.length > 0;
  const hasVideos = currentVideos.length > 0;
  const hasPdfs = currentPdfs.length > 0;
  const hasMedia = hasImages || hasAudios || hasVideos || hasPdfs;
  if (!message && !hasMedia) return;

  const isImagineCmd = message.startsWith(IMG_CMD) && !hasMedia;
  const shouldGenerateImage = isImagineCmd || (isImageMode && !hasMedia);
  if (shouldGenerateImage) {
    const prompt = isImagineCmd ? message.slice(IMG_CMD.length).trim() : message;
    if (prompt) {
      if (isImageMode) exitImageMode();
      addMessageToCurrent("user", message);
      messageInput.value = "";
      messageInput.style.height = "auto";
      sendButton.disabled = true;
      setTyping(true);
      await generateImageAndAppend(prompt);
      setTyping(false);
      sendButton.disabled = false;
      messageInput.focus();
      return;
    }
  }

  const historyForRequest = currentChat.messages.map(m => {
    const { images, audios, videos, pdfs, ...rest } = m;
    return rest;
  });
  const parts = [];
  if (hasImages) parts.push(`${currentImages.length} image${currentImages.length > 1 ? "s" : ""}`);
  if (hasAudios) parts.push(`${currentAudios.length} audio file${currentAudios.length > 1 ? "s" : ""}`);
  if (hasVideos) parts.push(`${currentVideos.length} video file${currentVideos.length > 1 ? "s" : ""}`);
  if (hasPdfs) parts.push(`${currentPdfs.length} PDF file${currentPdfs.length > 1 ? "s" : ""}`);
  const displayContent = message || `[${parts.join(", ")} attached]`;
  const mediaPayload = {};
  if (hasImages) mediaPayload.images = [...currentImages];
  if (hasAudios) mediaPayload.audios = [...currentAudios];
  if (hasVideos) mediaPayload.videos = [...currentVideos];
  if (hasPdfs) mediaPayload.pdfs = [...currentPdfs];
  addMessageToCurrent("user", displayContent, mediaPayload);
  messageInput.value = "";
  messageInput.style.height = "auto";
  sendButton.disabled = true;

  const body = { message, history: historyForRequest };
  if (hasImages) body.images = mediaPayload.images;
  if (hasAudios) body.audios = mediaPayload.audios;
  if (hasVideos) body.videos = mediaPayload.videos;
  if (hasPdfs) body.pdfs = mediaPayload.pdfs;

  currentImages = [];
  currentAudios = [];
  currentVideos = [];
  currentPdfs = [];
  renderImagePreviews();
  imageInput.value = "";
  audioInput.value = "";
  fileInput.value = "";

  setTyping(true);

  try {
    const response = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      credentials: "include"
    });

    if (!response.ok) {
      setTyping(false);
      if (response.status === 413) {
        addMessageToCurrent("bot", "File too large. Please use smaller files (max 4.5MB total per message on this hosting plan).");
      } else {
        const data = await response.json().catch(() => ({}));
        addMessageToCurrent("bot", data.error || "Something went wrong.");
      }
      sendButton.disabled = false;
      messageInput.focus();
      return;
    }

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
};

initializeMessages();
