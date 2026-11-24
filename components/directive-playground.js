const LABELS = {
  tabListAria: "指令示例",
  rawTitle: "模型实际写的",
  viewTitle: "你看到的",
  userRole: "用户",
  botRole: "助手",
  reset: "重来",
  start: "开始",
  pause: "暂停",
  done: "到点了",
  remainPrefix: "剩 ",
  remainUnit: " 分钟",
  unitShort: "分",
  printBtn: "模拟出纸",
  nightLabel: "现在是夜里",
  nightMsg: "夜里不出纸，先揣着，早上再打",
  countPrefix: "今天第 ",
  countSep: " / ",
  countSuffix: " 张",
  limitPrefix: "今天的 ",
  limitSuffix: " 张用完了",
  paperTag: "标签纸"
};

const DIRECTIVE_RE = /\[(选项|指令|打印):([^\]]+)\]/;
const DURATION_RE = /(\d+)\s*分钟/;
const SVG_NS = "http://www.w3.org/2000/svg";
const RING_RADIUS = 33;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function makeSvgIcon(name, className) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 20 20");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", className);

  const paths = {
    options: ["M4 6h12", "M4 10h9", "M4 14h6", "M14 13l1.5 1.5L18 11.5"],
    timer: ["M10 4.5a6.5 6.5 0 1 0 6.5 6.5A6.5 6.5 0 0 0 10 4.5Z", "M10 8v3.2l2.2 1.3", "M8 2.5h4"],
    print: ["M6 7V3.5h8V7", "M5 7h10a2 2 0 0 1 2 2v4h-3v-2H6v2H3V9a2 2 0 0 1 2-2Z", "M6 12h8v4.5H6Z"],
    not: ["M7 5L3.5 10 7 15", "M13 5l3.5 5-3.5 5", "M11.5 4.5l-3 11"],
    raw: ["M4 6h12", "M4 10h8", "M4 14h10"],
    chat: ["M4 5.5A2.5 2.5 0 0 1 6.5 3h7A2.5 2.5 0 0 1 16 5.5v5A2.5 2.5 0 0 1 13.5 13H9l-3.5 3v-3H6.5A2.5 2.5 0 0 1 4 10.5Z"]
  };

  for (const d of paths[name] || paths.raw) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

function parseDirective(raw) {
  const match = DIRECTIVE_RE.exec(raw);
  if (!match) {
    return { triggered: false, ignoredMatch: null, cleanText: raw, directive: null };
  }

  const [full, kind, payload] = match;
  if (kind === "打印" && payload.replace(/\s+/g, "") === "正文") {
    return {
      triggered: false,
      ignoredMatch: { full, index: match.index },
      cleanText: raw,
      directive: null
    };
  }

  let directive = null;
  if (kind === "选项") {
    const items = payload.split("|").map((s) => s.trim()).filter(Boolean);
    directive = { kind: "options", items };
  } else if (kind === "指令") {
    const [titlePart = "", durPart = ""] = payload.split("|");
    const durMatch = DURATION_RE.exec(durPart);
    const minutes = durMatch ? Number(durMatch[1]) : 1;
    directive = { kind: "timer", title: titlePart.trim(), minutes };
  } else if (kind === "打印") {
    directive = { kind: "print", text: payload.trim() };
  }

  const before = raw.slice(0, match.index);
  const after = raw.slice(match.index + full.length);
  const cleanText = (before + after).replace(/\n{2,}/g, "\n").trim();

  return {
    triggered: Boolean(directive),
    matchInfo: { full, index: match.index },
    ignoredMatch: null,
    cleanText,
    directive
  };
}

function makeBubble(role, text, extraClass = "") {
  const wrap = document.createElement("div");
  wrap.className = `dp-bubble-row dp-bubble-row--${role}`;

  const bubble = document.createElement("div");
  bubble.className = `dp-bubble dp-bubble--${role}${extraClass ? " " + extraClass : ""}`;

  const sr = document.createElement("span");
  sr.className = "sr-only";
  sr.textContent = role === "user" ? `${LABELS.userRole}：` : `${LABELS.botRole}：`;

  const body = document.createElement("span");
  body.textContent = text;

  bubble.append(sr, body);
  wrap.append(bubble);
  return wrap;
}

export function mount(el, items) {
  if (!el || !Array.isArray(items) || items.length === 0) return;

  let activeIndex = 0;
  let timerHandle = null;

  const stopTimer = () => {
    if (timerHandle !== null) {
      clearInterval(timerHandle);
      timerHandle = null;
    }
  };

  el.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "dp-shell";

  const tablist = document.createElement("div");
  tablist.className = "dp-tabs";
  tablist.setAttribute("role", "tablist");
  tablist.setAttribute("aria-label", LABELS.tabListAria);

  const stage = document.createElement("div");
  stage.className = "dp-stage";
  stage.setAttribute("role", "tabpanel");

  const noteEl = document.createElement("p");
  noteEl.className = "dp-note";

  const tabButtons = items.map((item, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "dp-tab";
    btn.setAttribute("role", "tab");
    btn.id = `dp-tab-${item.id}`;
    btn.setAttribute("aria-selected", String(idx === 0));
    btn.tabIndex = idx === 0 ? 0 : -1;

    btn.append(makeSvgIcon(item.id, "dp-tab-icon"));
    const span = document.createElement("span");
    span.textContent = item.tab;
    btn.append(span);

    btn.addEventListener("click", () => selectTab(idx));
    btn.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        selectTab((idx + 1) % items.length, true);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        selectTab((idx - 1 + items.length) % items.length, true);
      } else if (event.key === "Home") {
        event.preventDefault();
        selectTab(0, true);
      } else if (event.key === "End") {
        event.preventDefault();
        selectTab(items.length - 1, true);
      }
    });

    tablist.append(btn);
    return btn;
  });

  shell.append(tablist, stage, noteEl);
  el.append(shell);

  function renderRawPane(item, parsed) {
    const pane = document.createElement("div");
    pane.className = "dp-pane dp-pane--raw";

    const head = document.createElement("div");
    head.className = "dp-pane-head";
    head.append(makeSvgIcon("raw", "dp-pane-icon"));
    const title = document.createElement("span");
    title.textContent = LABELS.rawTitle;
    head.append(title);

    const body = document.createElement("div");
    body.className = "dp-raw-body";

    const pre = document.createElement("pre");
    pre.className = "dp-raw-code";
    const code = document.createElement("code");

    const raw = item.raw;
    if (parsed.triggered && parsed.matchInfo) {
      const { full, index } = parsed.matchInfo;
      code.append(document.createTextNode(raw.slice(0, index)));
      const mark = document.createElement("mark");
      mark.className = "dp-raw-mark";
      mark.textContent = full;
      code.append(mark);
      code.append(document.createTextNode(raw.slice(index + full.length)));
    } else if (parsed.ignoredMatch) {
      const { full, index } = parsed.ignoredMatch;
      code.append(document.createTextNode(raw.slice(0, index)));
      const span = document.createElement("span");
      span.className = "dp-raw-ignored";
      span.textContent = full;
      code.append(span);
      code.append(document.createTextNode(raw.slice(index + full.length)));
    } else {
      code.textContent = raw;
    }

    pre.append(code);
    body.append(pre);
    pane.append(head, body);
    return pane;
  }

  function buildOptionsCard(directive, chatBody) {
    const card = document.createElement("div");
    card.className = "dp-card dp-card--options";

    const list = document.createElement("div");
    list.className = "dp-options-list";

    let replyBubble = null;
    const buttons = [];

    const footer = document.createElement("div");
    footer.className = "dp-card-footer";
    footer.hidden = true;

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "dp-btn dp-btn--ghost";
    resetBtn.textContent = LABELS.reset;
    resetBtn.addEventListener("click", () => {
      if (replyBubble) {
        replyBubble.remove();
        replyBubble = null;
      }
      for (const b of buttons) {
        b.disabled = false;
        b.classList.remove("dp-opt-btn--picked");
      }
      footer.hidden = true;
      buttons[0]?.focus();
    });
    footer.append(resetBtn);

    for (const optionText of directive.items) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dp-opt-btn";
      btn.textContent = optionText;
      btn.addEventListener("click", () => {
        if (replyBubble) return;
        for (const b of buttons) {
          b.disabled = true;
        }
        btn.classList.add("dp-opt-btn--picked");
        replyBubble = makeBubble("user", optionText, "dp-bubble--reply");
        chatBody.append(replyBubble);
        footer.hidden = false;
        resetBtn.focus();
      });
      buttons.push(btn);
      list.append(btn);
    }

    card.append(list, footer);
    return card;
  }

  function buildTimerCard(directive) {
    const total = Math.max(1, directive.minutes);
    let remaining = total;
    let running = false;

    const card = document.createElement("div");
    card.className = "dp-card dp-card--timer";

    const layout = document.createElement("div");
    layout.className = "dp-timer-layout";

    const ringWrap = document.createElement("div");
    ringWrap.className = "dp-timer-ring-wrap";

    const svg = document.createElementNS(SVG_NS, "svg");
    svg.setAttribute("viewBox", "0 0 78 78");
    svg.setAttribute("class", "dp-timer-svg");
    svg.setAttribute("aria-hidden", "true");

    const track = document.createElementNS(SVG_NS, "circle");
    track.setAttribute("cx", "39");
    track.setAttribute("cy", "39");
    track.setAttribute("r", String(RING_RADIUS));
    track.setAttribute("class", "dp-timer-track");

    const progress = document.createElementNS(SVG_NS, "circle");
    progress.setAttribute("cx", "39");
    progress.setAttribute("cy", "39");
    progress.setAttribute("r", String(RING_RADIUS));
    progress.setAttribute("class", "dp-timer-progress");
    progress.setAttribute("stroke-dasharray", String(RING_CIRCUMFERENCE));

    svg.append(track, progress);

    const center = document.createElement("div");
    center.className = "dp-timer-center";
    const numEl = document.createElement("span");
    numEl.className = "dp-timer-num";
    const unitEl = document.createElement("span");
    unitEl.className = "dp-timer-unit";
    unitEl.textContent = LABELS.unitShort;
    center.append(numEl, unitEl);

    ringWrap.append(svg, center);

    const info = document.createElement("div");
    info.className = "dp-timer-info";

    const titleEl = document.createElement("p");
    titleEl.className = "dp-timer-title";
    titleEl.textContent = directive.title;

    const statusEl = document.createElement("p");
    statusEl.className = "dp-timer-status";
    statusEl.setAttribute("role", "status");
    statusEl.setAttribute("aria-live", "polite");

    const actions = document.createElement("div");
    actions.className = "dp-timer-actions";

    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.className = "dp-btn dp-btn--primary";

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "dp-btn dp-btn--ghost";
    resetBtn.textContent = LABELS.reset;

    function syncUI() {
      const ratio = remaining / total;
      const offset = RING_CIRCUMFERENCE * (1 - ratio);
      progress.setAttribute("stroke-dashoffset", offset.toFixed(2));
      numEl.textContent = String(remaining);

      if (remaining <= 0) {
        const wasOnToggle = document.activeElement === toggleBtn;
        statusEl.textContent = LABELS.done;
        statusEl.classList.add("dp-timer-status--done");
        toggleBtn.textContent = LABELS.start;
        toggleBtn.disabled = true;
        if (wasOnToggle) resetBtn.focus();
      } else {
        statusEl.textContent = `${LABELS.remainPrefix}${remaining}${LABELS.remainUnit}`;
        statusEl.classList.remove("dp-timer-status--done");
        toggleBtn.textContent = running ? LABELS.pause : LABELS.start;
        toggleBtn.disabled = false;
      }
    }

    toggleBtn.addEventListener("click", () => {
      if (remaining <= 0) return;
      if (running) {
        running = false;
        stopTimer();
        syncUI();
      } else {
        running = true;
        syncUI();
        timerHandle = setInterval(() => {
          remaining = Math.max(0, remaining - 1);
          if (remaining === 0) {
            running = false;
            stopTimer();
          }
          syncUI();
        }, 1000);
      }
    });

    resetBtn.addEventListener("click", () => {
      running = false;
      stopTimer();
      remaining = total;
      syncUI();
    });

    actions.append(toggleBtn, resetBtn);
    info.append(titleEl, statusEl, actions);
    layout.append(ringWrap, info);
    card.append(layout);
    syncUI();
    return card;
  }

  function buildPrintCard(directive, limitPerDay) {
    const limit = Number(limitPerDay) || 7;
    let printedCount = 0;
    let isNight = false;

    const wrap = document.createElement("div");
    wrap.className = "dp-print-wrap";

    const paperStage = document.createElement("div");
    paperStage.className = "dp-paper-stage";

    const card = document.createElement("div");
    card.className = "dp-card dp-printer-card";

    const slit = document.createElement("div");
    slit.className = "dp-printer-slit";
    slit.setAttribute("aria-hidden", "true");

    const top = document.createElement("div");
    top.className = "dp-printer-top";

    const preview = document.createElement("p");
    preview.className = "dp-printer-preview";
    preview.textContent = directive.text;

    const counter = document.createElement("span");
    counter.className = "dp-printer-counter";

    top.append(preview, counter);

    const controls = document.createElement("div");
    controls.className = "dp-printer-controls";

    const printBtn = document.createElement("button");
    printBtn.type = "button";
    printBtn.className = "dp-btn dp-btn--primary";
    printBtn.textContent = LABELS.printBtn;

    const nightSwitch = document.createElement("button");
    nightSwitch.type = "button";
    nightSwitch.className = "dp-switch";
    nightSwitch.setAttribute("role", "switch");
    nightSwitch.setAttribute("aria-checked", "false");

    const switchTrack = document.createElement("span");
    switchTrack.className = "dp-switch-track";
    switchTrack.setAttribute("aria-hidden", "true");
    const switchThumb = document.createElement("span");
    switchThumb.className = "dp-switch-thumb";
    switchTrack.append(switchThumb);

    const switchText = document.createElement("span");
    switchText.textContent = LABELS.nightLabel;
    nightSwitch.append(switchTrack, switchText);

    const resetBtn = document.createElement("button");
    resetBtn.type = "button";
    resetBtn.className = "dp-btn dp-btn--ghost";
    resetBtn.textContent = LABELS.reset;
    resetBtn.hidden = true;

    const notice = document.createElement("p");
    notice.className = "dp-notice";
    notice.setAttribute("role", "status");
    notice.setAttribute("aria-live", "polite");
    notice.hidden = true;

    function updateCounter() {
      counter.textContent = `${LABELS.countPrefix}${printedCount}${LABELS.countSep}${limit}${LABELS.countSuffix}`;
      resetBtn.hidden = printedCount === 0 && !isNight && notice.hidden;
    }

    function showNotice(text) {
      notice.textContent = text;
      notice.hidden = false;
      updateCounter();
    }

    function clearNotice() {
      notice.textContent = "";
      notice.hidden = true;
    }

    function ejectPaper(seq) {
      paperStage.innerHTML = "";
      paperStage.classList.add("dp-paper-stage--has-paper");

      const paper = document.createElement("div");
      paper.className = "dp-paper";

      const meta = document.createElement("div");
      meta.className = "dp-paper-meta";
      const tag = document.createElement("span");
      tag.textContent = LABELS.paperTag;
      const num = document.createElement("span");
      num.textContent = `#${seq} / ${limit}`;
      meta.append(tag, num);

      const text = document.createElement("p");
      text.className = "dp-paper-text";
      text.textContent = directive.text;

      paper.append(meta, text);
      paperStage.append(paper);
    }

    printBtn.addEventListener("click", () => {
      if (isNight) {
        showNotice(LABELS.nightMsg);
        return;
      }
      if (printedCount >= limit) {
        showNotice(`${LABELS.limitPrefix}${limit}${LABELS.limitSuffix}`);
        return;
      }
      clearNotice();
      printedCount += 1;
      ejectPaper(printedCount);
      updateCounter();
    });

    nightSwitch.addEventListener("click", () => {
      isNight = !isNight;
      nightSwitch.setAttribute("aria-checked", String(isNight));
      clearNotice();
      updateCounter();
    });

    resetBtn.addEventListener("click", () => {
      printedCount = 0;
      isNight = false;
      nightSwitch.setAttribute("aria-checked", "false");
      paperStage.innerHTML = "";
      paperStage.classList.remove("dp-paper-stage--has-paper");
      clearNotice();
      updateCounter();
      printBtn.focus();
    });

    controls.append(printBtn, nightSwitch, resetBtn);
    card.append(slit, top, controls, notice);
    wrap.append(paperStage, card);
    updateCounter();
    return wrap;
  }

  function renderChatPane(item, parsed) {
    const pane = document.createElement("div");
    pane.className = "dp-pane dp-pane--chat";

    const head = document.createElement("div");
    head.className = "dp-pane-head";
    head.append(makeSvgIcon("chat", "dp-pane-icon"));
    const title = document.createElement("span");
    title.textContent = LABELS.viewTitle;
    head.append(title);

    const chatBody = document.createElement("div");
    chatBody.className = "dp-chat-body";

    chatBody.append(makeBubble("user", item.user));

    const botRow = makeBubble("bot", parsed.cleanText);
    if (parsed.triggered && parsed.directive) {
      if (parsed.directive.kind === "options") {
        botRow.append(buildOptionsCard(parsed.directive, chatBody));
      } else if (parsed.directive.kind === "timer") {
        botRow.append(buildTimerCard(parsed.directive));
      } else if (parsed.directive.kind === "print") {
        botRow.append(buildPrintCard(parsed.directive, item.limitPerDay));
      }
    }
    chatBody.append(botRow);

    pane.append(head, chatBody);
    return pane;
  }

  function selectTab(index, moveFocus = false) {
    stopTimer();
    activeIndex = index;
    const item = items[activeIndex];
    const parsed = parseDirective(item.raw);

    tabButtons.forEach((btn, idx) => {
      const selected = idx === activeIndex;
      btn.setAttribute("aria-selected", String(selected));
      btn.tabIndex = selected ? 0 : -1;
    });
    if (moveFocus) {
      tabButtons[activeIndex].focus();
    }

    stage.setAttribute("aria-labelledby", tabButtons[activeIndex].id);
    stage.innerHTML = "";
    stage.append(renderRawPane(item, parsed), renderChatPane(item, parsed));
    noteEl.textContent = item.note || "";
  }

  selectTab(0);
}
