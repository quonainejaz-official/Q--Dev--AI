import { $id, escapeHtml } from "./utils.js";
import { getCurrentChat } from "./state.js";

const PDF_SITE_URL = "https://ai.qdevaol.site";
const PDF_SITE_LABEL = "ai.qdevaol.site";
const PRINT_LOGO_SVG =
  '<svg viewBox="0 0 24 24" class="prh-logo" xmlns="http://www.w3.org/2000/svg">' +
  '<circle cx="12" cy="12" r="9" stroke="#1a73e8" stroke-width="2.5" fill="none"/>' +
  '<line x1="18" y1="18" x2="22" y2="22" stroke="#1a73e8" stroke-width="2.5" stroke-linecap="round"/>' +
  '<circle cx="12" cy="12" r="3" fill="#1a73e8"/></svg>';

const getExportTitle = () => {
  const cur = getCurrentChat();
  if (cur) {
    if (cur.titleIsCustom && cur.title && cur.title !== "New Chat") return cur.title;
    if (Array.isArray(cur.messages)) {
      const firstUser = cur.messages.find(m => m.role === "user");
      let full = firstUser?.content?.trim() || "";
      if (full) {
        full = full.split("\n")[0].trim();
        if (full.length > 140) full = full.slice(0, 140).trim();
        return full;
      }
    }
    if (cur.title && cur.title !== "New Chat") return cur.title;
  }
  const el = $id("currentChatTitle");
  const t = el?.textContent?.trim() || "";
  return t && t !== "New Chat" ? t : "Conversation";
};

const exportChatAsPdf = () => {
  const title = getExportTitle();
  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  const stampStr = dateStr + " \u00b7 " + timeStr;

  const existing = $id("printRoot");
  if (existing) existing.remove();

  const root = document.createElement("div");
  root.id = "printRoot";
  root.innerHTML =
    '<table class="print-doc">' +
    "<thead><tr><td>" +
    '<div class="print-run-header"><span class="prh-brand">' +
    PRINT_LOGO_SVG +
    "<span>Q-Dev-AI</span></span></div>" +
    "</td></tr></thead>" +
    "<tfoot><tr><td>" +
    '<div class="print-run-footer">' +
    '<span class="prf-left"><a href="' + PDF_SITE_URL + '">' + PDF_SITE_LABEL + "</a></span>" +
    '<span class="prf-mid">Q-Dev-AI</span>' +
    '<span class="prf-right">' + escapeHtml(stampStr) + "</span>" +
    "</div></td></tr></tfoot>" +
    "<tbody><tr><td>" +
    '<h1 class="print-doc-title">' + escapeHtml(title) + "</h1>" +
    '<div class="print-doc-body"></div>' +
    "</td></tr></tbody></table>";

  const messagesContainer = $id("messages");
  if (messagesContainer) {
    root.querySelector(".print-doc-body").appendChild(messagesContainer.cloneNode(true));
  }
  document.body.appendChild(root);
  window.print();
  setTimeout(() => root.remove(), 800);
};

export const initPdf = () => {
  const exportPdfBtn = $id("exportPdfBtn");
  if (exportPdfBtn) exportPdfBtn.addEventListener("click", exportChatAsPdf);
};
