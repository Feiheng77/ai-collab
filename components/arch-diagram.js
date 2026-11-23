const LABELS = {
  svgAria: "系统结构图",
  storyLink: "去看这个故事",
  hintPrompt: "点方块看说明"
};

const SVG_NS = "http://www.w3.org/2000/svg";

function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [key, val] of Object.entries(attrs)) {
    el.setAttribute(key, String(val));
  }
  return el;
}

function makeArrowIcon() {
  const svg = svgEl("svg", {
    viewBox: "0 0 16 16",
    width: "14",
    height: "14",
    fill: "none",
    stroke: "currentColor",
    "stroke-width": "2",
    "stroke-linecap": "round",
    "stroke-linejoin": "round",
    "aria-hidden": "true"
  });
  svg.append(svgEl("path", { d: "M3 8h10" }), svgEl("path", { d: "M9 4l4 4-4 4" }));
  return svg;
}

export function mount(el, data) {
  if (!el || !data || !Array.isArray(data.layers) || data.layers.length === 0) return;

  const layers = data.layers;
  const allNodes = [];
  for (const layer of layers) {
    if (Array.isArray(layer.nodes)) {
      for (const node of layer.nodes) {
        allNodes.push(node);
      }
    }
  }
  if (allNodes.length === 0) return;

  let activeId = allNodes[0].id;

  el.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "tool-shell";

  const svgWrap = document.createElement("div");
  svgWrap.className = "arch-svg-wrap";

  const detail = document.createElement("div");
  detail.className = "arch-detail";
  detail.id = "arch-detail";
  detail.setAttribute("aria-live", "polite");

  const detailBody = document.createElement("div");
  detailBody.className = "arch-detail-body";

  const detailLabel = document.createElement("p");
  detailLabel.className = "arch-detail-label";

  const detailHint = document.createElement("p");
  detailHint.className = "arch-detail-hint";

  detailBody.append(detailLabel, detailHint);

  const storyLink = document.createElement("a");
  storyLink.className = "arch-story-link";
  storyLink.hidden = true;
  const linkText = document.createElement("span");
  linkText.textContent = LABELS.storyLink;
  storyLink.append(linkText, makeArrowIcon());

  detail.append(detailBody, storyLink);
  shell.append(svgWrap, detail);
  el.append(shell);

  let nodeLinks = new Map();

  function syncDetail() {
    const current = allNodes.find((n) => n.id === activeId);
    for (const [id, linkEl] of nodeLinks.entries()) {
      linkEl.setAttribute("aria-current", id === activeId ? "true" : "false");
    }

    if (!current) {
      detailLabel.textContent = "";
      detailHint.textContent = LABELS.hintPrompt;
      storyLink.hidden = true;
      return;
    }

    detailLabel.textContent = current.label || "";
    detailHint.textContent = current.hint || "";
    if (current.story) {
      storyLink.href = `#${current.story}`;
      storyLink.hidden = false;
    } else {
      storyLink.removeAttribute("href");
      storyLink.hidden = true;
    }
  }

  function renderSvg(compact) {
    svgWrap.innerHTML = "";
    nodeLinks = new Map();

    const width = compact ? 420 : 920;
    const outerPad = compact ? 12 : 16;
    const bandWidth = width - outerPad * 2;
    const tagCol = compact ? 0 : 76;
    const innerPad = compact ? 12 : 16;
    const nodeGapX = compact ? 10 : 12;
    const nodeGapY = 10;
    const nodeHeight = compact ? 44 : 46;
    const bandGap = compact ? 26 : 30;
    const maxPerRow = compact ? 2 : 5;
    const fontSize = compact ? 15 : 15;

    let cursorY = outerPad;
    const bandMetrics = layers.map((layer, layerIdx) => {
      const nodes = Array.isArray(layer.nodes) ? layer.nodes : [];
      const rows = [];
      for (let i = 0; i < nodes.length; i += maxPerRow) {
        rows.push(nodes.slice(i, i + maxPerRow));
      }
      const topHeader = compact ? 30 : 14;
      const bottomPad = 14;
      const contentH =
        rows.length > 0 ? rows.length * nodeHeight + (rows.length - 1) * nodeGapY : nodeHeight;
      const bandHeight = topHeader + contentH + bottomPad;
      const y = cursorY;
      cursorY += bandHeight + bandGap;
      return { layer, layerIdx, rows, y, bandHeight, topHeader };
    });

    const totalHeight = cursorY - bandGap + outerPad;
    const svg = svgEl("svg", {
      viewBox: `0 0 ${width} ${totalHeight}`,
      class: "arch-svg",
      role: "img",
      "aria-label": LABELS.svgAria
    });

    bandMetrics.forEach((metric, idx) => {
      const isMiddle = idx === Math.floor(layers.length / 2);
      const bandX = outerPad;

      svg.append(
        svgEl("rect", {
          x: bandX,
          y: metric.y,
          width: bandWidth,
          height: metric.bandHeight,
          rx: 12,
          class: isMiddle ? "arch-layer-box arch-layer-box--mid" : "arch-layer-box"
        })
      );

      const tag = svgEl("text", {
        x: compact ? bandX + innerPad : bandX + 18,
        y: compact ? metric.y + 21 : metric.y + metric.bandHeight / 2 + 5,
        class: isMiddle ? "arch-layer-tag arch-layer-tag--mid" : "arch-layer-tag"
      });
      tag.textContent = metric.layer.name || "";
      svg.append(tag);

      const areaX = bandX + tagCol + innerPad;
      const areaW = bandWidth - tagCol - innerPad * 2;

      metric.rows.forEach((rowNodes, rowIdx) => {
        const count = rowNodes.length;
        const cellW = (areaW - nodeGapX * (count - 1)) / count;
        const rowY = metric.y + metric.topHeader + rowIdx * (nodeHeight + nodeGapY);

        rowNodes.forEach((node, colIdx) => {
          const x = areaX + colIdx * (cellW + nodeGapX);
          const link = svgEl("a", {
            href: "#arch-detail",
            class: "arch-node-link",
            "aria-current": node.id === activeId ? "true" : "false"
          });

          const rect = svgEl("rect", {
            x,
            y: rowY,
            width: cellW,
            height: nodeHeight,
            rx: 9,
            class: "arch-node-rect"
          });

          const text = svgEl("text", {
            x: x + cellW / 2,
            y: rowY + nodeHeight / 2 + 5,
            "text-anchor": "middle",
            "font-size": fontSize,
            class: "arch-node-text"
          });
          text.textContent = node.label || "";

          link.append(rect, text);

          if (node.story) {
            link.append(
              svgEl("circle", {
                cx: x + cellW - 11,
                cy: rowY + 11,
                r: 3.5,
                class: "arch-node-dot"
              })
            );
          }

          const activate = (event) => {
            event.preventDefault();
            activeId = node.id;
            syncDetail();
          };
          link.addEventListener("click", activate);
          link.addEventListener("keydown", (event) => {
            if (event.key === " " || event.key === "Enter") {
              activate(event);
            }
          });

          nodeLinks.set(node.id, link);
          svg.append(link);
        });
      });

      if (idx < bandMetrics.length - 1) {
        const y1 = metric.y + metric.bandHeight + 2;
        const y2 = bandMetrics[idx + 1].y - 5;
        const cx = width / 2;
        svg.append(
          svgEl("line", {
            x1: cx,
            y1,
            x2: cx,
            y2,
            class: "arch-connector"
          }),
          svgEl("polygon", {
            points: `${cx - 5},${y2 - 2} ${cx + 5},${y2 - 2} ${cx},${y2 + 5}`,
            class: "arch-arrow"
          })
        );
      }
    });

    svgWrap.append(svg);
    syncDetail();
  }

  const mql = window.matchMedia("(max-width: 640px)");
  renderSvg(mql.matches);
  const onMediaChange = (event) => renderSvg(event.matches);
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onMediaChange);
  } else if (typeof mql.addListener === "function") {
    mql.addListener(onMediaChange);
  }
}
