(() => {
  "use strict";

  const config = window.APP_CONFIG || {};
  let client = null;

  const isConfigured =
    typeof config.SUPABASE_URL === "string" &&
    typeof config.SUPABASE_PUBLISHABLE_KEY === "string" &&
    config.SUPABASE_URL.startsWith("https://") &&
    config.SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");

  function getClient() {
    if (!isConfigured) throw new Error("SUPABASE_NOT_CONFIGURED");

    if (!client) {
      client = window.supabase.createClient(
        config.SUPABASE_URL,
        config.SUPABASE_PUBLISHABLE_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
            flowType: "pkce"
          }
        }
      );
    }
    return client;
  }

  function qs(selector, scope = document) {
    return scope.querySelector(selector);
  }

  function qsa(selector, scope = document) {
    return [...scope.querySelectorAll(selector)];
  }

  function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[char]);
  }

  function dateToISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function parseISO(value) {
    const [year, month, day] = String(value).split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function addDays(date, amount) {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + amount);
    return copy;
  }

  function formatKoreanDate(value, includeYear = false) {
    const date = typeof value === "string" ? parseISO(value) : value;
    const weekday = ["일", "월", "화", "수", "목", "금", "토"][date.getDay()];
    const year = includeYear ? `${date.getFullYear()}. ` : "";
    return `${year}${date.getMonth() + 1}/${date.getDate()} (${weekday})`;
  }

  function formatCreatedAt(value) {
    const date = new Date(value);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0")
    ].join(".");
  }

  function createCode(length = 12) {
    const chars = "abcdefghjkmnpqrstuvwxyz23456789";
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    return [...values].map((value) => chars[value % chars.length]).join("");
  }

  function getCode() {
    return new URLSearchParams(location.search).get("code")?.trim() || "";
  }

  function pageUrl(page, params = {}) {
    const url = new URL(page, location.href);
    url.search = "";
    url.hash = "";
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return url.href;
  }

  function roomUrl(code, page = "room.html") {
    return pageUrl(page, { code });
  }

  function callbackUrl() {
    return pageUrl("auth-callback.html");
  }

  function safeReturnUrl(value) {
    try {
      const url = new URL(value, location.origin);
      if (url.origin !== location.origin) return pageUrl("index.html");
      return url.href;
    } catch {
      return pageUrl("index.html");
    }
  }

  function showToast(message, kind = "default") {
    let toast = qs("#app-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "app-toast";
      toast.className = "toast";
      toast.setAttribute("role", "status");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.dataset.kind = kind;
    toast.classList.add("show");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => toast.classList.remove("show"), 2600);
  }

  function setLoading(button, loading, label = "처리 중") {
    if (!button) return;
    if (loading) {
      button.dataset.originalText = button.textContent;
      button.disabled = true;
      button.innerHTML = `<span class="spinner" aria-hidden="true"></span>${escapeHtml(label)}`;
    } else {
      button.disabled = false;
      button.textContent = button.dataset.originalText || button.textContent;
    }
  }

  function configError(error) {
    if (error?.message === "SUPABASE_NOT_CONFIGURED") {
      showToast("Supabase 연결 정보가 없습니다.", "error");
      return true;
    }
    return false;
  }

  async function getSession() {
    const sb = getClient();
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    return data.session || null;
  }

  async function getUser() {
    const session = await getSession();
    return session?.user || null;
  }

  async function signInWithKakao(returnUrl = location.href) {
    const sb = getClient();
    localStorage.setItem("calbak-auth-return", safeReturnUrl(returnUrl));

    const { error } = await sb.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: callbackUrl(),
        scopes: "profile_nickname profile_image"
      }
    });

    if (error) throw error;
  }

  async function requireUser(returnUrl = location.href) {
    const user = await getUser();
    if (user) return user;

    await signInWithKakao(returnUrl);
    throw new Error("AUTH_REDIRECT");
  }

  async function signOut() {
    const sb = getClient();
    const { error } = await sb.auth.signOut();
    if (error) throw error;
    localStorage.removeItem("calbak-auth-return");
  }

  function getProfile(user) {
    const meta = user?.user_metadata || {};
    const rawName =
      meta.name ||
      meta.full_name ||
      meta.nickname ||
      meta.preferred_username ||
      meta.user_name ||
      meta.custom_claims?.nickname ||
      "카카오 사용자";

    const avatar =
      meta.avatar_url ||
      meta.picture ||
      meta.profile_image_url ||
      meta.profile_image ||
      meta.custom_claims?.profile_image ||
      "";

    return {
      name: String(rawName).trim().slice(0, 30) || "카카오 사용자",
      avatar: String(avatar || "")
    };
  }

  function initials(name = "?") {
    return String(name).trim().slice(0, 1) || "?";
  }

  function avatarMarkup(participant, small = false) {
    const name = escapeHtml(participant.name || "?");
    if (participant.avatar) {
      return `<span class="person-avatar${small ? " small" : ""}" title="${name}">
        <img src="${escapeHtml(participant.avatar)}" alt="${name}">
      </span>`;
    }
    return `<span class="person-avatar${small ? " small" : ""}" title="${name}">
      ${escapeHtml(initials(participant.name))}
    </span>`;
  }

  function saveRoomHistory(room) {
    const key = "calbak-room-history";
    let list = [];
    try {
      list = JSON.parse(localStorage.getItem(key) || "[]");
    } catch {
      list = [];
    }

    const entry = {
      code: room.code,
      title: room.title,
      created_at: room.created_at || new Date().toISOString(),
      visited_at: new Date().toISOString()
    };

    const next = [entry, ...list.filter((item) => item.code !== room.code)].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(next));
  }

  function getRoomHistory() {
    try {
      return JSON.parse(localStorage.getItem("calbak-room-history") || "[]");
    } catch {
      return [];
    }
  }

  function removeRoomHistory(code) {
    const next = getRoomHistory().filter((item) => item.code !== code);
    localStorage.setItem("calbak-room-history", JSON.stringify(next));
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      showToast("링크를 복사했습니다.");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
      showToast("링크를 복사했습니다.");
    }
  }

  async function shareRoom(room, page = "room.html") {
    const url = roomUrl(room.code, page);
    const shareData = {
      title: `캘박 · ${room.title}`,
      text: `${room.title} 가능한 날짜를 골라주세요.`,
      url
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    await copyText(url);
  }

  window.App = {
    isConfigured,
    getClient,
    qs,
    qsa,
    escapeHtml,
    dateToISO,
    parseISO,
    addDays,
    formatKoreanDate,
    formatCreatedAt,
    createCode,
    getCode,
    pageUrl,
    roomUrl,
    callbackUrl,
    safeReturnUrl,
    showToast,
    setLoading,
    configError,
    getSession,
    getUser,
    signInWithKakao,
    requireUser,
    signOut,
    getProfile,
    initials,
    avatarMarkup,
    saveRoomHistory,
    getRoomHistory,
    removeRoomHistory,
    copyText,
    shareRoom
  };
})();
