// Shared helpers for all FairShift pages. No framework: small and fast on low-end phones.
"use strict";

const FS = (() => {
  const SVG_NS = "http://www.w3.org/2000/svg";

  class ApiError extends Error {
    constructor(status, message, code) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }

  async function api(path, { method = "GET", json, form } = {}) {
    const init = { method, credentials: "same-origin", headers: {} };
    if (json !== undefined) {
      init.headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(json);
    } else if (form) {
      init.body = form;
    }
    let response;
    try {
      response = await fetch(path, init);
    } catch {
      throw new ApiError(0, navigator.onLine ? "Server not reachable." : "You are offline.");
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = Array.isArray(data.detail) ? "Please check what you entered." : data.detail;
      throw new ApiError(response.status, detail || "Something went wrong.", data.code);
    }
    return data;
  }

  /** Create an element: el("p", {class: "x", text: "hi"}, child1, child2). Text is never parsed as HTML. */
  function el(tag, attrs = {}, ...children) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === "text") node.textContent = value;
      else if (key === "class") node.className = value;
      else if (key.startsWith("on")) node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? "" : value);
    }
    for (const child of children.flat()) {
      if (child !== null && child !== undefined && child !== false) {
        node.append(child instanceof Node ? child : document.createTextNode(String(child)));
      }
    }
    return node;
  }

  function icon(name, extraClass = "") {
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", `icon ${extraClass}`.trim());
    svg.setAttribute("aria-hidden", "true");
    const use = document.createElementNS(SVG_NS, "use");
    use.setAttribute("href", `/img/icons.svg#${name}`);
    svg.append(use);
    return svg;
  }

  /** A spinner row to drop into a container while its data loads. */
  function loading(text = "Loading…") {
    return el("div", { class: "loading", role: "status" }, el("span", { class: "spinner", "aria-hidden": "true" }), text);
  }

  let toastTimer;
  function toast(message, isError = false) {
    let box = document.getElementById("toast");
    if (!box) {
      box = el("div", { id: "toast", class: "toast", role: "status", "aria-live": "polite" });
      document.body.append(box);
    }
    box.textContent = message;
    box.className = isError ? "toast toast-error" : "toast";
    box.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (box.hidden = true), 4000);
  }

  function fmtNumber(value, lang = "en") {
    return new Intl.NumberFormat(`${lang}-IN`, { maximumFractionDigits: 1 }).format(value);
  }

  function fmtMoney(value, lang = "en") {
    return new Intl.NumberFormat(`${lang}-IN`, {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(value);
  }

  function timeAgo(iso) {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 48) return `${hours} h ago`;
    return `${Math.round(hours / 24)} days ago`;
  }

  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }

  async function demoLogin(role, sector) {
    await api("/api/auth/demo", { method: "POST", json: { role, sector } });
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" }).catch(() => {});
    location.href = "/";
  }

  return { api, ApiError, el, icon, loading, toast, fmtNumber, fmtMoney, timeAgo, registerServiceWorker, demoLogin, logout };
})();
