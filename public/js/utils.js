export const $id = (id) => document.getElementById(id);
export const $el = (sel) => document.querySelector(sel);
export const $$el = (sel) => document.querySelectorAll(sel);

let toastContainer = null;

const getToastContainer = () => {
  if (!toastContainer) toastContainer = $id("toastContainer");
  return toastContainer;
};

export const showToast = (message, type = "success") => {
  const container = getToastContainer();
  if (!container) return;
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "toastOut 0.3s forwards";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};

let modalCallback = null;

export const showModal = (title, message, callback) => {
  const modalTitle = $id("modalTitle");
  const modalMessage = $id("modalMessage");
  const modal = $id("customModal");
  if (!modal || !modalTitle || !modalMessage) return;
  modalTitle.textContent = title;
  modalMessage.textContent = message;
  modalCallback = callback;
  modal.classList.remove("hidden");
};

export const hideModal = () => {
  const modal = $id("customModal");
  if (modal) modal.classList.add("hidden");
  modalCallback = null;
};

export const confirmModal = () => {
  if (modalCallback) modalCallback();
  hideModal();
};

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.cssText = "position:fixed;opacity:0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
};

export const escapeHtml = (value) => {
  if (!value) return "";
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
};

export const decodeEntities = (value) => {
  if (!value) return "";
  const ta = document.createElement("textarea");
  ta.innerHTML = value;
  return ta.value;
};

export const decodeHtml = (value) => {
  if (!value) return "";
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
};

export const highlightCode = (value) => {
  const keywords = [
    "await","break","case","catch","class","const","continue","debugger",
    "default","delete","do","else","export","extends","false","finally",
    "for","function","if","import","in","instanceof","let","new","null",
    "return","super","switch","this","throw","true","try","typeof","var",
    "void","while","with","yield","async","from","as","interface","type",
    "enum","public","private","protected","static","readonly"
  ];
  const kw = `\\b(?:${keywords.join("|")})\\b`;
  const re = new RegExp(
    [
      `("(?:\\\\.|[^"\\\\])*"|'(?:\\\\.|[^'\\\\])*'|\\\`(?:\\\\.|[^\\\`\\\\])*\\\`)`,
      "(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)",
      "(\\b\\d+(?:\\.\\d+)?\\b)",
      `(${kw})`,
      "(\\b[A-Za-z_$][\\w$]*\\b)(?=\\s*\\()",
      "([()[\\]{}])",
      "([\\+\\-\\*\\/\\=%&\\|\\^!<>\\?~\\:]+)"
    ].join("|"),
    "g"
  );
  let html = "";
  let lastIndex = 0;
  let match;
  while ((match = re.exec(value)) !== null) {
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
    lastIndex = re.lastIndex;
  }
  html += escapeHtml(value.substring(lastIndex));
  return html;
};

export const formatText = (text) => {
  text = text.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');
  text = text.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/~~([^~]+)~~/g, "<s>$1</s>");
  return text;
};
