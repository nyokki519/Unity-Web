import { el, button } from "./ui.js";
import {
  challengeFunds,
  createLaunchPolicy,
  launchAllowed,
} from "./challenge-policy.js";
export function createChallengeControls({ node, getGame, getReplay, listen }) {
  const box = el("div", "cafe-challenge"),
    hud = el("div", "cafe-hud"),
    funds = el("strong"),
    warning = el("progress"),
    note = el("span", "cafe-warning");
  funds.dataset.challengeFunds = "";
  warning.max = 1;
  warning.value = 0;
  warning.setAttribute("aria-label", "警戒度");
  hud.append(
    el("span", "", "所持ポイント "),
    funds,
    el("span", "", "警戒度"),
    warning,
    note,
  );
  const row = el("div", "cafe-switches");
  box.append(hud, row);
  node.querySelector(".abyss-play-dock").prepend(box);
  const setLiveTilt = value => {if(!getReplay())getGame()?.setTilt?.(value);};
  const api = {
    auto: false,
    random: false,
    slow: true,
    policy: createLaunchPolicy(),
    reset(seed) {
      api.stop();
      api.random = false;
      api.policy = createLaunchPolicy(seed);
      sync();
    },
    stop() {
      api.auto = false;
      setLiveTilt(0);
      sync();
    },
    update(g, replay) {
      box.hidden = !g;
      for (const b of row.querySelectorAll("button"))
        b.disabled = !!replay || !g || g.status !== "running";
      if (!g) return;
      funds.textContent = challengeFunds(g).toLocaleString("ja-JP");
      warning.value = g.suspicion || 0;
      note.textContent =
        g.elapsed < g.tiltLockUntil
          ? `傾き休止 ${Math.ceil(g.tiltLockUntil - g.elapsed)}秒`
          : g.tilt
            ? "傾き中"
            : "";
      if (g.status !== "running") api.stop();
    },
  };
  const auto = button(
      "自動連射",
      () => {
        if (!getReplay() && launchAllowed(getGame())) api.auto = !api.auto;
        sync();
      },
      "button secondary",
    ),
    random = button(
      "ランダム威力",
      () => {
        api.random = !api.random;
        sync();
      },
      "button secondary",
    ),
    slow = button(
      "スロー",
      () => {
        api.slow = !api.slow;
        sync();
      },
      "button secondary",
    );
  slow.setAttribute("aria-label", "最終段のスロー表示");
  const tilt = (value, label, aria) => {
    const b = button(label, () => {}, "button secondary");
    b.setAttribute("aria-label", aria);
    listen(b, "pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      setLiveTilt(value);
    });
    listen(b, "keydown", (e) => {
      if (["Space", "Enter"].includes(e.code)) {
        e.preventDefault();
        setLiveTilt(value);
      }
    });
    listen(b, "keyup", () => setLiveTilt(0));
    listen(b, "blur", () => setLiveTilt(0));
    return b;
  };
  row.append(
    auto,
    random,
    tilt(-1, "傾き ◀", "左へ傾ける"),
    tilt(1, "傾き ▶", "右へ傾ける"),
    slow,
  );
  function sync() {
    auto.setAttribute("aria-pressed", String(api.auto));
    random.setAttribute("aria-pressed", String(api.random));
    slow.setAttribute("aria-pressed", String(api.slow));
  }
  for (const event of ["pointerup", "pointercancel"])
    listen(window, event, () => setLiveTilt(0));
  listen(window, "keydown", (e) => {
    if (
      e.repeat || getReplay() ||
      e.target.closest?.("input,select,textarea,[contenteditable=true]")
    )
      return;
    if (["KeyJ", "KeyL"].includes(e.code)) {
      e.preventDefault();
      setLiveTilt(e.code === "KeyJ" ? -1 : 1);
    }
  });
  listen(window, "keyup", (e) => {
    if (["KeyJ", "KeyL"].includes(e.code)) setLiveTilt(0);
  });
  sync();
  return api;
}
