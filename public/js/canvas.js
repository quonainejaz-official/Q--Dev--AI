import { $id } from "./utils.js";

let canvasPanel, canvasEditor, canvasPreview;
let canvasCopyBtn, canvasRunBtn, canvasCloseBtn;
let currentCode = "";
let currentLang = "";

const openCanvas = (code, language) => {
  if (!canvasPanel) return;
  currentCode = code;
  currentLang = language;
  if (canvasEditor) canvasEditor.value = code;
  canvasPanel.classList.remove("hidden");
  updatePreview();
};

const closeCanvas = () => {
  canvasPanel?.classList.add("hidden");
};

const updatePreview = () => {
  if (!canvasPreview) return;
  const code = canvasEditor?.value || "";
  if (currentLang === "html") {
    canvasPreview.srcdoc = code;
  } else if (currentLang === "css") {
    canvasPreview.srcdoc = `<html><head><style>${code}</style></head><body><div class="preview-target">Preview content</div></body></html>`;
  } else if (currentLang === "javascript" || currentLang === "js") {
    canvasPreview.srcdoc = `<html><body><pre id="output"></pre><script>try{const out=document.getElementById('output');const _log=console.log;console.log=(...a)=>{out.textContent+=a.map(x=>typeof x==='object'?JSON.stringify(x,null,2):x).join(' ')+'\\n';_log(...a)};${code}}catch(e){document.getElementById('output').textContent='Error: '+e.message}</script></body></html>`;
  }
};

const copyCode = async () => {
  const code = canvasEditor?.value || "";
  try {
    await navigator.clipboard.writeText(code);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = code;
    ta.style.cssText = "position:fixed;opacity:0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
};

export const initCanvas = () => {
  canvasPanel = $id("canvasPanel");
  canvasEditor = $id("canvasEditor");
  canvasPreview = $id("canvasPreview");
  canvasCopyBtn = $id("canvasCopyBtn");
  canvasRunBtn = $id("canvasRunBtn");
  canvasCloseBtn = $id("canvasCloseBtn");

  if (canvasCloseBtn) canvasCloseBtn.addEventListener("click", closeCanvas);
  if (canvasCopyBtn) canvasCopyBtn.addEventListener("click", copyCode);
  if (canvasRunBtn) canvasRunBtn.addEventListener("click", updatePreview);
  if (canvasEditor) {
    canvasEditor.addEventListener("input", updatePreview);
    canvasEditor.addEventListener("keydown", (e) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const start = canvasEditor.selectionStart;
        const end = canvasEditor.selectionEnd;
        canvasEditor.value = canvasEditor.value.substring(0, start) + "  " + canvasEditor.value.substring(end);
        canvasEditor.selectionStart = canvasEditor.selectionEnd = start + 2;
      }
    });
  }

  window.addEventListener("qai:openCanvas", (e) => {
    openCanvas(e.detail.code, e.detail.language);
  });
};
