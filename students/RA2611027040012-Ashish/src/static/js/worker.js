// FairShift worker app.
"use strict";

(() => {
  const { api, el, icon, toast, fmtNumber, fmtMoney, timeAgo } = FS;
  const $ = (id) => document.getElementById(id);
  const TOKENS_KEY = "fs_report_tokens";
  const LANG_KEY = "fs_lang";
  const MAX_RECORDING_MS = 60_000;

  const state = {
    lang: readLocal(LANG_KEY) || "en",
    me: null,
    status: null,
    weekOffset: 0,
    code: "",
    audio: null, // { blob, mime, seconds }
  };

  // ---------- small utilities ----------

  function readLocal(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeLocal(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* storage unavailable (private mode): the app still works */
    }
  }

  const tr = (key, params) => t(state.lang, key, params);

  function hours(value) {
    return `${fmtNumber(value, state.lang)} ${tr("hours_unit")}`;
  }

  // ---------- language ----------

  function applyLanguage() {
    document.documentElement.lang = state.lang;
    document.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = tr(node.dataset.i18n);
    });
    document.querySelectorAll("[data-lang]").forEach((btn) => {
      btn.setAttribute("aria-pressed", String(btn.dataset.lang === state.lang));
    });
    if (state.me) {
      $("hello").textContent = tr("hello", { name: state.me.name.split(" ")[0] });
    }
    updateMicLabel();
  }

  async function setLanguage(lang) {
    state.lang = lang;
    writeLocal(LANG_KEY, lang);
    applyLanguage();
    if (state.me) {
      await api("/api/worker/lang", { method: "PUT", json: { lang } }).catch(() => {});
      await Promise.all([loadStatus(), loadPayslip()]).catch((err) => toast(err.message, true));
      renderReports();
    }
  }

  // ---------- speech ----------

  function speak(text) {
    if (!("speechSynthesis" in window)) {
      toast(tr("no_voice"), true);
      return;
    }
    const target = SPEECH_LANG[state.lang];
    const voices = speechSynthesis.getVoices();
    const voice =
      voices.find((v) => v.lang === target) ||
      voices.find((v) => v.lang.startsWith(state.lang));
    if (!voice && state.lang !== "en" && voices.length) {
      toast(tr("no_voice"), true);
      return;
    }
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = target;
    if (voice) utterance.voice = voice;
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
  }

  function speakButton(text) {
    return el(
      "button",
      { type: "button", class: "speak-btn", onclick: () => speak(text) },
      icon("speaker"),
      el("span", { class: "sr-only", text: tr("listen") })
    );
  }

  // ---------- auth ----------

  async function boot() {
    FS.registerServiceWorker();
    wireStatic();
    applyLanguage();
    const me = await api("/api/auth/me").catch(() => ({ role: null }));
    if (me.role === "worker") {
      await enterApp().catch((err) => {
        $("login-view").hidden = false;
        $("login-error").textContent = err.message;
      });
    } else {
      $("login-view").hidden = false;
    }
    $("page-loading").hidden = true;
  }

  async function enterApp() {
    state.me = await api("/api/worker/me");
    if (!readLocal(LANG_KEY)) {
      state.lang = state.me.lang;
    } else if (state.lang !== state.me.lang) {
      await api("/api/worker/lang", { method: "PUT", json: { lang: state.lang } }).catch(() => {});
    }
    $("login-view").hidden = true;
    $("app-view").hidden = false;
    $("tabbar").hidden = false;
    $("logout-btn").hidden = false;
    $("where").textContent = `${state.me.team} · ${state.me.site}`;
    applyLanguage();
    $("pay-lines").replaceChildren(el("li", {}, FS.loading("")));
    $("my-reports").replaceChildren(FS.loading(""));
    // Each section fails on its own; the worker sees a short message instead of a blank card.
    const failed = (err) => toast(err.message, true);
    await Promise.all([loadStatus().catch(failed), loadPayslip().catch(failed), loadReports()]);
  }

  async function login(event) {
    event.preventDefault();
    $("login-error").textContent = "";
    const phone = $("phone").value.trim();
    const pin = $("pin").value.trim();
    if (!/^\d{10}$/.test(phone) || !/^\d{4}$/.test(pin)) {
      $("login-error").textContent = tr("login_check");
      return;
    }
    try {
      await api("/api/auth/worker", { method: "POST", json: { phone, pin } });
      await enterApp();
    } catch (err) {
      $("login-error").textContent = err.message;
    }
  }

  async function demo(sector) {
    try {
      await FS.demoLogin("worker", sector);
      await enterApp();
    } catch (err) {
      $("login-error").textContent = err.message;
    }
  }

  // ---------- shift ----------

  async function loadStatus() {
    state.status = await api("/api/worker/status");
    renderStatus();
  }

  function renderStatus() {
    const s = state.status;
    if (!s) return;
    const on = s.on_shift;
    $("status-dot").classList.toggle("on", on);
    $("status-title").textContent = tr(on ? "on_shift" : "off_shift");
    $("status-sub").textContent = on
      ? tr("since", {
          time: new Date(s.shift_started_at).toLocaleTimeString(`${state.lang}-IN`, {
            hour: "numeric",
            minute: "2-digit",
          }),
        })
      : "";
    $("start-btn").hidden = on || !$("code-form").hidden;
    $("end-btn").hidden = !on;
    $("stat-today").textContent = fmtNumber(s.hours_today, state.lang);
    $("stat-week").textContent = fmtNumber(s.hours_this_week, state.lang);
    $("stat-days").textContent = fmtNumber(s.days_in_a_row, state.lang);

    const box = $("alerts");
    box.replaceChildren();
    if (!s.alerts.length) {
      box.append(el("div", { class: "alert alert-ok" }, icon("shield"), el("p", { text: tr("rest_ok") })));
      return;
    }
    for (const alert of s.alerts) {
      box.append(
        el(
          "div",
          { class: `alert alert-${alert.severity}` },
          icon(alert.severity === "danger" ? "alert" : "moon"),
          el("p", { text: alert.message }),
          speakButton(alert.message)
        )
      );
    }
  }

  function openCodeEntry() {
    state.code = "";
    renderCode();
    $("code-error").textContent = "";
    $("code-form").hidden = false;
    $("start-btn").hidden = true;
    $("code-input").focus();
  }

  function closeCodeEntry() {
    $("code-form").hidden = true;
    renderStatus();
    $("start-btn").focus();
  }

  function renderCode() {
    $("code-input").value = state.code;
    [...$("code-display").children].forEach((box, i) => {
      box.textContent = state.code[i] || "";
      box.classList.toggle("filled", i < state.code.length);
    });
  }

  function pressKey(key) {
    if (key === "back") state.code = state.code.slice(0, -1);
    else if (state.code.length < 4) state.code += key;
    renderCode();
    if (state.code.length === 4) $("code-form").requestSubmit();
  }

  function currentPosition() {
    if (!$("share-location").checked || !navigator.geolocation) return Promise.resolve({});
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => resolve({}),
        { timeout: 6000, maximumAge: 60000 }
      );
    });
  }

  async function submitCode(event) {
    event.preventDefault();
    if (state.code.length !== 4) return;
    $("code-error").textContent = "";
    try {
      const where = await currentPosition();
      state.status = await api("/api/worker/shift/start", {
        method: "POST",
        json: { code: state.code, ...where },
      });
      $("code-form").hidden = true;
      renderStatus();
      toast(tr("shift_started"));
      $("end-btn").focus();
    } catch (err) {
      $("code-error").textContent = err.message;
      state.code = "";
      renderCode();
    }
  }

  async function endShift() {
    try {
      state.status = await api("/api/worker/shift/end", { method: "POST" });
      renderStatus();
      toast(tr("shift_ended"));
      loadPayslip().catch(() => {});
      $("start-btn").focus();
    } catch (err) {
      toast(err.message, true);
    }
  }

  // ---------- pay ----------

  function weekDate() {
    const d = new Date();
    d.setDate(d.getDate() + state.weekOffset * 7);
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  async function loadPayslip() {
    const slip = await api(`/api/worker/payslip?week_of=${weekDate()}`);
    const fmt = (iso) =>
      new Date(`${iso}T00:00:00`).toLocaleDateString(`${state.lang}-IN`, {
        day: "numeric",
        month: "short",
      });
    $("pay-period").textContent =
      state.weekOffset === 0
        ? tr("pay_title")
        : `${fmt(slip.period_start)} – ${fmt(slip.period_end)}`;
    $("pay-total").textContent = fmtMoney(slip.gross, state.lang);
    $("next-week").disabled = state.weekOffset >= 0;

    const icons = { basic: ["rupee", ""], overtime: ["plus-clock", "ot"], night: ["moon", "night"] };
    $("pay-lines").replaceChildren(
      ...slip.lines.map((line) => {
        const [name, cls] = icons[line.key];
        return el(
          "li",
          {},
          el("span", { class: `pay-icon ${cls}` }, icon(name)),
          el(
            "span",
            {},
            el("strong", { text: tr(line.key) }),
            el("br"),
            el("span", {
              class: "muted small",
              text: `${hours(line.hours)} × ${fmtMoney(line.rate, state.lang)}`,
            })
          ),
          el("span", { class: "pay-amount", text: fmtMoney(line.amount, state.lang) })
        );
      })
    );
    $("pay-sentence").textContent = slip.sentence;
    $("pay-speak").onclick = () => speak(slip.sentence);
    $("ot-note").textContent = tr("ot_note", { x: slip.overtime_multiplier });
  }

  // ---------- SafeVoice ----------

  let recorder = null;
  let chunks = [];
  let startedAt = 0;
  let timer = null;

  function updateMicLabel() {
    const label = $("mic-state");
    if (recorder && recorder.state === "recording") {
      const secs = Math.round((Date.now() - startedAt) / 1000);
      label.textContent = `${tr("recording")} ${secs}s`;
    } else if (state.audio) {
      label.textContent = tr("recorded", { s: state.audio.seconds });
    } else {
      label.textContent = tr("hold_to_speak");
    }
    $("mic-discard").hidden = !state.audio;
  }

  function pickMime() {
    const options = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus", "audio/mp4"];
    return options.find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
  }

  async function startRecording() {
    if (recorder && recorder.state === "recording") return;
    if (!navigator.mediaDevices || !window.MediaRecorder) {
      toast(tr("mic_denied"), true);
      $("report-text").focus();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      recorder = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : {});
      chunks = [];
      recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const type = (recorder.mimeType || "audio/webm").split(";")[0];
        const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000));
        state.audio = { blob: new Blob(chunks, { type }), mime: type, seconds };
        $("mic-btn").classList.remove("recording");
        clearInterval(timer);
        updateMicLabel();
      };
      recorder.start();
      startedAt = Date.now();
      $("mic-btn").classList.add("recording");
      timer = setInterval(() => {
        updateMicLabel();
        if (Date.now() - startedAt > MAX_RECORDING_MS) stopRecording();
      }, 500);
      updateMicLabel();
    } catch {
      toast(tr("mic_denied"), true);
      $("report-text").focus();
    }
  }

  function stopRecording() {
    if (recorder && recorder.state === "recording") recorder.stop();
  }

  function readTokens() {
    try {
      return JSON.parse(readLocal(TOKENS_KEY) || "[]");
    } catch {
      return [];
    }
  }

  let reports = [];

  async function loadReports() {
    const tokens = readTokens();
    reports = tokens.length
      ? await api(`/api/worker/reports?tokens=${encodeURIComponent(tokens.join(","))}`).catch(() => [])
      : [];
    renderReports();
  }

  function renderReports() {
    const box = $("my-reports");
    if (!reports.length) {
      box.replaceChildren(el("p", { class: "muted", text: tr("no_reports") }));
      return;
    }
    const order = ["reported", "seen", "fixed"];
    box.replaceChildren(
      ...reports.map((r) => {
        const reached = order.indexOf(r.status);
        return el(
          "article",
          { class: "report-item" },
          el(
            "div",
            { class: "report-head" },
            el("span", { class: `chip chip-${r.severity}`, text: r.severity }),
            el("span", { class: "chip", text: r.category }),
            el("span", { class: "muted small", text: timeAgo(r.created_at) })
          ),
          el("p", { text: r.transcript || r.summary }),
          el(
            "ol",
            { class: "tracker", "aria-label": "Status" },
            order.map((step, i) =>
              el("li", {
                class: i <= reached ? "done" : "",
                "aria-current": i === reached ? "step" : null,
                text: tr(`st_${step}`),
              })
            )
          )
        );
      })
    );
  }

  async function sendReport(event) {
    event.preventDefault();
    $("report-error").textContent = "";
    const text = $("report-text").value.trim();
    if (!text && !state.audio) {
      $("report-error").textContent = tr("report_help");
      return;
    }
    const form = new FormData();
    form.append("text", text);
    form.append("anonymous", String($("anonymous").checked));
    if (state.audio) {
      const ext = state.audio.mime.split("/")[1] || "webm";
      form.append("audio", new File([state.audio.blob], `report.${ext}`, { type: state.audio.mime }));
    }
    const button = $("report-send");
    button.disabled = true;
    try {
      const created = await api("/api/worker/reports", { method: "POST", form });
      writeLocal(TOKENS_KEY, JSON.stringify([created.tracking_token, ...readTokens()].slice(0, 50)));
      $("report-text").value = "";
      state.audio = null;
      updateMicLabel();
      toast(tr("sent"));
      await loadReports();
    } catch (err) {
      $("report-error").textContent = err.message;
    } finally {
      button.disabled = false;
    }
  }

  // ---------- tabs ----------

  function selectTab(tab) {
    document.querySelectorAll(".tab").forEach((btn) => {
      const selected = btn === tab;
      btn.setAttribute("aria-selected", String(selected));
      btn.tabIndex = selected ? 0 : -1;
      $(btn.getAttribute("aria-controls")).hidden = !selected;
    });
    window.scrollTo({ top: 0 });
  }

  function tabKeys(event) {
    const tabs = [...document.querySelectorAll(".tab")];
    const index = tabs.indexOf(document.activeElement);
    if (index < 0) return;
    const delta = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
    if (!delta) return;
    const next = tabs[(index + delta + tabs.length) % tabs.length];
    next.focus();
    selectTab(next);
  }

  // ---------- wiring ----------

  function wireStatic() {
    document.querySelectorAll("[data-lang]").forEach((btn) =>
      btn.addEventListener("click", () => setLanguage(btn.dataset.lang))
    );
    $("login-form").addEventListener("submit", login);
    document.querySelectorAll("[data-demo]").forEach((btn) =>
      btn.addEventListener("click", () => demo(btn.dataset.demo))
    );
    $("logout-btn").addEventListener("click", FS.logout);

    $("start-btn").addEventListener("click", openCodeEntry);
    $("end-btn").addEventListener("click", endShift);
    $("code-cancel").addEventListener("click", closeCodeEntry);
    $("code-form").addEventListener("submit", submitCode);
    $("numpad").addEventListener("click", (e) => {
      const key = e.target.closest("[data-key]");
      if (key) pressKey(key.dataset.key);
    });
    $("code-input").addEventListener("input", (e) => {
      state.code = e.target.value.replace(/\D/g, "").slice(0, 4);
      renderCode();
      if (state.code.length === 4) $("code-form").requestSubmit();
    });

    const changeWeek = (delta) => {
      state.weekOffset = Math.min(0, state.weekOffset + delta);
      loadPayslip().catch((err) => toast(err.message, true));
    };
    $("prev-week").addEventListener("click", () => changeWeek(-1));
    $("next-week").addEventListener("click", () => changeWeek(1));

    const mic = $("mic-btn");
    mic.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      startRecording();
    });
    ["pointerup", "pointerleave", "pointercancel"].forEach((name) =>
      mic.addEventListener(name, stopRecording)
    );
    // Keyboard and screen-reader users: Enter/Space toggles recording.
    mic.addEventListener("click", (e) => {
      if (e.detail !== 0) return;
      if (recorder && recorder.state === "recording") stopRecording();
      else startRecording();
    });
    mic.addEventListener("contextmenu", (e) => e.preventDefault());
    $("mic-discard").addEventListener("click", () => {
      state.audio = null;
      updateMicLabel();
    });
    $("report-form").addEventListener("submit", sendReport);

    document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => selectTab(tab)));
    $("tabbar").addEventListener("keydown", tabKeys);

    const offline = () => ($("offline-banner").hidden = navigator.onLine);
    window.addEventListener("online", offline);
    window.addEventListener("offline", offline);
    offline();

    // Keep the shift timer and fatigue alerts current.
    setInterval(() => state.me && !document.hidden && loadStatus().catch(() => {}), 60_000);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
