import { el, button } from "./ui.js";
export function arrangePlay({
  node,
  heading,
  left,
  center,
  right,
  layout,
  values,
  current,
  status,
  pause,
  quit,
}) {
  node.classList.add("abyss-play-layout");
  const head = el("div", "abyss-play-head"),
    back = heading.querySelector("button");
  back.textContent = "← 戻る";
  pause.classList.add("abyss-compact-action");
  quit.classList.add("abyss-compact-action");
  quit.textContent = "終了";
  head.append(
    back,
    el("strong", "abyss-play-title", "喫茶・銀環"),
    pause,
    quit,
  );
  const counters = el("div", "abyss-play-counters");
  counters.append(
    values.remaining.parentNode,
    values.score.parentNode,
    current,
  );
  const dock = right.querySelector(".abyss-dock");
  dock.classList.add("abyss-play-dock");
  const advanced = el("details", "abyss-advanced"),
    summary = el("summary", "", "設定・サウンド・プレイ記録");
  advanced.append(summary, left, right);
  const live = el("div", "abyss-play-status");
  live.append(status);
  center.prepend(live);
  layout.replaceChildren(center);
  node.prepend(head, counters);
  node.insertBefore(dock, layout.nextSibling);
  node.insertBefore(advanced, dock.nextSibling);
  const sound = right.querySelector("#bonus-sound");
  const audio = button(
    "音 切",
    () => {
      sound.click();
      audio.textContent = sound.checked ? "音 入" : "音 切";
      audio.setAttribute("aria-pressed", String(sound.checked));
    },
    "button secondary",
  );
  audio.setAttribute("aria-label", "サウンドを切り替える");
  audio.setAttribute("aria-pressed", "false");
  head.append(audio);
  sound.addEventListener("change", () => {
    audio.textContent = sound.checked ? "音 入" : "音 切";
    audio.setAttribute("aria-pressed", String(sound.checked));
  });
  return { advanced };
}
