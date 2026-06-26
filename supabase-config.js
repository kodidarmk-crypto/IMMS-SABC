const IMMS_SUPABASE_URL = "https://afujoysgsoluozufbbrg.supabase.co";
const IMMS_SUPABASE_KEY = "sb_publishable_Jy814jkIkXUAEAOhpmzFoA_MuxNhAsM";

window.IMMS = window.IMMS || {};

window.IMMS.ready = new Promise((resolve, reject) => {
  if (window.supabase?.createClient) {
    window.IMMS.supabase = window.supabase.createClient(IMMS_SUPABASE_URL, IMMS_SUPABASE_KEY);
    resolve(window.IMMS.supabase);
    return;
  }

  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  script.onload = () => {
    window.IMMS.supabase = window.supabase.createClient(IMMS_SUPABASE_URL, IMMS_SUPABASE_KEY);
    resolve(window.IMMS.supabase);
  };
  script.onerror = () => reject(new Error("Unable to load Supabase SDK"));
  document.head.appendChild(script);
});

window.IMMS.getClient = async () => window.IMMS.ready;

window.IMMS.getContext = () => ({
  usineId: sessionStorage.getItem("selectedUsine") || localStorage.getItem("selectedUsine"),
  chaineId: sessionStorage.getItem("selectedChaine") || localStorage.getItem("selectedChaine"),
  machineId: sessionStorage.getItem("machineId") || localStorage.getItem("machineId")
});

window.IMMS.setContext = (key, value) => {
  sessionStorage.setItem(key, value);
  localStorage.setItem(key, value);
};

window.IMMS.publicUrl = (path, bucket = "images") => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${IMMS_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
};

if (window.location.protocol === "file:") {
  document.addEventListener("DOMContentLoaded", () => {
    const warning = document.createElement("div");
    warning.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:9999;padding:14px 16px;background:#f1c40f;color:#1f1f1f;font-weight:700;text-align:center;box-shadow:0 2px 10px rgba(0,0,0,.2);";
    warning.textContent = "⚠️ Veuillez lancer ce projet via un serveur local (http://localhost), pas en file://. Supabase et les uploads ne fonctionnent pas avec file://.";
    document.body.prepend(warning);
  });
}

window.IMMS.escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[char]));

window.IMMS.notify = (message, type = "info") => {
  const existing = document.querySelector(".imms-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.className = `imms-toast imms-toast-${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 4200);
};
