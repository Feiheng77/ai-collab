const LABELS = {
  stations: ["对话", "服务器", "家庭服务器", "打印机"],
  statusAwake: "醒着",
  statusAsleep: "睡着",
  stateAria: "打印机状态",
  trackAria: "纸条路径",
  pressBtn: "按一下打印机",
  writeBtn: "写一张纸条",
  quietLabel: "静默时段",
  resetBtn: "重来",
  heldTag: "揣着",
  tryingTag: "在试",
  printedTag: "打出来了",
  quietMsg: "静默时间不出纸",
  countPrefix: "今天第 ",
  countMid: " 张 / ",
  limitPrefix: "今天的 ",
  limitSuffix: " 张用完了",
  paperTag: "纸条",
  nextNoteLabel: "下一张",
  wokeHint: "已按醒，等下次重试"
};

function isReducedMotion() {
  return Boolean(
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function mount(el, data) {
  if (!el || !data) return;

  const limit = Number(data.limitPerDay) || 7;
  const retrySeconds = Number(data.retrySeconds) || 3;
  const retryMs = retrySeconds * 1000;
  const quiet = data.quiet || { from: "23:00", to: "08:00" };
  const notes = Array.isArray(data.notes) ? data.notes : [];
  if (notes.length === 0) return;

  let printerAwake = true;
  let quietOn = false;
  let printedCount = 0;
  let noteCursor = 0;
  let uidSeq = 0;
  let heldQueue = [];
  let activeStation = -1;
  let stationBadge = "";
  let noticeText = "";
  let lastPaper = null;
  let pulsingHome = false;
  let retryTimer = null;
  let stepTimers = [];

  const clearSteps = () => {
    for (const t of stepTimers) clearTimeout(t);
    stepTimers = [];
  };

  const stopRetry = () => {
    if (retryTimer !== null) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
    pulsingHome = false;
  };

  el.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "tool-shell pr-shell";

  // Top bar: awake/asleep toggle + press button + daily counter
  const topBar = document.createElement("div");
  topBar.className = "pr-top";

  const stateGroup = document.createElement("div");
  stateGroup.className = "cs-modes";
  stateGroup.setAttribute("role", "group");
  stateGroup.setAttribute("aria-label", LABELS.stateAria);

  const awakeBtn = document.createElement("button");
  awakeBtn.type = "button";
  awakeBtn.className = "cs-mode-btn";
  awakeBtn.textContent = LABELS.statusAwake;

  const asleepBtn = document.createElement("button");
  asleepBtn.type = "button";
  asleepBtn.className = "cs-mode-btn";
  asleepBtn.textContent = LABELS.statusAsleep;

  stateGroup.append(awakeBtn, asleepBtn);

  const pressBtn = document.createElement("button");
  pressBtn.type = "button";
  pressBtn.className = "dp-btn dp-btn--ghost";
  pressBtn.textContent = LABELS.pressBtn;

  const counterEl = document.createElement("span");
  counterEl.className = "dp-printer-counter";

  topBar.append(stateGroup, pressBtn, counterEl);

  // Four-station track
  const track = document.createElement("ol");
  track.className = "pr-track";
  track.setAttribute("aria-label", LABELS.trackAria);

  const stationNodes = LABELS.stations.map((name, idx) => {
    const li = document.createElement("li");
    li.className = "pr-station";

    const idxEl = document.createElement("span");
    idxEl.className = "pr-station-idx";
    idxEl.textContent = `0${idx + 1}`;

    const nameEl = document.createElement("span");
    nameEl.className = "pr-station-name";
    nameEl.textContent = name;

    const badgeEl = document.createElement("span");
    badgeEl.className = "pr-station-badge";
    badgeEl.hidden = true;

    li.append(idxEl, nameEl, badgeEl);
    track.append(li);
    return { li, badgeEl };
  });

  // Preview of next note
  const nextBox = document.createElement("p");
  nextBox.className = "pr-next-note";

  // Controls row: write note + quiet switch + reset
  const controls = document.createElement("div");
  controls.className = "pr-controls";

  const writeBtn = document.createElement("button");
  writeBtn.type = "button";
  writeBtn.className = "dp-btn dp-btn--primary";
  writeBtn.textContent = LABELS.writeBtn;

  const quietSwitch = document.createElement("button");
  quietSwitch.type = "button";
  quietSwitch.className = "dp-switch";
  quietSwitch.setAttribute("role", "switch");
  quietSwitch.setAttribute("aria-checked", "false");

  const switchTrack = document.createElement("span");
  switchTrack.className = "dp-switch-track";
  switchTrack.setAttribute("aria-hidden", "true");
  const switchThumb = document.createElement("span");
  switchThumb.className = "dp-switch-thumb";
  switchTrack.append(switchThumb);

  const switchLabel = document.createElement("span");
  switchLabel.textContent = `${LABELS.quietLabel} ${quiet.from}–${quiet.to}`;
  quietSwitch.append(switchTrack, switchLabel);

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "dp-btn dp-btn--ghost";
  resetBtn.textContent = LABELS.resetBtn;

  controls.append(writeBtn, quietSwitch, resetBtn);

  // Output area: held queue + printed paper slip + status notice
  const output = document.createElement("div");
  output.className = "pr-output";

  const heldList = document.createElement("div");
  heldList.className = "pr-held-list";
  heldList.hidden = true;

  const paperWrap = document.createElement("div");
  paperWrap.className = "pr-paper-wrap";
  paperWrap.hidden = true;

  const noticeEl = document.createElement("p");
  noticeEl.className = "dp-notice";
  noticeEl.setAttribute("role", "status");
  noticeEl.setAttribute("aria-live", "polite");
  noticeEl.hidden = true;

  output.append(heldList, paperWrap, noticeEl);
  shell.append(topBar, track, nextBox, controls, output);
  el.append(shell);

  function renderPaper(paper) {
    paperWrap.innerHTML = "";
    if (!paper) {
      paperWrap.hidden = true;
      return;
    }
    paperWrap.hidden = false;

    const slip = document.createElement("div");
    slip.className = "dp-paper pr-slip";

    const meta = document.createElement("div");
    meta.className = "dp-paper-meta";
    const left = document.createElement("span");
    left.textContent = `${LABELS.paperTag} · ${paper.time}`;
    const right = document.createElement("span");
    right.textContent = `#${paper.seq} / ${limit} · ${LABELS.printedTag}`;
    meta.append(left, right);

    const txt = document.createElement("p");
    txt.className = "dp-paper-text";
    txt.textContent = paper.text;

    slip.append(meta, txt);
    paperWrap.append(slip);
  }

  function sync(reanimatePaper = false) {
    awakeBtn.setAttribute("aria-pressed", String(printerAwake));
    asleepBtn.setAttribute("aria-pressed", String(!printerAwake));
    quietSwitch.setAttribute("aria-checked", String(quietOn));
    counterEl.textContent = `${LABELS.countPrefix}${printedCount}${LABELS.countMid}${limit}`;

    const upcoming = notes[noteCursor % notes.length];
    nextBox.textContent = `${LABELS.nextNoteLabel}（${upcoming.time}）：${upcoming.text}`;

    stationNodes.forEach(({ li, badgeEl }, idx) => {
      li.classList.toggle("pr-station--active", idx === activeStation);
      li.classList.toggle("pr-station--passed", activeStation > idx);
      li.classList.toggle("pr-station--pulse", idx === 2 && pulsingHome);
      li.classList.toggle("pr-station--asleep", idx === 3 && !printerAwake);

      if (idx === activeStation && stationBadge) {
        badgeEl.textContent = stationBadge;
        badgeEl.hidden = false;
      } else if (idx === 2 && heldQueue.length > 0) {
        badgeEl.textContent = pulsingHome ? LABELS.tryingTag : LABELS.heldTag;
        badgeEl.hidden = false;
      } else {
        badgeEl.textContent = "";
        badgeEl.hidden = true;
      }
    });

    if (heldQueue.length > 0) {
      heldList.hidden = false;
      heldList.innerHTML = "";
      for (const item of heldQueue) {
        const row = document.createElement("div");
        row.className = "pr-held-item";
        const tag = document.createElement("span");
        tag.className = "ml-badge ml-badge--accent";
        tag.textContent = LABELS.heldTag;
        const txt = document.createElement("span");
        txt.textContent = `${item.time} · ${item.text}`;
        row.append(tag, txt);
        heldList.append(row);
      }
    } else {
      heldList.hidden = true;
      heldList.innerHTML = "";
    }

    if (reanimatePaper) {
      renderPaper(lastPaper);
    } else if (!lastPaper) {
      paperWrap.hidden = true;
      paperWrap.innerHTML = "";
    }

    if (noticeText) {
      noticeEl.textContent = noticeText;
      noticeEl.hidden = false;
    } else {
      noticeEl.textContent = "";
      noticeEl.hidden = true;
    }
  }

  function flushHeldQueue() {
    if (heldQueue.length === 0 || !printerAwake) return;
    const batch = heldQueue.slice();
    heldQueue = [];
    stopRetry();

    let printedAny = false;
    for (const item of batch) {
      if (printedCount >= limit) break;
      printedCount += 1;
      lastPaper = { seq: printedCount, time: item.time, text: item.text };
      printedAny = true;
    }

    if (printedAny) {
      activeStation = 3;
      stationBadge = LABELS.printedTag;
      noticeText = "";
      sync(true);
    } else {
      sync(false);
    }
  }

  function ensureRetryLoop() {
    if (retryTimer !== null) return;
    retryTimer = setInterval(() => {
      if (heldQueue.length === 0) {
        stopRetry();
        sync(false);
        return;
      }
      if (printerAwake) {
        flushHeldQueue();
        return;
      }
      pulsingHome = true;
      sync(false);
      const offTimer = setTimeout(() => {
        pulsingHome = false;
        sync(false);
      }, 650);
      stepTimers.push(offTimer);
    }, retryMs);
  }

  function animateTo(targetIdx, onArrive) {
    clearSteps();
    if (isReducedMotion()) {
      activeStation = targetIdx;
      onArrive();
      return;
    }
    let cur = 0;
    activeStation = 0;
    stationBadge = "";
    sync(false);

    const advance = () => {
      if (cur >= targetIdx) {
        onArrive();
        return;
      }
      cur += 1;
      activeStation = cur;
      if (cur === targetIdx) {
        onArrive();
      } else {
        sync(false);
        stepTimers.push(setTimeout(advance, 180));
      }
    };
    stepTimers.push(setTimeout(advance, 180));
  }

  writeBtn.addEventListener("click", () => {
    const note = notes[noteCursor % notes.length];

    if (quietOn) {
      clearSteps();
      activeStation = 1;
      stationBadge = LABELS.quietMsg;
      noticeText = LABELS.quietMsg;
      sync(false);
      return;
    }

    if (printedCount + heldQueue.length >= limit) {
      clearSteps();
      noticeText = `${LABELS.limitPrefix}${limit}${LABELS.limitSuffix}`;
      sync(false);
      return;
    }

    noteCursor += 1;
    noticeText = "";

    if (printerAwake) {
      animateTo(3, () => {
        printedCount += 1;
        stationBadge = LABELS.printedTag;
        lastPaper = { seq: printedCount, time: note.time, text: note.text };
        sync(true);
      });
    } else {
      animateTo(2, () => {
        heldQueue.push({ uid: ++uidSeq, time: note.time, text: note.text });
        stationBadge = LABELS.heldTag;
        sync(false);
        ensureRetryLoop();
      });
    }
  });

  function wakePrinter() {
    printerAwake = true;
    if (heldQueue.length > 0) {
      if (isReducedMotion()) {
        flushHeldQueue();
        return;
      }
      noticeText = LABELS.wokeHint;
      sync(false);
      ensureRetryLoop();
    } else {
      sync(false);
    }
  }

  awakeBtn.addEventListener("click", wakePrinter);
  pressBtn.addEventListener("click", wakePrinter);

  asleepBtn.addEventListener("click", () => {
    printerAwake = false;
    sync(false);
  });

  quietSwitch.addEventListener("click", () => {
    quietOn = !quietOn;
    noticeText = "";
    sync(false);
  });

  resetBtn.addEventListener("click", () => {
    clearSteps();
    stopRetry();
    printerAwake = true;
    quietOn = false;
    printedCount = 0;
    noteCursor = 0;
    heldQueue = [];
    activeStation = -1;
    stationBadge = "";
    noticeText = "";
    lastPaper = null;
    sync(false);
    writeBtn.focus();
  });

  sync(false);
}
