/* ============================================================
   Utah Bucket List — app logic
   All state lives in localStorage on this device. No network calls.
   ============================================================ */

(function () {
  "use strict";

  const STORAGE_KEY = "utah-bucketlist:v1";
  const UI_KEY = "utah-bucketlist:ui:v1";

  const ICONS = {
    stamp:
      '<path d="M4 15h16M6 15V8a2 2 0 0 1 2-2h1l1-2h4l1 2h1a2 2 0 0 1 2 2v7" /><path d="M8 19h8" /><circle cx="12" cy="9.5" r="2" />',
    bolt: '<path d="M12 2 4 14h6l-1 8 9-13h-6l1-7z" />',
    leaf: '<path d="M4 20c8-1 14-6 15-16-10 1-15 7-16 16z" /><path d="M6 18c3-4 6-7 12-13" />',
    snow: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11" /><path d="M12 2l-2 2M12 2l2 2M12 22l-2-2M12 22l2-2M4.5 6.5l2.7-.4M4.5 6.5l.4 2.7M19.5 6.5l-2.7-.4M19.5 6.5l-.4 2.7M4.5 17.5l2.7.4M4.5 17.5l.4-2.7M19.5 17.5l-2.7.4M19.5 17.5l-.4-2.7" />',
    bloom:
      '<circle cx="12" cy="12" r="2.4" /><path d="M12 9.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM12 20.4a3 3 0 1 1 0-6 3 3 0 0 1 0 6zM9.6 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM20.4 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />',
    sun: '<circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v3M12 18.5v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2.5 12h3M18.5 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" />',
    compass:
      '<circle cx="12" cy="12" r="9.5" /><path d="M15.5 8.5 13 13l-4.5 2.5L11 11l4.5-2.5z" />',
    search: '<circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />',
  };

  const state = loadState();
  let filter = "all"; // all | todo | done
  const ui = loadUI();

  // ---------- storage ----------

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      /* corrupted storage — fall through to reseed */
    }
    const seed = {};
    ITEMS.forEach((item) => {
      seed[item.id] = !!item.done;
    });
    persist(seed);
    return seed;
  }

  function loadUI() {
    try {
      const raw = localStorage.getItem(UI_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      // Guard against an older UI_KEY schema (or corrupted storage) that
      // doesn't carry `open` — always hand back a usable shape.
      if (parsed && typeof parsed.open === "object" && parsed.open !== null) {
        return parsed;
      }
    } catch (e) {}
    return { open: {} };
  }

  // Every section is collapsible. Default is open for everything except
  // the "done" archive — a sensible starting point, overridden per section
  // the moment someone clicks a header.
  function isSectionOpen(key) {
    if (key in ui.open) return ui.open[key];
    return key !== "done";
  }

  function setSectionOpen(key, open) {
    ui.open[key] = open;
    persistUI();
    const el = document.getElementById(`section-${key}`);
    if (!el) return;
    el.classList.toggle("is-open", open);
    const head = el.querySelector(".section__head");
    if (head) head.setAttribute("aria-expanded", String(open));
  }

  function persist(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  function persistUI() {
    localStorage.setItem(UI_KEY, JSON.stringify(ui));
  }

  function isDone(id) {
    return !!state[id];
  }

  function toggle(id) {
    state[id] = !state[id];
    persist(state);
    // In the "all" filter, nothing needs to enter/leave the list, so patch
    // just the touched card and counters for a smooth, targeted animation.
    // Any other filter can change which items are visible, so rebuild.
    if (filter === "all") {
      updateItemUI(id);
      updateProgressUI();
    } else {
      renderAll();
    }
  }

  // ---------- date / progress math ----------

  function daysBetween(a, b) {
    return Math.round((b - a) / 86400000);
  }

  function timeStatus() {
    const now = new Date();
    const start = new Date(TRIP_START + "T00:00:00");
    const end = new Date(TRIP_END + "T00:00:00");

    if (now < start) {
      const d = daysBetween(now, start);
      return `${d} day${d === 1 ? "" : "s"} until this window opens`;
    }
    if (now > end) {
      return "The Sept 2026 → June 2027 window has closed";
    }
    const total = daysBetween(start, end);
    const elapsed = daysBetween(start, now);
    const remaining = daysBetween(now, end);
    const pct = Math.round((elapsed / total) * 100);
    return `${pct}% through the window · ${remaining} day${remaining === 1 ? "" : "s"} left`;
  }

  // ---------- rendering ----------

  function iconMarkup(key, svgClass) {
    return `<svg class="${svgClass || "section__icon-svg"}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[key] || ICONS.compass}</svg>`;
  }

  function itemMatchesFilter(item) {
    if (filter === "todo") return !isDone(item.id);
    if (filter === "done") return isDone(item.id);
    return true;
  }

  function tagLabel(tag) {
    const labels = {
      "time-sensitive": "Time-sensitive",
      reservation: "Reservation needed",
      permit: "Permit needed",
      repeat: "Worth repeating",
      annual: "Annual event",
      stretch: "Peaks after June",
    };
    return labels[tag] || tag;
  }

  function googleSearchUrl(item) {
    return `https://www.google.com/search?q=${encodeURIComponent(`${item.title} Utah`)}`;
  }

  function renderItem(item) {
    const done = isDone(item.id);
    const tags = (item.tags || [])
      .map((t) => `<span class="tag tag--${t}">${tagLabel(t)}</span>`)
      .join("");

    return `
      <li>
        <div class="card ${done ? "is-done" : ""}">
          <button class="card__toggle" data-id="${item.id}" aria-pressed="${done}">
            <span class="card__stamp" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 12.5l5 5L20 6" />
              </svg>
            </span>
            <span class="card__body">
              <span class="card__title">${item.title}</span>
              ${item.meta ? `<span class="card__meta">${item.meta}</span>` : ""}
              <span class="card__blurb">${item.blurb}</span>
              ${tags ? `<span class="card__tags">${tags}</span>` : ""}
            </span>
          </button>
          <a class="card__search" href="${googleSearchUrl(item)}" target="_blank" rel="noopener noreferrer" aria-label="Search Google for ${item.title}" title="Search Google for ${item.title}">
            ${iconMarkup("search", "card__search-icon")}
          </a>
        </div>
      </li>`;
  }

  function renderSection(section) {
    const items = ITEMS.filter((i) => i.section === section.key);
    const visible = items.filter(itemMatchesFilter);
    if (visible.length === 0) return "";

    const doneCount = items.filter((i) => isDone(i.id)).length;
    const open = isSectionOpen(section.key);

    return `
      <div class="section section--${section.theme} ${open ? "is-open" : ""}" id="section-${section.key}" data-section="${section.key}">
        <button type="button" class="section__head" data-toggle="${section.key}" aria-expanded="${open}" aria-controls="section-body-${section.key}">
          <span class="section__icon">${iconMarkup(section.icon)}</span>
          <span class="section__headtext">
            <span class="section__label">${section.label}</span>
            <span class="section__dates">${section.dates}</span>
          </span>
          <span class="section__count">${doneCount}/${items.length}</span>
          <svg class="section__chevron" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
        <div class="section__collapse" id="section-body-${section.key}">
          <div class="section__collapse-inner">
            <p class="section__intro">${section.intro}</p>
            <ul class="card-list">
              ${visible.map(renderItem).join("")}
            </ul>
          </div>
        </div>
      </div>`;
  }

  function updateProgressUI() {
    const total = ITEMS.length;
    const done = ITEMS.filter((i) => isDone(i.id)).length;
    const pct = total ? Math.round((done / total) * 100) : 0;

    document.getElementById("bar-fill").style.transform = `scaleX(${pct / 100})`;
    document.getElementById("stat-pct").textContent = `${pct}%`;
    document.getElementById("stat-count").textContent = `${done} of ${total} places checked off`;
    document.getElementById("stat-time").textContent = timeStatus();
  }

  // Patch a single card in place (no full rebuild) so the checkmark and
  // card tint can transition smoothly instead of popping via innerHTML reset.
  function updateItemUI(id) {
    const btn = document.querySelector(`.card__toggle[data-id="${id}"]`);
    if (!btn) return;
    const done = isDone(id);
    btn.closest(".card").classList.toggle("is-done", done);
    btn.setAttribute("aria-pressed", String(done));
    // Feedback lives entirely in the checkbox's own transition (fill +
    // check draw) — no extra card-level animation. Checking things off is a
    // tens-of-times-a-day action, so per the animate skill it should stay
    // near-imperceptible rather than adding a second flourish on top.

    const item = ITEMS.find((i) => i.id === id);
    const sectionEl = document.getElementById(`section-${item.section}`);
    if (sectionEl) {
      const items = ITEMS.filter((i) => i.section === item.section);
      const doneCount = items.filter((i) => isDone(i.id)).length;
      const countEl = sectionEl.querySelector(".section__count");
      if (countEl) countEl.textContent = `${doneCount}/${items.length}`;
    }
  }

  function renderList() {
    const html = SECTIONS.map(renderSection).join("");
    const container = document.getElementById("sections");
    container.innerHTML = html || `<p class="empty-state">Nothing matches this filter yet.</p>`;

    // wire up card toggles
    container.querySelectorAll(".card__toggle").forEach((btn) => {
      btn.addEventListener("click", () => toggle(btn.dataset.id));
    });

    // wire up section accordions
    container.querySelectorAll(".section__head[data-toggle]").forEach((head) => {
      head.addEventListener("click", () => {
        const key = head.dataset.toggle;
        setSectionOpen(key, !isSectionOpen(key));
      });
    });
  }

  function renderAll() {
    renderList();
    updateProgressUI();
  }

  // ---------- filter bar ----------

  function wireFilters() {
    const bar = document.getElementById("filterbar");
    bar.querySelectorAll(".chip[data-filter]").forEach((chip) => {
      chip.addEventListener("click", () => {
        filter = chip.dataset.filter;
        bar
          .querySelectorAll(".chip[data-filter]")
          .forEach((c) => c.classList.toggle("is-active", c === chip));
        renderAll();
      });
    });

    document.getElementById("jump-now").addEventListener("click", () => {
      setSectionOpen("now", true);
      const el = document.getElementById("section-now");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // ---------- reset ----------

  function showToast(msg) {
    const toast = document.getElementById("toast");
    toast.textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove("is-visible"), 2400);
  }

  function wireReset() {
    document.getElementById("reset-btn").addEventListener("click", () => {
      const ok = window.confirm(
        "Reset all progress on this device? This clears every checkmark, including the places already marked done."
      );
      if (!ok) return;
      Object.keys(state).forEach((k) => delete state[k]);
      ITEMS.forEach((item) => {
        state[item.id] = false;
      });
      persist(state);
      showToast("Progress reset");
      renderAll();
    });
  }

  // ---------- service worker ----------
  // Registers sw.js, whose only job is to keep the "Add to Home Screen"
  // install from ever showing stale code — see sw.js for why. Relative
  // path so the scope resolves correctly whether this lives at a
  // domain root or a GitHub Pages subpath.

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => {
        /* Non-fatal — the site works fine without it, just without the
           extra freshness guarantee. */
      });
    });
  }

  // ---------- go ----------

  wireFilters();
  wireReset();
  renderAll();
})();
