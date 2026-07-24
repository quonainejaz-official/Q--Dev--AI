import { $id, showToast } from "./utils.js";
import { apiFetch } from "./api.js";
import { getAuthUser, setAuthUser, isLoggedIn, clearServerIds, migrateGuestChats, loadCloudChats, saveLocal } from "./state.js";
import { renderHistoryList } from "./sidebar.js";

let loginButton, accountChip, accountAvatar, accountName, accountEmail, logoutButton;
let authModal, authClose, authTitle, authTabs, authForm, authNameRow;
let authName, authEmail, authPassword, authError, authSubmit;

let authMode = "login";
let googleInitialized = false;

const updateAuthUI = () => {
  const user = getAuthUser();
  if (user) {
    loginButton?.classList.add("hidden");
    accountChip?.classList.remove("hidden");
    if (accountName) accountName.textContent = user.name || "Account";
    if (accountEmail) accountEmail.textContent = user.email || "";
    if (accountAvatar) {
      if (user.avatar) {
        accountAvatar.style.backgroundImage = `url(${user.avatar})`;
        accountAvatar.textContent = "";
      } else {
        accountAvatar.style.backgroundImage = "";
        accountAvatar.textContent = (user.name || user.email || "?").charAt(0).toUpperCase();
      }
    }
  } else {
    loginButton?.classList.remove("hidden");
    accountChip?.classList.add("hidden");
  }
};

const showAuthError = (msg) => {
  if (!authError) return;
  authError.textContent = msg;
  authError.classList.remove("hidden");
};

const setAuthMode = (mode) => {
  authMode = mode;
  authTabs?.forEach(t => t.classList.toggle("active", t.dataset.mode === mode));
  if (authTitle) authTitle.textContent = mode === "login" ? "Welcome back" : "Create your account";
  authNameRow?.classList.toggle("hidden", mode !== "register");
  if (authSubmit) authSubmit.textContent = mode === "login" ? "Log in" : "Sign up";
  authError?.classList.add("hidden");
};

const initGoogleButton = () => {
  const clientId = window.__GOOGLE_CLIENT_ID__;
  if (!clientId || googleInitialized || typeof google === "undefined") return;
  try {
    google.accounts.id.initialize({
      client_id: clientId,
      callback: async (response) => {
        try {
          const res = await apiFetch("/api/auth/google", {
            method: "POST",
            body: JSON.stringify({ credential: response.credential })
          });
          const data = await res.json();
          if (res.ok && data.user) await onLoginSuccess(data.user);
          else showAuthError(data.error || "Google sign-in failed.");
        } catch { showAuthError("Google sign-in failed."); }
      }
    });
    const googleBtn = $id("googleBtn");
    if (googleBtn) {
      google.accounts.id.renderButton(googleBtn, { theme: "outline", size: "large", width: 320 });
    }
    googleInitialized = true;
  } catch { /* GSI not ready */ }
};

const openAuthModal = () => {
  if (!authModal) return;
  setAuthMode("login");
  authForm?.reset();
  authModal.classList.remove("hidden");
  let tries = 0;
  const tryInit = () => {
    initGoogleButton();
    if (!googleInitialized && tries < 20) { tries += 1; setTimeout(tryInit, 200); }
  };
  tryInit();
};

const closeAuthModal = () => authModal?.classList.add("hidden");

const onLoginSuccess = async (user) => {
  setAuthUser(user);
  updateAuthUI();
  closeAuthModal();
  await migrateGuestChats();
  const changed = await loadCloudChats();
  if (changed) renderHistoryList();
  showToast(`Signed in as ${user.name || user.email}.`, "success");
};

const handleAuthSubmit = async (e) => {
  e.preventDefault();
  authError?.classList.add("hidden");
  const email = authEmail?.value?.trim();
  const password = authPassword?.value;
  const name = authName?.value?.trim();
  if (!email || !password) { showAuthError("Email and password are required."); return; }
  if (authSubmit) { authSubmit.disabled = true; authSubmit.textContent = "Please wait..."; }
  try {
    const path = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = authMode === "login" ? { email, password } : { email, password, name };
    const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) });
    const data = await res.json();
    if (res.ok && data.user) await onLoginSuccess(data.user);
    else showAuthError(data.error || "Something went wrong.");
  } catch { showAuthError("Network error. Please try again."); }
  finally { if (authSubmit) { authSubmit.disabled = false; authSubmit.textContent = authMode === "login" ? "Log in" : "Sign up"; } }
};

const handleLogout = async () => {
  try { await apiFetch("/api/auth/logout", { method: "POST" }); } catch { /* ignore */ }
  setAuthUser(null);
  clearServerIds();
  updateAuthUI();
  showToast("Logged out.", "success");
};

const checkAuth = async () => {
  try {
    const res = await apiFetch("/api/auth/me");
    const data = await res.json();
    setAuthUser(data.user || null);
  } catch { setAuthUser(null); }
  updateAuthUI();
  if (isLoggedIn()) {
    const changed = await loadCloudChats();
    if (changed) renderHistoryList();
  }
};

export const initAuth = () => {
  loginButton = $id("loginButton");
  accountChip = $id("accountChip");
  accountAvatar = $id("accountAvatar");
  accountName = $id("accountName");
  accountEmail = $id("accountEmail");
  logoutButton = $id("logoutButton");
  authModal = $id("authModal");
  authClose = $id("authClose");
  authTitle = $id("authTitle");
  authTabs = document.querySelectorAll(".auth-tab");
  authForm = $id("authForm");
  authNameRow = $id("authNameRow");
  authName = $id("authName");
  authEmail = $id("authEmail");
  authPassword = $id("authPassword");
  authError = $id("authError");
  authSubmit = $id("authSubmit");

  loginButton?.addEventListener("click", openAuthModal);
  authClose?.addEventListener("click", closeAuthModal);
  logoutButton?.addEventListener("click", handleLogout);
  authForm?.addEventListener("submit", handleAuthSubmit);
  authTabs?.forEach(t => t.addEventListener("click", () => setAuthMode(t.dataset.mode)));
  authModal?.addEventListener("click", (e) => { if (e.target === authModal) closeAuthModal(); });

  checkAuth();
};
