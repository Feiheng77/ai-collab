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
    valueRow.append(valueEl);

    const unitText = (item.unit || "").trim();
    if (unitText) {
      const unitEl = document.createElement("span");
      unitEl.className = "stat-unit";
      unitEl.textContent = unitText;
      valueRow.append(unitEl);
    }

    const labelEl = document.createElement("p");
    labelEl.className = "stat-label";
    labelEl.textContent = item.label || "";

    li.append(valueRow, labelEl);

    const noteText = (item.note || "").trim();
    if (noteText) {
      const noteEl = document.createElement("p");
      noteEl.className = "stat-note";
      noteEl.textContent = noteText;
      li.append(noteEl);
    }

    list.append(li);
  }

  el.append(list);
}
