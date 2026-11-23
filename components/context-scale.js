const LABELS = {
  beforePrefix: "之前 ",
  afterPrefix: "之后 ",
  tokenUnit: "token",
  illustrativeNote: "各块大小为示意,总数为实测(2026-06-27)",
  barAria: "上下文分块占比",
  modeAria: "切换前后对比",
  drawerClose: "收起"
};

function fmtNum(n) {
  return Number(n || 0).toLocaleString("en-US");
}

export function mount(el, data) {
  if (!el || !data) return;

  const context = data.context || data;
  const flags = data.flags || {};
  void flags.cacheView; // v1 为假，不渲染缓存视图

  if (!context.before || !context.after) return;

  const before = context.before;
  const after = context.after;
  const beforeBlocks = Array.isArray(before.blocks) ? before.blocks : [];
  const afterBlocks = Array.isArray(after.blocks) ? after.blocks : [];

  // 合并两档全部块 id，保持顺序，不写死任何块名或条数
  const unionOrder = [];
  const seen = new Set();
  for (const blk of [...beforeBlocks, ...afterBlocks]) {
    if (!seen.has(blk.id)) {
      seen.add(blk.id);
      unionOrder.push(blk.id);
    }
  }

  const colorIndexById = new Map();
  unionOrder.forEach((id, idx) => {
    colorIndexById.set(id, idx % 8);
  });

  let mode = "before";
  let openBlockId = null;
  let lastTrigger = null;

  el.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "tool-shell cs-shell";

  const head = document.createElement("div");
  head.className = "cs-head";

  const modes = document.createElement("div");
  modes.className = "cs-modes";
  modes.setAttribute("role", "group");
  modes.setAttribute("aria-label", LABELS.modeAria);

  const beforeBtn = document.createElement("button");
  beforeBtn.type = "button";
  beforeBtn.className = "cs-mode-btn";
  beforeBtn.textContent = `${LABELS.beforePrefix}${fmtNum(before.total)}`;

  const afterBtn = document.createElement("button");
  afterBtn.type = "button";
  afterBtn.className = "cs-mode-btn";
  afterBtn.textContent = `${LABELS.afterPrefix}${fmtNum(after.total)}`;

  modes.append(beforeBtn, afterBtn);

  const totalWrap = document.createElement("div");
  totalWrap.className = "cs-total-wrap";
  const totalNum = document.createElement("span");
  totalNum.className = "cs-total-num";
  const totalUnit = document.createElement("span");
  totalUnit.className = "cs-total-unit";
  totalUnit.textContent = LABELS.tokenUnit;
  const deltaEl = document.createElement("span");
  deltaEl.className = "cs-delta";
  const reduction =
    before.total > 0 ? Math.round((1 - after.total / before.total) * 100) : 0;
  deltaEl.textContent = `−${reduction}%`;
  totalWrap.append(totalNum, totalUnit, deltaEl);

  head.append(modes, totalWrap);

  const bar = document.createElement("div");
  bar.className = "cs-bar";
  bar.setAttribute("role", "group");
  bar.setAttribute("aria-label", LABELS.barAria);

  const segButtons = new Map();
  for (const id of unionOrder) {
    const colorIdx = colorIndexById.get(id);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "cs-seg";
    btn.style.backgroundColor = `var(--seg-${colorIdx})`;
    btn.style.color = `var(--seg-${colorIdx}-ink)`;

    const nameEl = document.createElement("span");
    nameEl.className = "cs-seg-name";
    const valEl = document.createElement("span");
    valEl.className = "cs-seg-val";
    btn.append(nameEl, valEl);

    btn.addEventListener("click", () => {
      const opening = openBlockId !== id;
      openBlockId = opening ? id : null;
      lastTrigger = opening ? btn : null;
      sync();
    });

    segButtons.set(id, { btn, nameEl, valEl });
    bar.append(btn);
  }

  const legend = document.createElement("div");
  legend.className = "cs-legend";

  // 持久化图例按钮，避免点击/Enter 重建节点导致键盘焦点落到 BODY
  const legendButtons = new Map();
  for (const id of unionOrder) {
    const colorIdx = colorIndexById.get(id);
    const itemBtn = document.createElement("button");
    itemBtn.type = "button";
    itemBtn.className = "cs-legend-btn";

    const swatch = document.createElement("span");
    swatch.className = "cs-swatch";
    swatch.style.backgroundColor = `var(--seg-${colorIdx})`;
    swatch.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    itemBtn.append(swatch, text);

    itemBtn.addEventListener("click", () => {
      const opening = openBlockId !== id;
      openBlockId = opening ? id : null;
      lastTrigger = opening ? itemBtn : null;
      sync();
    });

    legendButtons.set(id, { itemBtn, text });
    legend.append(itemBtn);
  }

  const drawer = document.createElement("div");
  drawer.className = "cs-drawer";
  drawer.hidden = true;

  const drawerHead = document.createElement("div");
  drawerHead.className = "cs-drawer-head";
  const drawerTitle = document.createElement("p");
  drawerTitle.className = "cs-drawer-title";
  const drawerClose = document.createElement("button");
  drawerClose.type = "button";
  drawerClose.className = "cs-drawer-close";
  drawerClose.textContent = LABELS.drawerClose;
  drawerClose.addEventListener("click", () => {
    const returnTo = lastTrigger;
    openBlockId = null;
    lastTrigger = null;
    sync();
    if (returnTo && !returnTo.hidden && returnTo.tabIndex >= 0) {
      returnTo.focus();
    } else {
      (mode === "before" ? beforeBtn : afterBtn).focus();
    }
  });
  drawerHead.append(drawerTitle, drawerClose);

  const drawerCode = document.createElement("pre");
  drawerCode.className = "cs-drawer-code";
  drawer.append(drawerHead, drawerCode);

  shell.append(head, bar, legend, drawer);

  if (context.illustrative) {
    const caption = document.createElement("p");
    caption.className = "cs-caption";
    caption.textContent = LABELS.illustrativeNote;
    shell.append(caption);
  }

  const noteText = (context.note || "").trim();
  if (noteText) {
    const noteEl = document.createElement("p");
    noteEl.className = "cs-caption";
    noteEl.textContent = noteText;
    shell.append(noteEl);
  }

  el.append(shell);

  function sync() {
    const current = mode === "before" ? before : after;
    const blocks = Array.isArray(current.blocks) ? current.blocks : [];
    const blockById = new Map(blocks.map((b) => [b.id, b]));
    const sumTokens =
      current.total || blocks.reduce((acc, b) => acc + Number(b.tokens || 0), 0) || 1;

    beforeBtn.setAttribute("aria-pressed", String(mode === "before"));
    afterBtn.setAttribute("aria-pressed", String(mode === "after"));
    totalNum.textContent = fmtNum(current.total);
    deltaEl.hidden = mode !== "after";

    if (openBlockId && !blockById.has(openBlockId)) {
      openBlockId = null;
      lastTrigger = null;
    }

    for (const id of unionOrder) {
      const { btn, nameEl, valEl } = segButtons.get(id);
      const { itemBtn, text } = legendButtons.get(id);
      const blk = blockById.get(id);
      if (!blk) {
        btn.classList.add("cs-seg--hidden");
        btn.classList.remove("cs-seg--narrow");
        btn.style.width = "0%";
        btn.tabIndex = -1;
        btn.setAttribute("aria-hidden", "true");
        btn.setAttribute("aria-expanded", "false");
        itemBtn.hidden = true;
        itemBtn.setAttribute("aria-expanded", "false");
        continue;
      }

      const pct = (Number(blk.tokens || 0) / sumTokens) * 100;
      btn.classList.remove("cs-seg--hidden");
      btn.classList.toggle("cs-seg--narrow", pct < 15);
      btn.style.width = `${pct.toFixed(4)}%`;
      btn.tabIndex = 0;
      btn.removeAttribute("aria-hidden");
      btn.setAttribute("aria-label", `${blk.name} ${fmtNum(blk.tokens)} ${LABELS.tokenUnit}`);
      btn.setAttribute("aria-expanded", String(openBlockId === id));
      nameEl.textContent = blk.name;
      valEl.textContent = fmtNum(blk.tokens);

      itemBtn.hidden = false;
      itemBtn.setAttribute("aria-expanded", String(openBlockId === id));
      text.textContent = `${blk.name} ${fmtNum(blk.tokens)}`;
    }

    const activeBlk = openBlockId ? blockById.get(openBlockId) : null;
    if (activeBlk) {
      drawer.hidden = false;
      drawerTitle.textContent = `${activeBlk.name} · ${fmtNum(activeBlk.tokens)} ${LABELS.tokenUnit}`;
      drawerCode.textContent = activeBlk.sample || "";
    } else {
      drawer.hidden = true;
      drawerCode.textContent = "";
    }
  }

  beforeBtn.addEventListener("click", () => {
    mode = "before";
    sync();
  });

  afterBtn.addEventListener("click", () => {
    mode = "after";
    sync();
  });

  sync();
}
