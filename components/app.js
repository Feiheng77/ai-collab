import { SITE } from "../content/site.zh.js?v=1123b";
import { DEMO } from "../content/demo-data.js?v=1123b";
import { mount as mountStatStrip } from "./stat-strip.js?v=1123b";
import { mount as mountDirectivePlayground } from "./directive-playground.js?v=1123b";
import { mount as mountArchDiagram } from "./arch-diagram.js?v=1123b";
import { mount as mountContextScale } from "./context-scale.js?v=1123b";
import { mount as mountMemoryLifecycle } from "./memory-lifecycle.js?v=1123b";
import { mount as mountHubCards } from "./hub-cards.js?v=1123b";

const LABELS = {
  asOfPrefix: "截至 ",
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
  incidentRule: "之后怎么做",
  aboutLinksAria: "相关链接"
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
  setText("nav-asof", SITE.meta?.asOf ? `${LABELS.asOfPrefix}${SITE.meta.asOf}` : "");

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
  const navItems = Array.isArray(SITE.nav) ? SITE.nav : [];
  for (const item of navItems) {
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

function renderStories() {
  const root = document.getElementById("stories-root");
  if (!root) return;
  root.innerHTML = "";

  const stories = Array.isArray(SITE.stories) ? SITE.stories : [];
  stories.forEach((story, storyIdx) => {
    const section = document.createElement("section");
    section.id = story.id;
    section.className = "section-block";
    const headingId = `${story.id}-title`;
    section.setAttribute("aria-labelledby", headingId);

    const header = document.createElement("header");
    header.className = "section-header";

    const codeRow = document.createElement("div");
    codeRow.className = "section-meta-row";

    const code = document.createElement("span");
    code.className = "section-code";
    code.setAttribute("aria-hidden", "true");
    code.textContent = String(storyIdx + 3).padStart(2, "0");
    codeRow.append(code);

    if (story.kicker) {
      const kicker = document.createElement("p");
      kicker.className = "section-kicker";
      kicker.textContent = story.kicker;
      codeRow.append(kicker);
    }
    header.append(codeRow);

    const h2 = document.createElement("h2");
    h2.id = headingId;
    h2.className = "section-title";
    h2.textContent = story.title || "";
    header.append(h2);

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

      const title = document.createElement("h3");
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
    }

    grid.append(copyCol, widgetCol);
    section.append(header, grid);
    root.append(section);
  });
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

function renderAbout() {
  const about = SITE.about;
  const host = document.getElementById("about-content");
  if (!about || !host) return;

  setText("about-title", about.title);
  host.innerHTML = "";

  const box = document.createElement("div");
  box.className = "about-box";

  const originText = (about.origin || "").trim();
  if (originText) {
    const p1 = document.createElement("p");
    p1.className = "about-p";
    p1.textContent = originText;
    box.append(p1);
  }

  if (about.privacy) {
    const p2 = document.createElement("p");
    p2.className = "about-p";
    p2.textContent = about.privacy;
    box.append(p2);
  }

  const links = Array.isArray(about.links) ? about.links.filter((l) => l && l.href) : [];
  if (links.length > 0) {
    const wrap = document.createElement("nav");
    wrap.className = "about-links";
    wrap.setAttribute("aria-label", LABELS.aboutLinksAria);
    for (const link of links) {
      const a = document.createElement("a");
      a.className = "about-link";
      a.href = link.href;
      a.textContent = link.label || link.href;
      wrap.append(a);
    }
    box.append(wrap);
  }

  host.append(box);
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

  renderHeader();

  setText("hero-kicker", SITE.hero.kicker);
  setText("hero-headline", SITE.hero.headline);
  setText("hero-sub", SITE.hero.sub);
  mountStatStrip(document.getElementById("stat-strip"), SITE.hero.stats);
  renderPillars();

  setText("play-title", SITE.play.title);
  setText("play-lead", SITE.play.lead);
  mountDirectivePlayground(document.getElementById("directive-playground"), DEMO.directives);

  setText("arch-title", SITE.arch.title);
  setText("arch-lead", SITE.arch.lead);
  mountArchDiagram(document.getElementById("arch-diagram"), SITE.arch);

  renderStories();
  renderSplit();
  renderAbout();
  setText("footer-text", SITE.footer);
}

init();
