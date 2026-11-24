const LABELS = {
  stepNavAria: "记忆流程",
  steps: ["① 对话", "② 自动总结", "③ 记忆条目", "④ 召回", "⑤ 遗忘与蒸馏"],
  weightPrefix: "重要度 ",
  questionLabel: "问",
  bucketTag: "示意",
  pickedTag: "命中",
  decayTitle: "遗忘曲线",
  decayAxisX: "时间",
  decayAxisY: "留存",
  decayNormal: "自然下降",
  decayRebound: "再次提起",
  distillTitle: "月度蒸馏",
  distillSteps: ["预演", "负责人确认", "写入"],
  distillTag: "可撤回",
  bugBefore: "修之前",
  bugAfter: "修之后",
  bugPicked: "取中的记忆",
  bugAnswer: "助手回答",
  bugCause: "原因",
  bugFixTitle: "改了什么",
  bugFixEmpty: "这一条待补充",
  bugToggleAria: "排查对比"
};

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) {
    node.setAttribute(k, String(v));
  }
  return node;
}

function makeChevron() {
  const svg = svgEl("svg", {
    viewBox: "0 0 20 20",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    class: "ml-bug-chevron",
    "aria-hidden": "true"
  });
  svg.append(svgEl("path", { d: "M5 7.5L10 12.5L15 7.5" }));
  return svg;
}

function makeMemoryCard(mem, highlighted = false) {
  const card = document.createElement("article");
  card.className = highlighted ? "ml-mem-card ml-mem-card--picked" : "ml-mem-card";

  const meta = document.createElement("div");
  meta.className = "ml-mem-meta";

  const typeBadge = document.createElement("span");
  typeBadge.className = "ml-badge ml-badge--accent";
  typeBadge.textContent = mem.type || "";

  const weightBadge = document.createElement("span");
  weightBadge.className = "ml-badge";
  weightBadge.textContent = `${LABELS.weightPrefix}${mem.weight || ""}`;

  meta.append(typeBadge, weightBadge);

  if (highlighted) {
    const hit = document.createElement("span");
    hit.className = "ml-badge ml-badge--accent";
    hit.textContent = LABELS.pickedTag;
    meta.append(hit);
  }

  const dateEl = document.createElement("span");
  dateEl.className = "ml-mem-date";
  dateEl.textContent = mem.date || "";
  meta.append(dateEl);

  const text = document.createElement("p");
  text.className = "ml-mem-text";
  text.textContent = mem.text || "";

  card.append(meta, text);
  return card;
}

function buildDecaySvg() {
  const svg = svgEl("svg", {
    viewBox: "0 0 300 150",
    class: "ml-decay-svg",
    role: "img",
    "aria-label": LABELS.decayTitle
  });

  // Axes
  svg.append(
    svgEl("line", { x1: 34, y1: 16, x2: 34, y2: 122, stroke: "var(--border-strong)", "stroke-width": 1.5 }),
    svgEl("line", { x1: 34, y1: 122, x2: 284, y2: 122, stroke: "var(--border-strong)", "stroke-width": 1.5 })
  );

  // Subtle horizontal guides
  for (const y of [40, 80]) {
    svg.append(
      svgEl("line", {
        x1: 34,
        y1: y,
        x2: 284,
        y2: y,
        stroke: "var(--border)",
        "stroke-dasharray": "3 3",
        "stroke-width": 1
      })
    );
  }

  // Normal decay path
  svg.append(
    svgEl("path", {
      d: "M 38 30 Q 110 86 276 114",
      fill: "none",
      stroke: "var(--border-strong)",
      "stroke-width": 2.4,
      "stroke-dasharray": "5 4"
    })
  );

  // Recalled rebound path
  svg.append(
    svgEl("path", {
      d: "M 38 30 Q 86 68 128 84 L 146 38 Q 204 58 276 74",
      fill: "none",
      stroke: "var(--accent-bright)",
      "stroke-width": 3,
      "stroke-linecap": "round",
      "stroke-linejoin": "round"
    })
  );

  // Rebound point dot
  svg.append(
    svgEl("circle", { cx: 146, cy: 38, r: 4.5, fill: "var(--accent)" })
  );

  const labelY = svgEl("text", { x: 8, y: 24, fill: "var(--ink-3)", "font-size": 11 });
  labelY.textContent = LABELS.decayAxisY;
  const labelX = svgEl("text", { x: 256, y: 138, fill: "var(--ink-3)", "font-size": 11 });
  labelX.textContent = LABELS.decayAxisX;

  const legendRecall = svgEl("text", { x: 156, y: 34, fill: "var(--accent)", "font-size": 11.5, "font-weight": 700 });
  legendRecall.textContent = LABELS.decayRebound;

  const legendNormal = svgEl("text", { x: 204, y: 106, fill: "var(--ink-3)", "font-size": 11 });
  legendNormal.textContent = LABELS.decayNormal;

  svg.append(labelY, labelX, legendRecall, legendNormal);
  return svg;
}

export function mount(el, data) {
  if (!el || !data) return;

  const memoryChat = Array.isArray(data.memoryChat) ? data.memoryChat : [];
  const memories = Array.isArray(data.memories) ? data.memories : [];
  const recall = data.recall || {};
  const extra = data.extra || {};

  const memById = new Map(memories.map((m) => [m.id, m]));

  let activeStep = 0;
  let bugOpen = false;
  let bugMode = "before";

  el.innerHTML = "";
  const container = document.createElement("div");
  container.className = "ml-shell";

  // Top 5-station tool card
  const mainShell = document.createElement("div");
  mainShell.className = "tool-shell";

  const stepper = document.createElement("div");
  stepper.className = "ml-stepper";
  stepper.setAttribute("role", "tablist");
  stepper.setAttribute("aria-label", LABELS.stepNavAria);

  const panel = document.createElement("div");
  panel.className = "ml-panel";
  panel.setAttribute("role", "tabpanel");

  const stepButtons = LABELS.steps.map((label, idx) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "ml-step-btn";
    btn.setAttribute("role", "tab");
    btn.id = `ml-step-${idx}`;
    btn.textContent = label;
    btn.addEventListener("click", () => selectStep(idx));
    btn.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        selectStep((idx + 1) % LABELS.steps.length, true);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        selectStep((idx - 1 + LABELS.steps.length) % LABELS.steps.length, true);
      }
    });
    stepper.append(btn);
    return btn;
  });

  mainShell.append(stepper, panel);

  function renderStepPanel() {
    panel.innerHTML = "";
    panel.setAttribute("aria-labelledby", stepButtons[activeStep].id);

    if (activeStep === 0) {
      const chat = document.createElement("div");
      chat.className = "ml-chat";
      for (const turn of memoryChat) {
        const isUser = turn.who === "用户";
        const row = document.createElement("div");
        row.className = `dp-bubble-row ${isUser ? "dp-bubble-row--user" : "dp-bubble-row--bot"}`;
        const bubble = document.createElement("div");
        bubble.className = `dp-bubble ${isUser ? "dp-bubble--user" : "dp-bubble--bot"}`;
        const sr = document.createElement("span");
        sr.className = "sr-only";
        sr.textContent = `${turn.who}：`;
        const body = document.createElement("span");
        body.textContent = turn.text || "";
        bubble.append(sr, body);
        row.append(bubble);
        chat.append(row);
      }
      panel.append(chat);
      return;
    }

    if (activeStep === 1) {
      if (extra.step2) {
        const note = document.createElement("p");
        note.className = "ml-step2-note";
        note.textContent = extra.step2;
        panel.append(note);
      }
      const generated = [];
      if (memById.has("m4")) generated.push(memById.get("m4"));
      if (memById.has("m5")) generated.push(memById.get("m5"));
      const list = generated.length > 0 ? generated : memories.slice(0, 2);

      const grid = document.createElement("div");
      grid.className = "ml-mem-grid";
      for (const mem of list) {
        grid.append(makeMemoryCard(mem, true));
      }
      panel.append(grid);
      return;
    }

    if (activeStep === 2) {
      const grid = document.createElement("div");
      grid.className = "ml-mem-grid";
      for (const mem of memories) {
        grid.append(makeMemoryCard(mem, false));
      }
      panel.append(grid);
      return;
    }

    if (activeStep === 3) {
      if (recall.question) {
        const q = document.createElement("div");
        q.className = "ml-query";
        const tag = document.createElement("span");
        tag.className = "ml-badge ml-badge--accent";
        tag.textContent = LABELS.questionLabel;
        const txt = document.createElement("span");
        txt.textContent = recall.question;
        q.append(tag, txt);
        panel.append(q);
      }

      const bucketsWrap = document.createElement("div");
      bucketsWrap.className = "ml-buckets";
      const buckets = Array.isArray(recall.buckets) ? recall.buckets : [];
      for (const bucket of buckets) {
        const box = document.createElement("div");
        box.className = "ml-bucket";

        const head = document.createElement("div");
        head.className = "ml-bucket-head";
        const name = document.createElement("h4");
        name.className = "ml-bucket-name";
        name.textContent = bucket.name || "";
        const tag = document.createElement("span");
        tag.className = "ml-badge";
        tag.textContent = LABELS.bucketTag;
        head.append(name, tag);

        const list = document.createElement("div");
        list.className = "ml-bucket-list";
        const ids = Array.isArray(bucket.ids) ? bucket.ids : [];
        for (const id of ids) {
          const mem = memById.get(id);
          if (mem) list.append(makeMemoryCard(mem, true));
        }

        box.append(head, list);
        bucketsWrap.append(box);
      }
      panel.append(bucketsWrap);
      return;
    }

    // Step 5: Forgetting curve + Monthly distillation
    const stage5 = document.createElement("div");
    stage5.className = "ml-stage5-grid";

    const decayBox = document.createElement("div");
    decayBox.className = "ml-mini-box";
    const decayHead = document.createElement("div");
    decayHead.className = "ml-mini-head";
    const decayTitle = document.createElement("h4");
    decayTitle.className = "ml-mini-title";
    decayTitle.textContent = LABELS.decayTitle;
    decayHead.append(decayTitle);
    decayBox.append(decayHead, buildDecaySvg());

    const distillBox = document.createElement("div");
    distillBox.className = "ml-mini-box";
    const distillHead = document.createElement("div");
    distillHead.className = "ml-mini-head";
    const distillTitle = document.createElement("h4");
    distillTitle.className = "ml-mini-title";
    distillTitle.textContent = LABELS.distillTitle;
    const revBadge = document.createElement("span");
    revBadge.className = "ml-badge ml-badge--accent";
    revBadge.textContent = LABELS.distillTag;
    distillHead.append(distillTitle, revBadge);

    const ol = document.createElement("ol");
    ol.className = "ml-distill-steps";
    LABELS.distillSteps.forEach((stepText, idx) => {
      const li = document.createElement("li");
      li.className = "ml-distill-item";
      const num = document.createElement("span");
      num.className = "ml-distill-num";
      num.textContent = String(idx + 1);
      const txt = document.createElement("span");
      txt.textContent = stepText;
      li.append(num, txt);
      ol.append(li);
    });
    distillBox.append(distillHead, ol);

    stage5.append(decayBox, distillBox);
    panel.append(stage5);
  }

  function selectStep(idx, moveFocus = false) {
    activeStep = idx;
    stepButtons.forEach((btn, i) => {
      const selected = i === activeStep;
      btn.setAttribute("aria-selected", String(selected));
      btn.tabIndex = selected ? 0 : -1;
    });
    if (moveFocus) {
      stepButtons[activeStep].focus();
    }
    renderStepPanel();
  }

  // Collapsible Bug Story Card
  const bugCard = document.createElement("div");
  bugCard.className = "ml-bug-card";

  const bugTrigger = document.createElement("button");
  bugTrigger.type = "button";
  bugTrigger.className = "ml-bug-trigger";
  bugTrigger.setAttribute("aria-expanded", "false");
  const bugTitleSpan = document.createElement("span");
  bugTitleSpan.textContent = extra.bugTitle || "";
  bugTrigger.append(bugTitleSpan, makeChevron());

  const bugBody = document.createElement("div");
  bugBody.className = "ml-bug-body";
  bugBody.hidden = true;

  const bugControls = document.createElement("div");
  bugControls.className = "ml-bug-controls";
  bugControls.setAttribute("role", "group");
  bugControls.setAttribute("aria-label", LABELS.bugToggleAria);

  const beforeBugBtn = document.createElement("button");
  beforeBugBtn.type = "button";
  beforeBugBtn.className = "cs-mode-btn";
  beforeBugBtn.textContent = LABELS.bugBefore;

  const afterBugBtn = document.createElement("button");
  afterBugBtn.type = "button";
  afterBugBtn.className = "cs-mode-btn";
  afterBugBtn.textContent = LABELS.bugAfter;

  bugControls.append(beforeBugBtn, afterBugBtn);

  const bugStage = document.createElement("div");
  bugBody.append(bugControls, bugStage);

  function renderBugStage() {
    beforeBugBtn.setAttribute("aria-pressed", String(bugMode === "before"));
    afterBugBtn.setAttribute("aria-pressed", String(bugMode === "after"));

    const state = bugMode === "before" ? recall.before : recall.after;
    const pickedIds = Array.isArray(state?.picked) ? state.picked : [];
    const beforeSet = new Set(Array.isArray(recall.before?.picked) ? recall.before.picked : []);

    bugStage.innerHTML = "";

    if (recall.question) {
      const q = document.createElement("div");
      q.className = "ml-query";
      const tag = document.createElement("span");
      tag.className = "ml-badge ml-badge--accent";
      tag.textContent = LABELS.questionLabel;
      const txt = document.createElement("span");
      txt.textContent = recall.question;
      q.append(tag, txt);
      bugStage.append(q);
    }

    const ansLabel = document.createElement("p");
    ansLabel.className = "ml-bug-sub";
    ansLabel.textContent = LABELS.bugAnswer;

    const ansBox = document.createElement("div");
    ansBox.className = `ml-bug-answer ${bugMode === "before" ? "ml-bug-answer--before" : "ml-bug-answer--after"}`;
    ansBox.textContent = state?.answer || "";

    const pickLabel = document.createElement("p");
    pickLabel.className = "ml-bug-sub";
    pickLabel.textContent = LABELS.bugPicked;

    const ol = document.createElement("ol");
    ol.className = "ml-bug-picked";
    pickedIds.forEach((id, idx) => {
      const mem = memById.get(id);
      const li = document.createElement("li");
      const isNewTop = bugMode === "after" && !beforeSet.has(id);
      li.className = isNewTop ? "ml-bug-picked-item ml-bug-picked-item--top" : "ml-bug-picked-item";

      const rank = document.createElement("span");
      rank.className = "ml-bug-rank";
      rank.textContent = `#${idx + 1}`;

      const txt = document.createElement("span");
      txt.textContent = mem ? `${mem.text}（${mem.date}）` : id;

      li.append(rank, txt);
      ol.append(li);
    });

    bugStage.append(ansLabel, ansBox, pickLabel, ol);

    if (extra.bugCause) {
      const causeTitle = document.createElement("p");
      causeTitle.className = "ml-bug-sub";
      causeTitle.textContent = LABELS.bugCause;
      const causeText = document.createElement("p");
      causeText.className = "ml-bug-cause";
      causeText.textContent = extra.bugCause;
      bugStage.append(causeTitle, causeText);
    }

    const fixes = Array.isArray(extra.bugFix) ? extra.bugFix : [];
    if (fixes.length > 0) {
      const fixTitle = document.createElement("p");
      fixTitle.className = "ml-bug-sub";
      fixTitle.textContent = LABELS.bugFixTitle;

      const ul = document.createElement("ul");
      ul.className = "ml-bug-fixes";
      for (const fix of fixes) {
        const li = document.createElement("li");
        const val = typeof fix === "string" ? fix.trim() : (fix?.text || "").trim();
        if (val) {
          li.className = "ml-bug-fix-item";
          li.textContent = `· ${val}`;
        } else {
          li.className = "ml-bug-fix-empty";
          li.textContent = LABELS.bugFixEmpty;
        }
        ul.append(li);
      }
      bugStage.append(fixTitle, ul);
    }
  }

  bugTrigger.addEventListener("click", () => {
    bugOpen = !bugOpen;
    bugTrigger.setAttribute("aria-expanded", String(bugOpen));
    bugBody.hidden = !bugOpen;
  });

  beforeBugBtn.addEventListener("click", () => {
    bugMode = "before";
    renderBugStage();
  });

  afterBugBtn.addEventListener("click", () => {
    bugMode = "after";
    renderBugStage();
  });

  bugCard.append(bugTrigger, bugBody);
  container.append(mainShell, bugCard);
  el.append(container);

  selectStep(0);
  renderBugStage();
}
