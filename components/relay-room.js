const LABELS = {
  wakePrefix: "叫醒 ",
  wakeSep: " / ",
  nextBtn: "下一步",
  resetBtn: "重来",
  chiefPause: "桥停下，等总司令",
  seatsAria: "接力座位",
  feedAria: "接力对话"
};

export function mount(el, data) {
  if (!el || !data) return;

  const seats = Array.isArray(data.seats) ? data.seats : [];
  const steps = Array.isArray(data.steps) ? data.steps : [];
  const maxCalls = Number(data.maxCalls) || 8;
  if (seats.length === 0 || steps.length === 0) return;

  const seatById = new Map(seats.map((s) => [s.id, s]));

  // shownCount: 已显示的 steps 条数（初始 1 条：第一条来自负责人）
  // chiefPaused: 当上一条 next === "chief" 时，先停在「桥停下,等总司令」，再点一次才出总司令的话
  let shownCount = 1;
  let chiefPaused = false;

  el.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "tool-shell rr-shell";

  const topBar = document.createElement("div");
  topBar.className = "rr-top";

  const counterEl = document.createElement("span");
  counterEl.className = "dp-printer-counter";

  const actions = document.createElement("div");
  actions.className = "rr-actions";

  const nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "dp-btn dp-btn--primary";
  nextBtn.textContent = LABELS.nextBtn;

  const resetBtn = document.createElement("button");
  resetBtn.type = "button";
  resetBtn.className = "dp-btn dp-btn--ghost";
  resetBtn.textContent = LABELS.resetBtn;

  actions.append(nextBtn, resetBtn);
  topBar.append(counterEl, actions);

  const layout = document.createElement("div");
  layout.className = "rr-layout";

  // Seats list (left column on desktop, compact avatar row on 390px)
  const seatsList = document.createElement("ul");
  seatsList.className = "rr-seats";
  seatsList.setAttribute("aria-label", LABELS.seatsAria);

  const seatEls = new Map();
  for (const seat of seats) {
    const li = document.createElement("li");
    li.className = "rr-seat";

    const avatar = document.createElement("span");
    avatar.className = "rr-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = (seat.name || "").slice(0, 1);

    const info = document.createElement("span");
    info.className = "rr-seat-info";

    const name = document.createElement("span");
    name.className = "rr-seat-name";
    name.textContent = seat.name || "";

    const who = document.createElement("span");
    who.className = "rr-seat-who";
    who.textContent = seat.who || "";

    info.append(name, who);
    li.append(avatar, info);
    seatsList.append(li);
    seatEls.set(seat.id, li);
  }

  // Feed (right column)
  const feed = document.createElement("div");
  feed.className = "rr-feed";
  feed.setAttribute("role", "log");
  feed.setAttribute("aria-live", "polite");
  feed.setAttribute("aria-label", LABELS.feedAria);

  layout.append(seatsList, feed);
  shell.append(topBar, layout);
  el.append(shell);

  function countWakeups() {
    let calls = 0;
    for (let i = 0; i < shownCount; i += 1) {
      if (steps[i] && steps[i].from !== "owner") {
        calls += 1;
      }
    }
    return calls;
  }

  function sync() {
    const calls = countWakeups();
    counterEl.textContent = `${LABELS.wakePrefix}${calls}${LABELS.wakeSep}${maxCalls}`;

    const lastShown = steps[shownCount - 1];
    const nextSeatId = lastShown ? lastShown.next : null;
    const finished = shownCount >= steps.length && !chiefPaused;

    for (const [id, li] of seatEls.entries()) {
      const isNext = id === nextSeatId;
      li.classList.toggle("rr-seat--active", isNext && !chiefPaused);
      li.classList.toggle("rr-seat--waiting", isNext && chiefPaused);
    }

    feed.innerHTML = "";
    for (let i = 0; i < shownCount; i += 1) {
      const step = steps[i];
      const speaker = seatById.get(step.from) || { name: step.from, who: "" };
      const target = seatById.get(step.next) || { name: step.next || "" };

      const item = document.createElement("div");
      item.className =
        step.from === "owner" ? "rr-msg rr-msg--owner" : "rr-msg rr-msg--ai";

      const head = document.createElement("div");
      head.className = "rr-msg-head";
      const whoName = document.createElement("span");
      whoName.className = "rr-msg-name";
      whoName.textContent = speaker.name;
      const whoTool = document.createElement("span");
      whoTool.className = "rr-msg-who";
      whoTool.textContent = speaker.who ? `· ${speaker.who}` : "";
      head.append(whoName, whoTool);

      const text = document.createElement("p");
      text.className = "rr-msg-text";
      text.textContent = step.text || "";

      const handoff = document.createElement("span");
      handoff.className = "rr-handoff";
      handoff.textContent = `→ ${target.name}`;

      item.append(head, text, handoff);
      feed.append(item);
    }

    if (chiefPaused) {
      const pause = document.createElement("p");
      pause.className = "rr-pause";
      pause.textContent = LABELS.chiefPause;
      feed.append(pause);
    }

    const wasOnNext = document.activeElement === nextBtn;
    nextBtn.disabled = finished;
    if (finished && wasOnNext) {
      resetBtn.focus();
    }
  }

  nextBtn.addEventListener("click", () => {
    if (shownCount >= steps.length) return;
    const prev = steps[shownCount - 1];
    if (prev && prev.next === "chief" && !chiefPaused) {
      chiefPaused = true;
      sync();
      return;
    }
    chiefPaused = false;
    shownCount += 1;
    sync();
  });

  resetBtn.addEventListener("click", () => {
    shownCount = 1;
    chiefPaused = false;
    sync();
    nextBtn.focus();
  });

  sync();
}
