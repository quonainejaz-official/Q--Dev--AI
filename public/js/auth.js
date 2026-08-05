import { $id, showToast } from "./utils.js";
import { apiFetch } from "./api.js";
import { getAuthUser, setAuthUser, isLoggedIn, clearServerIds, migrateGuestChats, loadCloudChats, saveLocal } from "./state.js";
import { renderHistoryList } from "./sidebar.js";

let authModal, authClose, authTitle, authTabs, authForm, authNameRow;
let authName, authEmail, authPassword, authError, authSubmit;

let authMode = "login";
let googleInitialized = false;

const showAuthError = (msg) => {
  if (!authError) return;
  authError.textContent = msg;
  authError.classList.remove("hidden");
};

// Rate-limit and proxy errors can come back as HTML/plain text, which would
// make res.json() throw and mask the real status code.
const readJson = async (res) => {
  try { return await res.json(); } catch { return {}; }
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
        if (!response?.credential) {
          console.error("[auth] Google returned no credential", response);
          showAuthError("Google did not return a credential. Please try again.");
          return;
        }
        try {
          const res = await apiFetch("/api/auth/google", {
            method: "POST",
            body: JSON.stringify({ credential: response.credential })
          });
          const data = await readJson(res);
          if (res.ok && data.user) {
            await onLoginSuccess(data.user);
            return;
          }
          console.error("[auth] /api/auth/google failed", res.status, data);
          showAuthError(data.error || `Google sign-in failed (HTTP ${res.status}).`);
        } catch (err) {
          console.error("[auth] Google sign-in request threw", err);
          showAuthError("Could not reach the server. Please try again.");
        }
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
  closeAuthModal();
  await migrateGuestChats();
  const changed = await loadCloudChats();
  if (changed) renderHistoryList();
  showToast(`Signed in as ${user.name || user.email}.`, "success");

  try {
    const { bus } = await import('./events/EventBus.js');
    const { EVENTS } = await import('./events/events.js');
    bus.emit(EVENTS.AUTH.LOGIN_SUCCESS);
  } catch { /* ignore */ }
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
  showToast("Logged out.", "success");

  try {
    const { bus } = await import('./events/EventBus.js');
    const { EVENTS } = await import('./events/events.js');
    bus.emit(EVENTS.AUTH.LOGOUT);
  } catch { /* ignore */ }
};

const checkAuth = async () => {
  try {
    const res = await apiFetch("/api/auth/me");
    const data = await readJson(res);
    if (!res.ok) {
      // A 429/5xx here is not proof of being signed out — say so loudly rather
      // than silently dropping the session on the floor.
      console.error("[auth] /api/auth/me failed", res.status, data);
    }
    setAuthUser(data.user || null);
  } catch (err) {
    console.error("[auth] /api/auth/me threw", err);
    setAuthUser(null);
  }
  if (isLoggedIn()) {
    const changed = await loadCloudChats();
    if (changed) renderHistoryList();
  }
};

export const initAuth = () => {
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

  authClose?.addEventListener("click", closeAuthModal);
  authForm?.addEventListener("submit", handleAuthSubmit);
  authTabs?.forEach(t => t.addEventListener("click", () => setAuthMode(t.dataset.mode)));
  authModal?.addEventListener("click", (e) => { if (e.target === authModal) closeAuthModal(); });

  try {
    import('./events/EventBus.js').then(({ bus }) => {
      import('./events/events.js').then(({ EVENTS }) => {
        bus.on(EVENTS.AUTH.LOGIN_REQUIRED, openAuthModal);
        bus.on(EVENTS.AUTH.LOGOUT, handleLogout);
      });
    });
  } catch { /* ignore */ }

  checkAuth();
};
