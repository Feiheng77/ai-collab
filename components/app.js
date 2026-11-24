import { SITE } from "../content/site.zh.js?v=1124a";
import { DEMO } from "../content/demo-data.js?v=1124a";
import { mount as mountStatStrip } from "./stat-strip.js?v=1124a";
import { mount as mountDirectivePlayground } from "./directive-playground.js?v=1124a";
import { mount as mountArchDiagram } from "./arch-diagram.js?v=1124a";
import { mount as mountContextScale } from "./context-scale.js?v=1124a";
import { mount as mountMemoryLifecycle } from "./memory-lifecycle.js?v=1124a";
import { mount as mountHubCards } from "./hub-cards.js?v=1124a";
import { mount as mountPrinterRelay } from "./printer-relay.js?v=1124a";
import { mount as mountRelayRoom } from "./relay-room.js?v=1124a";

const LABELS = {
  navAria: "页内导航",
  pillarsAria: "核心模块",
  pillarJump: "看详情",
  pillarExpand: "展开说明",
  pillarCollapse: "收起说明",
  blockKinds: {
    problem: "碰到什么",
    thinking: "我怎么想",
    decision: "我定了什么",
    result: "结果"
  },
  herPlaceholder: "这一段她来写",
  splitMine: "我做的",
  splitAi: "AI 做的",
  splitRejected: "我否掉、砍掉的",
  splitIncidents: "出过的事",
  incidentCause: "原因",
  incidentRule: "之后怎么做"
};

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text || "";
}

function makeHerPlaceholder() {
  const p = document.createElement("p");
  p.className = "her-placeholder";
  p.textContent = LABELS.herPlaceholder;
  return p;
}

function renderHeader() {
  const brandName = SITE.meta?.name || "";
  const nameNote = (SITE.meta?.nameNote || "").trim();

  setText("nav-brand", brandName);

  const group = document.getElementById("nav-brand-group");
  const trigger = document.getElementById("nav-brand-trigger");
  const inlineNote = document.getElementById("nav-brand-note");
  const pop = document.getElementById("nav-note-pop");

  if (group && trigger && inlineNote && pop) {
    if (nameNote) {
      group.classList.add("nav-brand-group--has-note");
      trigger.textContent = brandName;
      trigger.hidden = false;
      inlineNote.textContent = nameNote;
      inlineNote.hidden = false;
      pop.textContent = nameNote;
      pop.hidden = true;

      const closePop = (returnFocus = false) => {
        if (pop.hidden) return;
        pop.hidden = true;
        trigger.setAttribute("aria-expanded", "false");
        if (returnFocus) trigger.focus();
      };

      trigger.addEventListener("click", (event) => {
        event.stopPropagation();
        const willOpen = pop.hidden;
        pop.hidden = !willOpen;
        trigger.setAttribute("aria-expanded", String(willOpen));
      });

      document.addEventListener("click", (event) => {
        if (pop.hidden) return;
        const target = event.target;
        if (!group.contains(target) && !pop.contains(target)) {
          closePop(false);
        }
      });

      document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !pop.hidden) {
          closePop(true);
        }
      });
    } else {
      group.classList.remove("nav-brand-group--has-note");
      trigger.hidden = true;
      inlineNote.hidden = true;
      pop.hidden = true;
    }
  }

  const navEl = document.getElementById("nav-links");
  if (!navEl) return;
  navEl.setAttribute("aria-label", LABELS.navAria);
  navEl.innerHTML = "";
  const navItems = (Array.isArray(SITE.nav) ? SITE.nav : [])
    .filter((item) => item && item.id !== "about")
    .map((item, idx) => ({ item, idx, target: document.getElementById(item.id) }))
    .sort((a, b) => {
      if (a.target && b.target && a.target !== b.target) {
        const pos = a.target.compareDocumentPosition(b.target);
        if (pos & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (pos & Node.DOCUMENT_POSITION_PRECEDING) return 1;
      }
      return a.idx - b.idx;
    });
  for (const { item } of navItems) {
    const a = document.createElement("a");
    a.className = "nav-link";
    a.href = `#${item.id}`;
    a.textContent = item.label || "";
    navEl.append(a);
  }
}

function renderPillars() {
  const host = document.getElementById("hero-pillars");
  if (!host) return;
  const pillars = Array.isArray(SITE.hero?.pillars) ? SITE.hero.pillars : [];
  if (pillars.length === 0) {
    host.innerHTML = "";
    host.hidden = true;
    return;
  }

  host.hidden = false;
  host.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "pillars-grid";
  grid.setAttribute("role", "list");
  grid.setAttribute("aria-label", LABELS.pillarsAria);

  pillars.forEach((item, idx) => {
    const card = document.createElement("article");
    card.className = "pillar-card";
    card.setAttribute("role", "listitem");

    const top = document.createElement("div");
    top.className = "pillar-top";

    const code = document.createElement("span");
    code.className = "pillar-code";
    code.textContent = String(idx + 1).padStart(2, "0");

    const title = document.createElement("h2");
    title.className = "pillar-title";
    title.textContent = item.title || "";
    top.append(code, title);

    if (item.target) {
      const link = document.createElement("a");
      link.className = "pillar-jump";
      link.href = item.target.startsWith("#") ? item.target : `#${item.target}`;
      link.textContent = LABELS.pillarJump;
      top.append(link);
    }

    card.append(top);

    const tags = Array.isArray(item.metrics)
      ? item.metrics
      : Array.isArray(item.tags)
      ? item.tags
      : [];
    if (tags.length > 0) {
      const tagRow = document.createElement("div");
      tagRow.className = "pillar-tags";
      for (const tagText of tags) {
        const span = document.createElement("span");
        span.className = "pillar-tag";
        span.textContent = tagText;
        tagRow.append(span);
      }
      card.append(tagRow);
    }

    const summary = item.summary || item.text || "";
    if (summary) {
      const textId = `pillar-summary-${idx + 1}`;
      const toggleBtn = document.createElement("button");
      toggleBtn.type = "button";
      toggleBtn.className = "pillar-toggle";
      toggleBtn.setAttribute("aria-expanded", "false");
      toggleBtn.setAttribute("aria-controls", textId);
      toggleBtn.textContent = LABELS.pillarExpand;

      const p = document.createElement("p");
      p.id = textId;
      p.className = "pillar-text pillar-text--collapsed";
      p.textContent = summary;

      toggleBtn.addEventListener("click", () => {
        const open = toggleBtn.getAttribute("aria-expanded") !== "true";
        toggleBtn.setAttribute("aria-expanded", String(open));
        toggleBtn.textContent = open ? LABELS.pillarCollapse : LABELS.pillarExpand;
        p.classList.toggle("pillar-text--collapsed", !open);
      });

      card.append(toggleBtn, p);
    }

    grid.append(card);
  });

  host.append(grid);
}

function buildArchSection() {
  const section = document.createElement("section");
  section.id = "arch";
  section.className = "group-item";
  section.setAttribute("aria-labelledby", "arch-title");

  const header = document.createElement("header");
  header.className = "section-header";

  const h3 = document.createElement("h3");
  h3.id = "arch-title";
  h3.className = "section-title";
  h3.textContent = SITE.arch?.title || "";

  const lead = document.createElement("p");
  lead.className = "section-lead";
  lead.textContent = SITE.arch?.lead || "";

  header.append(h3, lead);

  const host = document.createElement("div");
  host.id = "arch-diagram";
  mountArchDiagram(host, SITE.arch);

  section.append(header, host);
  return section;
}

function appendStoryExtras(copyCol, extra) {
  if (!extra || typeof extra !== "object") return;

  if (Array.isArray(extra.how) && extra.how.length > 0) {
    const box = document.createElement("article");
    box.className = "story-block";
    const title = document.createElement("h4");
    title.className = "story-block-title";
    title.textContent = extra.howTitle || "";
    const ol = document.createElement("ol");
    ol.className = "story-extra-list";
    for (const line of extra.how) {
      const li = document.createElement("li");
      li.textContent = line;
      ol.append(li);
    }
    box.append(title, ol);
    copyCol.append(box);
  }

  if (Array.isArray(extra.seats) && extra.seats.length > 0) {
    const box = document.createElement("article");
    box.className = "story-block";
    const title = document.createElement("h4");
    title.className = "story-block-title";
    title.textContent = extra.seatsTitle || "";
    const dl = document.createElement("dl");
    dl.className = "story-seats-dl";
    for (const seat of extra.seats) {
      const row = document.createElement("div");
      row.className = "story-seat-row";
      const dt = document.createElement("dt");
      dt.textContent = seat.who ? `${seat.name}（${seat.who}）` : seat.name || "";
      const dd = document.createElement("dd");
      dd.textContent = seat.does || "";
      row.append(dt, dd);
      dl.append(row);
    }
    box.append(title, dl);
    copyCol.append(box);
  }

  if (Array.isArray(extra.guards) && extra.guards.length > 0) {
    const box = document.createElement("article");
    box.className = "story-block";
    const title = document.createElement("h4");
    title.className = "story-block-title";
    title.textContent = extra.guardsTitle || "";
    const ul = document.createElement("ul");
    ul.className = "story-extra-list";
    for (const line of extra.guards) {
      const li = document.createElement("li");
      li.textContent = line;
      ul.append(li);
    }
    box.append(title, ul);
    copyCol.append(box);
  }
}

function buildStorySection(story) {
  const section = document.createElement("section");
  section.id = story.id;
  section.className = "group-item";
  const headingId = `${story.id}-title`;
  section.setAttribute("aria-labelledby", headingId);

  const header = document.createElement("header");
  header.className = "section-header";

  if (story.kicker) {
    const kicker = document.createElement("p");
    kicker.className = "section-kicker";
    kicker.textContent = story.kicker;
    header.append(kicker);
  }

  const h3 = document.createElement("h3");
  h3.id = headingId;
  h3.className = "section-title";
  h3.textContent = story.title || "";
  header.append(h3);

  const grid = document.createElement("div");
  grid.className = "story-grid";

  const copyCol = document.createElement("div");
  copyCol.className = "story-copy";

  const blocks = Array.isArray(story.blocks) ? story.blocks : [];
  blocks.forEach((blk, blkIdx) => {
    const box = document.createElement("article");
    box.className = `story-block story-block--${blk.kind || "item"}`;

    const titleRow = document.createElement("div");
    titleRow.className = "story-block-head";

    const stepCode = document.createElement("span");
    stepCode.className = "story-step-code";
    stepCode.setAttribute("aria-hidden", "true");
    stepCode.textContent = String(blkIdx + 1).padStart(2, "0");

    const title = document.createElement("h4");
    title.className = "story-block-title";
    title.textContent = LABELS.blockKinds[blk.kind] || blk.kind || "";
    titleRow.append(stepCode, title);
    box.append(titleRow);

    const trimmed = (blk.text || "").trim();
    if (blk.owner === "her" && !trimmed) {
      box.append(makeHerPlaceholder());
    } else {
      const p = document.createElement("p");
      p.className = "story-block-text";
      p.textContent = trimmed;
      box.append(p);
    }

    copyCol.append(box);
  });

  appendStoryExtras(copyCol, story.extra);

  const widgetCol = document.createElement("div");
  widgetCol.className = "story-widget";

  if (story.component === "context-scale") {
    mountContextScale(widgetCol, { context: DEMO.context, flags: SITE.flags });
  } else if (story.component === "memory-lifecycle") {
    mountMemoryLifecycle(widgetCol, {
      memoryChat: DEMO.memoryChat,
      memories: DEMO.memories,
      recall: DEMO.recall,
      extra: story.extra
    });
  } else if (story.component === "hub-cards") {
    mountHubCards(widgetCol, {
      hubCards: DEMO.hubCards,
      pipeline: DEMO.pipeline,
      extra: story.extra
    });
  } else if (story.component === "printer-relay") {
    mountPrinterRelay(widgetCol, DEMO.printer);
  } else if (story.component === "relay-room") {
    mountRelayRoom(widgetCol, DEMO.relay);
  }

  grid.append(copyCol, widgetCol);
  section.append(header, grid);
  return section;
}

function renderGroups() {
  const root = document.getElementById("groups-root");
  if (!root) return;
  root.innerHTML = "";

  const stories = Array.isArray(SITE.stories) ? SITE.stories : [];
  const storyById = new Map(stories.map((s) => [s.id, s]));
  const groups = Array.isArray(SITE.groups) ? SITE.groups : [];

  if (groups.length === 0) {
    if (SITE.arch) root.append(buildArchSection());
    for (const story of stories) {
      root.append(buildStorySection(story));
    }
    return;
  }

  for (const group of groups) {
    const groupSection = document.createElement("section");
    groupSection.id = group.id;
    groupSection.className = "section-group";
    const groupHeadingId = `${group.id}-title`;
    groupSection.setAttribute("aria-labelledby", groupHeadingId);

    const header = document.createElement("header");
    header.className = "group-header";

    const h2 = document.createElement("h2");
    h2.id = groupHeadingId;
    h2.className = "group-title";
    h2.textContent = group.title || "";
    header.append(h2);

    if (group.lead) {
      const lead = document.createElement("p");
      lead.className = "group-lead";
      lead.textContent = group.lead;
      header.append(lead);
    }

    groupSection.append(header);

    const items = Array.isArray(group.items) ? group.items : [];
    for (const itemId of items) {
      if (itemId === "arch" && SITE.arch) {
        groupSection.append(buildArchSection());
      } else if (storyById.has(itemId)) {
        groupSection.append(buildStorySection(storyById.get(itemId)));
      }
    }

    root.append(groupSection);
  }
}

function renderSplit() {
  const split = SITE.split;
  const host = document.getElementById("split-content");
  if (!split || !host) return;

  setText("split-title", split.title);
  host.innerHTML = "";

  // Two-column division
  const cols = document.createElement("div");
  cols.className = "split-cols";

  const makeListCard = (title, items, mod) => {
    const card = document.createElement("div");
    card.className = `split-card ${mod}`;
    const h3 = document.createElement("h3");
    h3.className = "split-card-title";
    h3.textContent = title;
    const ul = document.createElement("ul");
    ul.className = "split-list";
    for (const line of Array.isArray(items) ? items : []) {
      const li = document.createElement("li");
      li.textContent = line;
      ul.append(li);
    }
    card.append(h3, ul);
    return card;
  };

  cols.append(
    makeListCard(LABELS.splitMine, split.mine, "split-card--mine"),
    makeListCard(LABELS.splitAi, split.ai, "split-card--ai")
  );
  host.append(cols);

  // Rejected items
  const rejected = Array.isArray(split.rejected) ? split.rejected : [];
  if (rejected.length > 0) {
    const subTitle = document.createElement("h3");
    subTitle.className = "split-sub-title";
    subTitle.textContent = LABELS.splitRejected;

    const grid = document.createElement("div");
    grid.className = "split-cards-grid";

    for (const item of rejected) {
      const card = document.createElement("article");
      card.className = "split-item-card";

      const what = document.createElement("p");
      what.className = "split-item-what";
      what.textContent = item.what || "";
      card.append(what);

      const hasWhyKey = Object.prototype.hasOwnProperty.call(item, "why");
      const whyText = hasWhyKey ? String(item.why ?? "").trim() : "";
      if (whyText) {
        const why = document.createElement("p");
        why.className = "split-item-why";
        why.textContent = whyText;
        card.append(why);
      } else if (hasWhyKey) {
        card.append(makeHerPlaceholder());
      }
      grid.append(card);
    }
    host.append(subTitle, grid);
  }

  // Incidents
  const incidents = Array.isArray(split.incidents) ? split.incidents : [];
  if (incidents.length > 0) {
    const subTitle = document.createElement("h3");
    subTitle.className = "split-sub-title";
    subTitle.textContent = LABELS.splitIncidents;

    const grid = document.createElement("div");
    grid.className = "split-cards-grid";

    for (const item of incidents) {
      const card = document.createElement("article");
      card.className = "split-item-card";

      const what = document.createElement("p");
      what.className = "split-item-what";
      what.textContent = item.what || "";

      const meta = document.createElement("div");
      meta.className = "incident-meta";

      const causeLine = document.createElement("div");
      const causeTag = document.createElement("span");
      causeTag.className = "incident-tag";
      causeTag.textContent = LABELS.incidentCause;
      causeLine.append(causeTag, document.createTextNode(item.cause || ""));

      const ruleLine = document.createElement("div");
      const ruleTag = document.createElement("span");
      ruleTag.className = "incident-tag incident-tag--rule";
      ruleTag.textContent = LABELS.incidentRule;
      ruleLine.append(ruleTag, document.createTextNode(item.rule || ""));

      meta.append(causeLine, ruleLine);
      card.append(what, meta);
      grid.append(card);
    }
    host.append(subTitle, grid);
  }
}

function init() {
  if (SITE.meta && SITE.meta.title) {
    document.title = SITE.meta.title;
  }
  const descMeta = document.querySelector('meta[name="description"]');
  if (descMeta && SITE.meta && SITE.meta.desc) {
    descMeta.setAttribute("content", SITE.meta.desc);
  }

  void SITE.flags?.roleTab; // D4: v1 为假，不渲染角色系统栏

  setText("hero-kicker", SITE.hero.kicker);
  setText("hero-headline", SITE.hero.headline);
  setText("hero-sub", SITE.hero.sub);
  mountStatStrip(document.getElementById("stat-strip"), SITE.hero.stats);
  renderPillars();

  renderGroups();

  setText("play-title", SITE.play.title);
  setText("play-lead", SITE.play.lead);
  mountDirectivePlayground(document.getElementById("directive-playground"), DEMO.directives);

  renderSplit();
  renderHeader();
  setText("footer-text", SITE.footer);
}

init();
