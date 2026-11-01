// FairShift manager dashboard.
"use strict";

(() => {
  const { api, el, icon, toast, fmtNumber, timeAgo } = FS;
  const $ = (id) => document.getElementById(id);
  const SVG_NS = "http://www.w3.org/2000/svg";
  const REFRESH_MS = 30_000;

  const CATEGORY = {
    fall: "Fall / working at height",
    electrical: "Electrical",
    heat: "Heat & water",
    equipment: "Equipment",
    harassment: "Harassment / conduct",
    wages: "Wages & overtime",
    infection: "Infection / sharps",
    chemical: "Chemical",
    slip: "Slip / wet floor",
    other: "Other",
  };
  const LANGUAGE = { en: "English", hi: "Hindi", ta: "Tamil" };
  const BAND = { healthy: "Healthy", watch: "Watch", at_risk: "At risk" };

  const state = { filter: "open", reports: [], roster: [], codeExpires: 0, codeWindow: 300 };
  const LOAD_ERROR = "Couldn't load this. Check your connection and refresh the page.";
  let timersStarted = false;

  // ---------- auth ----------

  async function boot() {
    wire();
    const me = await api("/api/auth/me").catch(() => ({ role: null }));
    $("page-loading").hidden = true;
    if (me.role === "manager") await enter();
    else $("login-view").hidden = false;
  }

  async function enter() {
    $("login-view").hidden = true;
    $("dash-view").hidden = false;
    $("logout-btn").hidden = false;
    $("teams").replaceChildren(FS.loading("Loading teams…"));
    $("issues").replaceChildren(FS.loading("Loading reports…"));
    $("roster").replaceChildren(el("li", {}, FS.loading("Loading workers…")));
    // Each section fails on its own, so one slow call never blanks the whole dashboard.
    const failed = (box, wrap = (n) => n) => () =>
      $(box).replaceChildren(wrap(el("p", { class: "empty", text: LOAD_ERROR })));
    await Promise.all([
      loadDashboard().catch(failed("teams")),
      loadCode().catch(() => ($("code-left").textContent = LOAD_ERROR)),
      loadReports().catch(failed("issues")),
      loadRoster().catch(failed("roster", (n) => el("li", {}, n))),
    ]);
    // enter() can run again after a second login; keep only one set of timers.
    if (timersStarted) return;
    timersStarted = true;
    setInterval(tickCode, 1000);
    setInterval(() => {
      if (!document.hidden) Promise.all([loadDashboard(), loadReports()]).catch(() => {});
    }, REFRESH_MS);
  }

  async function login(event) {
    event.preventDefault();
    $("login-error").textContent = "";
    if (!$("email").value.trim() || !$("password").value) {
      $("login-error").textContent = "Please enter your work email and password.";
      return;
    }
    try {
      await api("/api/auth/manager", {
        method: "POST",
        json: { email: $("email").value.trim(), password: $("password").value },
      });
      await enter();
    } catch (err) {
      $("login-error").textContent = err.message;
    }
  }

  // ---------- dashboard ----------

  async function loadDashboard() {
    const d = await api("/api/admin/dashboard");
    document.title = `FairShift · ${d.site.name}`;
    $("site-name").textContent = d.site.name;
    $("site-city").textContent = `${d.sector.name} · ${d.site.city} · ${d.manager}`;
    const chip = $("sector-chip");
    chip.hidden = false;
    chip.replaceChildren(icon(d.sector.id === "hospital" ? "hospital" : "hardhat"), d.sector.name);
    $("updated").textContent = `Updated ${new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;

    const k = d.kpis;
    $("kpi-onshift").textContent = k.on_shift;
    $("kpi-onshift-note").textContent = `of ${k.workers} workers`;
    $("kpi-ot").textContent = fmtNumber(k.overtime_hours_7d);
    $("kpi-fatigue").textContent = k.fatigue_alerts;
    $("kpi-reports").textContent = k.open_reports;
    const esc = $("kpi-escalated");
    esc.textContent = k.escalated_reports ? `${k.escalated_reports} past deadline` : "all within deadline";
    esc.classList.toggle("bad", k.escalated_reports > 0);
    $("privacy-text").textContent =
      `Team-level data only; teams under ${d.min_group_size} people are hidden. ` +
      "Anonymous reports never show who sent them.";

    renderTeams(d.teams);
    renderTrend(d.attendance_trend);
  }

  function scoreRing(health) {
    const size = 64;
    const r = 26;
    const circumference = 2 * Math.PI * r;
    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("class", "score-ring");
    svg.setAttribute("viewBox", `0 0 ${size} ${size}`);
    svg.setAttribute("aria-hidden", "true");
    const circle = (cls) => {
      const c = document.createElementNS(SVG_NS, "circle");
      c.setAttribute("cx", size / 2);
      c.setAttribute("cy", size / 2);
      c.setAttribute("r", r);
      c.setAttribute("class", cls);
      return c;
    };
    svg.append(circle("track"));
    if (!health.hidden) {
      const arc = circle(`arc arc-${health.band}`);
      arc.setAttribute("stroke-dasharray", `${(health.score / 100) * circumference} ${circumference}`);
      arc.setAttribute("transform", `rotate(-90 ${size / 2} ${size / 2})`);
      arc.setAttribute("stroke-linecap", "round");
      svg.append(arc);
    }
    const text = document.createElementNS(SVG_NS, "text");
    text.setAttribute("x", "50%");
    text.setAttribute("y", "50%");
    text.setAttribute("text-anchor", "middle");
    text.setAttribute("dominant-baseline", "central");
    text.textContent = health.hidden ? "–" : health.score;
    svg.append(text);
    return svg;
  }

  function renderTeams(teams) {
    if (!teams.length) {
      $("teams").replaceChildren(el("p", { class: "card empty", text: "No teams on this site yet." }));
      return;
    }
    $("teams").replaceChildren(
      ...teams.map((team) => {
        const h = team.health;
        const label = h.hidden ? "Hidden" : BAND[h.band];
        return el(
          "article",
          { class: "card team-card", "aria-label": `${team.name}: ${h.hidden ? "hidden for privacy" : `score ${h.score}, ${label}`}` },
          el(
            "div",
            { class: "team-top" },
            scoreRing(h),
            el(
              "div",
              {},
              el("h3", { text: team.name }),
              el("span", { class: `chip chip-${h.hidden ? "" : h.band}`, text: label })
            )
          ),
          el("ul", { class: "reasons" }, h.reasons.map((reason) => el("li", { text: reason }))),
          el(
            "div",
            { class: "team-meta" },
            el("span", { text: `${team.size} workers` }),
            el("span", { text: `${team.on_shift} on shift` }),
            el("span", { text: `${fmtNumber(team.overtime_hours)} h overtime` })
          )
        );
      })
    );
  }

  function renderTrend(points) {
    const svg = $("trend");
    svg.replaceChildren();
    const W = 360, H = 170, left = 34, right = 10, top = 10, bottom = 26;
    const x = (i) => left + (i * (W - left - right)) / Math.max(1, points.length - 1);
    const y = (v) => top + (1 - v) * (H - top - bottom);
    const add = (tag, attrs, text) => {
      const node = document.createElementNS(SVG_NS, tag);
      for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
      if (text !== undefined) node.textContent = text;
      svg.append(node);
      return node;
    };
    for (const v of [0, 0.5, 1]) {
      add("line", { x1: left, x2: W - right, y1: y(v), y2: y(v), class: "grid-line" });
      add("text", { x: left - 6, y: y(v) + 4, "text-anchor": "end", class: "axis-label" }, `${v * 100}%`);
    }
    const line = points.map((p, i) => `${x(i)},${y(p.rate)}`).join(" ");
    add("polygon", {
      points: `${x(0)},${y(0)} ${line} ${x(points.length - 1)},${y(0)}`,
      class: "area",
    });
    add("polyline", { points: line, class: "line" });
    points.forEach((p, i) => {
      const dot = add("circle", { cx: x(i), cy: y(p.rate), r: 3, class: "dot" });
      const title = document.createElementNS(SVG_NS, "title");
      title.textContent = `${p.date}: ${Math.round(p.rate * 100)}%`;
      dot.append(title);
      if ((points.length - 1 - i) % 3 === 0) {
        const d = new Date(`${p.date}T00:00:00`);
        add(
          "text",
          {
            x: x(i),
            y: H - 6,
            "text-anchor": i === points.length - 1 ? "end" : "middle",
            class: "axis-label",
          },
          d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
        );
      }
    });
    const avg = points.reduce((sum, p) => sum + p.rate, 0) / (points.length || 1);
    const last = points.at(-1);
    $("trend-desc").textContent =
      `Average attendance ${Math.round(avg * 100)}% over 14 days; today ${Math.round((last?.rate || 0) * 100)}%.`;
  }

  // ---------- site code ----------

  async function loadCode() {
    const c = await api("/api/admin/site-code");
    $("site-code").textContent = c.code;
    state.codeWindow = c.window_seconds;
    state.codeExpires = Date.now() + c.seconds_left * 1000;
    tickCode();
  }

  function tickCode() {
    const left = Math.max(0, Math.round((state.codeExpires - Date.now()) / 1000));
    if (left === 0) {
      loadCode().catch(() => {});
      return;
    }
    $("code-bar").style.width = `${(left / state.codeWindow) * 100}%`;
    const m = Math.floor(left / 60);
    const s = String(left % 60).padStart(2, "0");
    $("code-left").textContent = `New code in ${m}:${s}`;
  }

  // ---------- reports ----------

  async function loadReports() {
    state.reports = await api("/api/admin/reports");
    renderReports();
  }

  function renderReports() {
    const list = state.reports.filter((r) => state.filter === "all" || r.status !== "fixed");
    const box = $("issues");
    if (!list.length) {
      const text = state.filter === "all" ? "No reports yet." : "No open reports. Nice work.";
      box.replaceChildren(el("p", { class: "empty", text }));
      return;
    }
    box.replaceChildren(
      ...list.map((r) => {
        const actions = [];
        if (r.status === "reported") actions.push(statusButton(r, "seen", "Mark as seen"));
        if (r.status !== "fixed") actions.push(statusButton(r, "fixed", "Mark as fixed", true));
        const due = new Date(r.due_at);
        return el(
          "article",
          { class: `issue ${r.escalated ? "escalated" : ""}` },
          el(
            "div",
            { class: "report-head" },
            el("span", { class: `chip chip-${r.severity}`, text: r.severity }),
            el("span", { class: "chip", text: CATEGORY[r.category] || r.category }),
            el("span", { class: `chip chip-${r.status}`, text: r.status }),
            r.escalated && el("span", { class: "chip chip-critical" }, icon("alert"), "Escalated"),
            r.anonymous && el("span", { class: "chip" }, icon("lock"), "Anonymous")
          ),
          el("p", { class: "issue-summary", text: r.summary }),
          r.transcript && r.original_lang !== "en" && r.transcript !== r.summary
            ? el("p", {
                class: "issue-original",
                lang: r.original_lang,
                text: `${LANGUAGE[r.original_lang] || r.original_lang} (${r.source}): “${r.transcript}”`,
              })
            : null,
          el("p", {
            class: "muted small",
            text:
              `Reported ${timeAgo(r.created_at)} · ` +
              (r.status === "reported"
                ? `${r.escalated ? "was due" : "respond by"} ${due.toLocaleString("en-IN", { weekday: "short", hour: "numeric", minute: "2-digit" })}`
                : `${r.status} ${timeAgo(r.history.at(-1).at)}`),
          }),
          actions.length ? el("div", { class: "issue-actions" }, actions) : null
        );
      })
    );
  }

  function statusButton(report, status, label, primary = false) {
    return el(
      "button",
      {
        type: "button",
        class: `btn btn-sm ${primary ? "btn-primary" : ""}`,
        onclick: async (e) => {
          e.currentTarget.disabled = true;
          try {
            await api(`/api/admin/reports/${encodeURIComponent(report.id)}`, {
              method: "PATCH",
              json: { status },
            });
            toast(`Report marked ${status}`);
            await Promise.all([loadReports(), loadDashboard()]);
          } catch (err) {
            toast(err.message, true);
          }
        },
      },
      label
    );
  }

  // ---------- roll call ----------

  async function loadRoster() {
    state.roster = await api("/api/admin/roster");
    renderRoster();
  }

  function renderRoster() {
    const q = $("roll-search").value.trim().toLowerCase();
    const rows = state.roster.filter(
      (w) => !q || w.name.toLowerCase().includes(q) || w.team.toLowerCase().includes(q)
    );
    if (!rows.length) {
      const text = q ? "No workers match your search." : "No workers on this site yet.";
      $("roster").replaceChildren(el("li", { class: "empty", text }));
      return;
    }
    $("roster").replaceChildren(
      ...rows.map((w) =>
        el(
          "li",
          {},
          el(
            "label",
            {},
            el("input", { type: "checkbox", value: w.id, disabled: w.on_shift, checked: w.on_shift }),
            el("span", { class: "who" }, w.name, el("span", { class: "team-name", text: w.team })),
            w.on_shift ? el("span", { class: "chip chip-fixed", text: "On shift" }) : null
          )
        )
      )
    );
  }

  async function submitRollCall(event) {
    event.preventDefault();
    const ids = [...$("roster").querySelectorAll("input:checked:not(:disabled)")].map((i) => i.value);
    if (!ids.length) {
      toast("Tick at least one worker.", true);
      return;
    }
    try {
      const result = await api("/api/admin/rollcall", { method: "POST", json: { worker_ids: ids } });
      toast(`Shift started for ${result.started} worker${result.started === 1 ? "" : "s"}`);
      await Promise.all([loadRoster(), loadDashboard()]);
    } catch (err) {
      toast(err.message, true);
    }
  }

  // ---------- wiring ----------

  function wire() {
    $("login-form").addEventListener("submit", login);
    document.querySelectorAll("[data-demo]").forEach((btn) =>
      btn.addEventListener("click", async () => {
        try {
          await FS.demoLogin("manager", btn.dataset.demo);
          await enter();
        } catch (err) {
          $("login-error").textContent = err.message;
        }
      })
    );
    $("logout-btn").addEventListener("click", FS.logout);
    document.querySelectorAll("[data-filter]").forEach((btn) =>
      btn.addEventListener("click", () => {
        state.filter = btn.dataset.filter;
        document
          .querySelectorAll("[data-filter]")
          .forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
        renderReports();
      })
    );
    $("roll-search").addEventListener("input", renderRoster);
    $("roll-form").addEventListener("submit", submitRollCall);
  }

  document.addEventListener("DOMContentLoaded", boot);
})();
