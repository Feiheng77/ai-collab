const LABELS = {
  listAria: "关键数字"
};

export function mount(el, stats) {
  if (!el || !Array.isArray(stats)) return;

  el.innerHTML = "";
  const list = document.createElement("ul");
  list.className = "stat-strip";
  list.setAttribute("aria-label", LABELS.listAria);

  for (const item of stats) {
    const li = document.createElement("li");
    li.className = "stat-card";

    const valueRow = document.createElement("div");
    valueRow.className = "stat-value-row";

    const valueEl = document.createElement("span");
    valueEl.className = "stat-value";
    valueEl.textContent = String(item.value);

    const unitEl = document.createElement("span");
    unitEl.className = "stat-unit";
    unitEl.textContent = item.unit || "";

    valueRow.append(valueEl, unitEl);

    const labelEl = document.createElement("p");
    labelEl.className = "stat-label";
    labelEl.textContent = item.label || "";

    const noteEl = document.createElement("p");
    noteEl.className = "stat-note";
    noteEl.textContent = item.note || "";

    li.append(valueRow, labelEl, noteEl);
    list.append(li);
  }

  el.append(list);
}
