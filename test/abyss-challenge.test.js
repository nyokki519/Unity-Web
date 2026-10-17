import test from "node:test";
import assert from "node:assert/strict";
const challenge = await import("../public/js/abyss/challenge-policy.js").catch(
  () => ({}),
);
test("virtual funds charge only successful launches and add a distinct jackpot reward", () => {
  assert.equal(typeof challenge.challengeFunds, "function");
  assert.equal(
    challenge.challengeFunds({ initialBalls: 100, fired: 0, jackpots: 0 }),
    1000,
  );
  assert.equal(
    challenge.challengeFunds({ initialBalls: 100, fired: 2, jackpots: 1 }),
    5980,
  );
});
test("rejected random launch keeps same next power and pause never launches", () => {
  assert.equal(typeof challenge.createLaunchPolicy, "function");
  const a = challenge.createLaunchPolicy("a"),
    b = challenge.createLaunchPolicy("a");
  let power = a.peek(50, true);
  assert.ok(power >= 35 && power <= 65);
  assert.equal(a.peek(50, true), power);
  a.commit(false);
  assert.equal(a.peek(50, true), b.peek(50, true));
  a.commit(true);
  b.commit(true);
  assert.equal(a.peek(50, true), b.peek(50, true));
  assert.equal(
    challenge.launchAllowed({
      status: "paused",
      remaining: 3,
      balls: [],
      board: { maxBalls: 3 },
    }),
    false,
  );
});
