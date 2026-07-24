import { $id, showToast } from "./utils.js";
import { getCurrentChat, persistState, getTitleFromMessages } from "./state.js";
import { appendMessageToUI, setTyping, buildMessageContent, startStreamEvent, addMessageToCurrent, renderMessages } from "./chat.js";

let attachButton, fileInput, imageInput, imagePreviewBar, previewImagesList;
let audioAttachButton, audioInput, addButton, addMenu;
let imageModeBanner, exitImageModeBtn;
let imageViewer, imageViewerImg, imageViewerTitle, imageViewerCopy;
let imageViewerDownload, imageViewerEdit, imageViewerClose;
let imageViewerEditPanel, imageViewerEditInput, imageViewerEditSubmit;

let currentImages = [];
let currentAudios = [];
let currentVideos = [];
let currentPdfs = [];
let isImageMode = false;
let isGeneratingImage = false;

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_AUDIOS = 3;
const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const MAX_VIDEOS = 3;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
const MAX_PDFS = 3;
const MAX_PDF_SIZE = 25 * 1024 * 1024;
const IMG_CMD = "/imagine ";

export const getPendingImages = () => currentImages;
export const getPendingAudios = () => currentAudios;
export const getPendingVideos = () => currentVideos;
export const getPendingPdfs = () => currentPdfs;
export const clearPendingMedia = () => {
  currentImages = [];
  currentAudios = [];
  currentVideos = [];
  currentPdfs = [];
};
export const hasPendingMedia = () =>
  currentImages.length > 0 || currentAudios.length > 0 ||
  currentVideos.length > 0 || currentPdfs.length > 0;
export const isImageGenMode = () => isImageMode;

const renderPreviews = () => {
  if (!previewImagesList || !imagePreviewBar) return;
  previewImagesList.innerHTML = "";
  const hasAny = currentImages.length || currentAudios.length || currentVideos.length || currentPdfs.length;
  if (!hasAny) { imagePreviewBar.classList.add("hidden"); return; }
  imagePreviewBar.classList.remove("hidden");

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
    btn.addEventListener("click", () => { currentImages.splice(idx, 1); renderPreviews(); });
    thumb.append(img, btn);
    previewImagesList.appendChild(thumb);
  });

  currentAudios.forEach((_, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "preview-thumb audio";
    thumb.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-thumb-btn";
    btn.textContent = "\u00d7";
    btn.addEventListener("click", () => { currentAudios.splice(idx, 1); renderPreviews(); });
    thumb.appendChild(btn);
    previewImagesList.appendChild(thumb);
  });

  currentVideos.forEach((_, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "preview-thumb audio";
    thumb.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>';
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-thumb-btn";
    btn.textContent = "\u00d7";
    btn.addEventListener("click", () => { currentVideos.splice(idx, 1); renderPreviews(); });
    thumb.appendChild(btn);
    previewImagesList.appendChild(thumb);
  });

  currentPdfs.forEach((_, idx) => {
    const thumb = document.createElement("div");
    thumb.className = "preview-thumb audio";
    thumb.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "remove-thumb-btn";
    btn.textContent = "\u00d7";
    btn.addEventListener("click", () => { currentPdfs.splice(idx, 1); renderPreviews(); });
    thumb.appendChild(btn);
    previewImagesList.appendChild(thumb);
  });
};

const addImagesFromFiles = (files) => {
  const remaining = MAX_IMAGES - currentImages.length;
  if (remaining <= 0) { showToast(`Max ${MAX_IMAGES} images allowed.`, "error"); return; }
  Array.from(files).slice(0, remaining).forEach(file => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > MAX_IMAGE_SIZE) { showToast(`"${file.name}" skipped (max 5MB).`, "error"); return; }
    const reader = new FileReader();
    reader.onload = (e) => { currentImages.push(e.target.result); renderPreviews(); };
    reader.readAsDataURL(file);
  });
};

const addAudiosFromFiles = (files) => {
  const remaining = MAX_AUDIOS - currentAudios.length;
  if (remaining <= 0) { showToast(`Max ${MAX_AUDIOS} audio files allowed.`, "error"); return; }
  Array.from(files).slice(0, remaining).forEach(file => {
    if (!file.type.startsWith("audio/")) return;
    if (file.size > MAX_AUDIO_SIZE) { showToast(`"${file.name}" skipped (max 25MB).`, "error"); return; }
    const reader = new FileReader();
    reader.onload = (e) => { currentAudios.push(e.target.result); renderPreviews(); };
    reader.readAsDataURL(file);
  });
};

const addVideosFromFiles = (files) => {
  const remaining = MAX_VIDEOS - currentVideos.length;
  if (remaining <= 0) { showToast(`Max ${MAX_VIDEOS} video files allowed.`, "error"); return; }
  Array.from(files).slice(0, remaining).forEach(file => {
    if (!file.type.startsWith("video/")) return;
    if (file.size > MAX_VIDEO_SIZE) { showToast(`"${file.name}" skipped (max 50MB).`, "error"); return; }
    const reader = new FileReader();
    reader.onload = (e) => { currentVideos.push(e.target.result); renderPreviews(); };
    reader.readAsDataURL(file);
  });
};

const addPdfsFromFiles = (files) => {
  const remaining = MAX_PDFS - currentPdfs.length;
  if (remaining <= 0) { showToast(`Max ${MAX_PDFS} PDF files allowed.`, "error"); return; }
  Array.from(files).slice(0, remaining).forEach(file => {
    if (file.type !== "application/pdf") return;
    if (file.size > MAX_PDF_SIZE) { showToast(`"${file.name}" skipped (max 25MB).`, "error"); return; }
    const reader = new FileReader();
    reader.onload = (e) => { currentPdfs.push(e.target.result); renderPreviews(); };
    reader.readAsDataURL(file);
  });
};

// --- Image Generation ---
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
            addMessageToCurrent("bot", `Generated: "${prompt}"`, {
              generatedImage: data.dataUrl, generatedPrompt: prompt
            });
          } else if (data.type === "error") {
            addMessageToCurrent("bot", data.message || "Image generation failed.");
          }
        } catch { /* partial line */ }
      }
    }
  } catch (err) {
    addMessageToCurrent("bot", "Image generation failed: " + err.message);
  } finally {
    isGeneratingImage = false;
  }
};

// --- Image Viewer ---
const openImageViewer = (dataUrl, prompt) => {
  if (!imageViewer) return;
  if (imageViewerImg) imageViewerImg.src = dataUrl;
  if (imageViewerTitle) imageViewerTitle.textContent = prompt ? `Generated: "${prompt}"` : "Generated Image";
  imageViewerEditPanel?.classList.add("hidden");
  imageViewer.classList.remove("hidden");
};

const closeImageViewer = () => {
  imageViewer?.classList.add("hidden");
  imageViewerEditPanel?.classList.add("hidden");
};

export const exitImageMode = () => {
  isImageMode = false;
  imageModeBanner?.classList.add("hidden");
  const input = document.getElementById("messageInput");
  if (input) input.placeholder = "Message";
};

// --- Init ---
export const initMedia = () => {
  attachButton = $id("attachButton");
  fileInput = $id("fileInput");
  imageInput = $id("imageInput");
  imagePreviewBar = $id("imagePreviewBar");
  previewImagesList = $id("previewImagesList");
  audioAttachButton = $id("audioAttachButton");
  audioInput = $id("audioInput");
  addButton = $id("addButton");
  addMenu = $id("addMenu");
  imageModeBanner = $id("imageModeBanner");
  exitImageModeBtn = $id("exitImageModeBtn");
  imageViewer = $id("imageViewer");
  imageViewerImg = $id("imageViewerImg");
  imageViewerTitle = $id("imageViewerTitle");
  imageViewerCopy = $id("imageViewerCopy");
  imageViewerDownload = $id("imageViewerDownload");
  imageViewerEdit = $id("imageViewerEdit");
  imageViewerClose = $id("imageViewerClose");
  imageViewerEditPanel = $id("imageViewerEditPanel");
  imageViewerEditInput = $id("imageViewerEditInput");
  imageViewerEditSubmit = $id("imageViewerEditSubmit");

  if (attachButton) attachButton.addEventListener("click", () => fileInput?.click());
  if (fileInput) {
    fileInput.addEventListener("change", (e) => {
      if (e.target.files.length) {
        const files = Array.from(e.target.files);
        const imgs = files.filter(f => f.type.startsWith("image/"));
        const auds = files.filter(f => f.type.startsWith("audio/"));
        const vids = files.filter(f => f.type.startsWith("video/"));
        const pdfs = files.filter(f => f.type === "application/pdf");
        if (imgs.length) addImagesFromFiles(imgs);
        if (auds.length) addAudiosFromFiles(auds);
        if (vids.length) addVideosFromFiles(vids);
        if (pdfs.length) addPdfsFromFiles(pdfs);
      }
      fileInput.value = "";
    });
  }
  if (imageInput) {
    imageInput.addEventListener("change", (e) => {
      if (e.target.files.length) addImagesFromFiles(e.target.files);
      imageInput.value = "";
    });
  }
  if (audioAttachButton) audioAttachButton.addEventListener("click", () => audioInput?.click());
  if (audioInput) {
    audioInput.addEventListener("change", (e) => {
      if (e.target.files.length) addAudiosFromFiles(e.target.files);
      audioInput.value = "";
    });
  }

  if (addButton) {
    addButton.addEventListener("click", (e) => {
      e.stopPropagation();
      addMenu?.classList.toggle("hidden");
    });
  }
  if (addMenu) {
    addMenu.querySelectorAll(".add-menu-item").forEach(item => {
      item.addEventListener("click", (e) => {
        e.stopPropagation();
        const action = item.dataset.action;
        if (action === "file") fileInput?.click();
        else if (action === "audio") audioInput?.click();
        else if (action === "image-gen") {
          isImageMode = true;
          imageModeBanner?.classList.remove("hidden");
          const input = document.getElementById("messageInput");
          if (input) { input.placeholder = "Describe what to create"; input.focus(); }
        }
        addMenu.classList.add("hidden");
      });
    });
  }
  document.addEventListener("click", () => addMenu?.classList.add("hidden"));

  if (exitImageModeBtn) exitImageModeBtn.addEventListener("click", exitImageMode);
  if (imageViewerClose) imageViewerClose.addEventListener("click", closeImageViewer);
  if (imageViewer) imageViewer.addEventListener("click", (e) => { if (e.target === imageViewer) closeImageViewer(); });
  if (imageViewerCopy) {
    imageViewerCopy.addEventListener("click", async () => {
      try {
        const r = await fetch(imageViewerImg?.src || "");
        const blob = await r.blob();
        await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
        imageViewerCopy.textContent = "Copied!";
        setTimeout(() => { imageViewerCopy.textContent = "Copy"; }, 2000);
      } catch {
        showToast("Failed to copy image", "error");
      }
    });
  }
  if (imageViewerDownload) {
    imageViewerDownload.addEventListener("click", () => {
      const a = document.createElement("a");
      a.href = imageViewerImg?.src || "";
      a.download = "generated-image.svg";
      a.click();
    });
  }
  if (imageViewerEdit) {
    imageViewerEdit.addEventListener("click", () => {
      if (imageViewerEditInput) imageViewerEditInput.value = imageViewerImg?.alt || "";
      imageViewerEditPanel?.classList.remove("hidden");
      imageViewerEditInput?.focus();
    });
  }
  if (imageViewerEditSubmit) {
    imageViewerEditSubmit.addEventListener("click", async () => {
      const prompt = imageViewerEditInput?.value?.trim();
      if (!prompt) return;
      closeImageViewer();
      setTyping(true);
      await generateImageAndAppend(prompt);
      setTyping(false);
    });
  }
  if (imageViewerEditInput) {
    imageViewerEditInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); imageViewerEditSubmit?.click(); }
    });
  }

  // Custom events
  window.addEventListener("qai:openImageViewer", (e) => {
    openImageViewer(e.detail.dataUrl, e.detail.prompt);
  });

  // Paste images
  const messageInput = document.getElementById("messageInput");
  if (messageInput) {
    messageInput.addEventListener("paste", (e) => {
      const items = e.clipboardData.items;
      const images = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) images.push(file);
        }
      }
      if (images.length) { e.preventDefault(); addImagesFromFiles(images); }
    });
  }
};

export { generateImageAndAppend, IMG_CMD };
