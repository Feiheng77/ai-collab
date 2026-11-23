const LABELS = {
  boardAria: "任务看板",
  steps: ["派活", "做", "落卡", "验收"],
  scopeLabel: "范围限制",
  changesLabel: "改动清单",
  testsLabel: "测试结果",
  verifyLabel: "验收记录",
  messagesLabel: "留言",
  pipelineTitle: "上线流水线",
  pipelineAria: "上线步骤"
};

export function mount(el, data) {
  if (!el || !data) return;

  const cards = Array.isArray(data.hubCards) ? data.hubCards : [];
  const pipeline = Array.isArray(data.pipeline) ? data.pipeline : [];
  const extra = data.extra || {};

  if (cards.length === 0) return;

  // 按 mode / modeLabel 通用分组列，不写死列名或列数
  const columns = [];
  const colMap = new Map();
  for (const card of cards) {
    const key = card.mode || card.modeLabel || card.id;
    if (!colMap.has(key)) {
      const col = { key, label: card.modeLabel || key, cards: [] };
      colMap.set(key, col);
      columns.push(col);
    }
    colMap.get(key).cards.push(card);
  }

  let activeCardId = cards[0].id;
  let activePipeIdx = 0;

  el.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "tool-shell hc-shell";

  if (extra.counts) {
    const counts = document.createElement("p");
    counts.className = "hc-counts";
    counts.textContent = extra.counts;
    shell.append(counts);
  }

  const board = document.createElement("div");
  board.className = "hc-board";
  board.setAttribute("role", "group");
  board.setAttribute("aria-label", LABELS.boardAria);

  const cardButtons = new Map();
  for (const col of columns) {
    const colEl = document.createElement("div");
    colEl.className = "hc-col";

    const colTitle = document.createElement("h4");
    colTitle.className = "hc-col-title";
    colTitle.textContent = col.label;
    colEl.append(colTitle);

    for (const card of col.cards) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hc-card-btn";

      const title = document.createElement("span");
      title.className = "hc-card-title";
      title.textContent = card.title || "";

      const scope = document.createElement("span");
      scope.className = "hc-card-scope";
      scope.textContent = card.scope || "";

      btn.append(title, scope);
      btn.addEventListener("click", () => {
        activeCardId = card.id;
        syncCard();
      });

      cardButtons.set(card.id, btn);
      colEl.append(btn);
    }

    board.append(colEl);
  }

  const detail = document.createElement("div");
  detail.className = "hc-detail";
  detail.setAttribute("aria-live", "polite");

  const mainRow = document.createElement("div");
  mainRow.className = "hc-main";
  mainRow.append(board, detail);

  shell.append(mainRow);

  // Pipeline strip
  let pipeButtons = [];
  let pipeHint = null;
  if (pipeline.length > 0) {
    const pipeBox = document.createElement("div");
    pipeBox.className = "hc-pipeline-box";

    const pipeTitle = document.createElement("p");
    pipeTitle.className = "hc-pipeline-title";
    pipeTitle.textContent = LABELS.pipelineTitle;

    const pipeRow = document.createElement("div");
    pipeRow.className = "hc-pipeline";
    pipeRow.setAttribute("role", "group");
    pipeRow.setAttribute("aria-label", LABELS.pipelineAria);

    pipeButtons = pipeline.map((step, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hc-pipe-btn";

      const num = document.createElement("span");
      num.className = "hc-pipe-idx";
      num.textContent = `0${idx + 1}`;

      const name = document.createElement("span");
      name.textContent = step.name || "";

      btn.append(num, name);
      btn.addEventListener("click", () => {
        activePipeIdx = idx;
        syncPipeline();
      });

      pipeRow.append(btn);
      return btn;
    });

    pipeHint = document.createElement("p");
    pipeHint.className = "hc-pipe-hint";
    pipeHint.setAttribute("aria-live", "polite");

    pipeBox.append(pipeTitle, pipeRow, pipeHint);
    shell.append(pipeBox);
  }

  el.append(shell);

  function addRow(dl, label, value) {
    const row = document.createElement("div");
    row.className = "hc-dl-row";
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    row.append(dt, dd);
    dl.append(row);
  }

  function syncCard() {
    for (const [id, btn] of cardButtons.entries()) {
      btn.setAttribute("aria-pressed", String(id === activeCardId));
    }

    const card = cards.find((c) => c.id === activeCardId) || cards[0];
    detail.innerHTML = "";

    const progress = document.createElement("ol");
    progress.className = "hc-progress";
    const doneUntil = Number(card.step || 0);
    LABELS.steps.forEach((stepName, idx) => {
      const li = document.createElement("li");
      li.className =
        idx < doneUntil ? "hc-progress-step hc-progress-step--done" : "hc-progress-step";
      li.textContent = stepName;
      progress.append(li);
    });

    const title = document.createElement("h4");
    title.className = "hc-detail-title";
    title.textContent = card.title || "";

    const dl = document.createElement("dl");
    dl.className = "hc-dl";
    addRow(dl, LABELS.scopeLabel, card.scope || "");
    const changesText = Array.isArray(card.changes) ? card.changes.join("；") : String(card.changes || "");
    addRow(dl, LABELS.changesLabel, changesText);
    addRow(dl, LABELS.testsLabel, card.tests || "");
    addRow(dl, LABELS.verifyLabel, card.verify || "");

    detail.append(progress, title, dl);

    const messages = Array.isArray(card.messages) ? card.messages : [];
    if (messages.length > 0) {
      const msgLabel = document.createElement("p");
      msgLabel.className = "ml-bug-sub";
      msgLabel.textContent = LABELS.messagesLabel;

      const msgsWrap = document.createElement("div");
      msgsWrap.className = "hc-msgs";
      for (const msg of messages) {
        const box = document.createElement("div");
        box.className = "hc-msg";
        const who = document.createElement("span");
        who.className = "hc-msg-who";
        who.textContent = `${msg.who || ""}：`;
        const txt = document.createElement("span");
        txt.textContent = msg.text || "";
        box.append(who, txt);
        msgsWrap.append(box);
      }
      detail.append(msgLabel, msgsWrap);
    }
  }

  function syncPipeline() {
    pipeButtons.forEach((btn, idx) => {
      btn.setAttribute("aria-pressed", String(idx === activePipeIdx));
    });
    if (pipeHint && pipeline[activePipeIdx]) {
      pipeHint.textContent = pipeline[activePipeIdx].hint || "";
    }
  }

  syncCard();
  syncPipeline();
}
