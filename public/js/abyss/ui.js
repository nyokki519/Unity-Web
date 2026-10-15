import { el, button, field, labeledSelect } from "../dom.js";
export { el, button, field, labeledSelect };
export function numberField(
  label,
  { value = 0, min = 0, max = 100, step = 1, onChange } = {},
) {
  const input = el("input");
  input.type = "number";
  Object.assign(input, {
    value: String(value),
    min: String(min),
    max: String(max),
    step: String(step),
  });
  input.addEventListener("change", () => {
    const n = Number(input.value);
    if (!Number.isFinite(n)) {
      input.value = String(value);
      return;
    }
    input.value = String(Math.min(max, Math.max(min, n)));
    onChange?.(Number(input.value));
  });
  return { node: field(label, input), input };
}
export function rangeField(
  label,
  { value = 0, min = 0, max = 100, step = 1, onChange } = {},
) {
  const wrap = el("div", "abyss-range"),
    input = el("input"),
    output = el("output");
  input.type = "range";
  Object.assign(input, {
    value: String(value),
    min: String(min),
    max: String(max),
    step: String(step),
  });
  output.textContent = String(value);
  const update = () => {
    output.textContent = input.value;
    input.setAttribute("aria-valuetext", input.value);
    onChange?.(Number(input.value));
  };
  input.addEventListener("input", update);
  wrap.append(field(label, input), output);
  return { node: wrap, input, output };
}
export function checkbox(label, checked, onChange) {
  const input = el("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  return { node: field(label, input), input };
}
export function section(title, open = false) {
  const node = el("details", "abyss-section");
  node.open = open;
  node.append(el("summary", "", title));
  const body = el("div", "abyss-section-body");
  node.append(body);
  return { node, body };
}
export function download(name, content, type = "application/json") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = el("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const clock = (t) =>
  `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
export function renderStatistics(target, rows) {
  const table = el("table", "abyss-table"),
    head = el("thead"),
    hr = el("tr");
  for (const h of ["関門", "成功 / 到達", "率・95%区間"])
    hr.append(el("th", "", h));
  head.append(hr);
  const body = el("tbody");
  for (const row of rows) {
    const tr = el("tr"),
      rate = row.reached ? `${(row.rate * 100).toFixed(1)}%` : "—";
    tr.append(
      el("th", "", row.label),
      el("td", "", `${row.passed} / ${row.reached}`),
      el(
        "td",
        "",
        `${rate}\n${row.reached ? `${(row.low * 100).toFixed(1)}–${(row.high * 100).toFixed(1)}%` : "到達なし"}`,
      ),
    );
    body.append(tr);
  }
  table.append(head, body);
  target.replaceChildren(
    table,
    el(
      "p",
      "abyss-note",
      "各関門へ到達した玉が分母です。区間は独立な二項試行を仮定した目安です。未決着の玉がある途中経過は確定率ではありません。少数試行や成功0件では、真の確率を断定できません。",
    ),
  );
}
