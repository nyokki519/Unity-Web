export const WIDTH = 420,
  HEIGHT = 760,
  BALL_RADIUS = 4,
  FIXED_DT = 1 / 240;
export const DIFFICULTIES = {
  practice: { label: "練習", winRadius: 27, drainRadius: 6, drains: 6 },
  normal: { label: "標準", winRadius: 12, drainRadius: 7, drains: 8 },
  hard: { label: "上級", winRadius: 8, drainRadius: 8, drains: 10 },
};
export function getBoard(difficulty = "practice") {
  const d = DIFFICULTIES[difficulty] || DIFFICULTIES.practice;
  return {
    width: WIDTH,
    height: HEIGHT,
    left: 12,
    right: 408,
    entry: {
      x: 210,
      y: 220,
      width:
        difficulty === "practice" ? 360 : difficulty === "normal" ? 140 : 100,
    },
    launcher: { x: 380, y: 210 },
    pins: Array.from({ length: 15 }, (_, i) => ({
      x: 65 + (i % 5) * 68 + (Math.floor(i / 5) % 2) * 20,
      y: 65 + Math.floor(i / 5) * 48,
      r: 6,
    })),
    trays: [330, 500, 670].map((cy, stage) => ({
      cx: 210,
      cy,
      radius: 112,
      scaleY: 0.43,
      tiltX: 0,
      tiltY: 0,
      spring: 2.8,
      drag: 1,
      holes: [
        {
          id: "win",
          x:
            difficulty === "practice"
              ? 0
              : stage
                ? (difficulty === "normal" ? 40.5 : 37.5) *
                  Math.cos(stage === 1 ? 1.7 : 2.1)
                : 25,
          y:
            difficulty === "practice"
              ? 0
              : stage
                ? (difficulty === "normal" ? 40.5 : 37.5) *
                  Math.sin(stage === 1 ? 1.7 : 2.1)
                : 30,
          r: d.winRadius,
          win: true,
        },
        ...(difficulty === "practice"
          ? []
          : [
              {
                id: "center",
                x: 0,
                y: 0,
                r: difficulty === "normal" ? 8 : 10,
                win: false,
              },
            ]),
        ...Array.from({ length: d.drains }, (_, i) => ({
          id: `drain-${i}`,
          x: 72 * Math.cos((i * 2 * Math.PI) / d.drains),
          y: 72 * Math.sin((i * 2 * Math.PI) / d.drains),
          r: d.drainRadius,
          win: false,
        })),
      ],
    })),
  };
}
