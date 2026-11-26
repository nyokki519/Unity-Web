export const POUR_HEIGHTS = Object.freeze([1, 3.4, 8]);

export function readRecipe(recipe) {
  if (!recipe || typeof recipe !== 'object') return null;
  const fields = {
    espressoMl: [1, 70],
    milkMl: [1, 220],
    temperature: [4, 90],
    foam: [0, 1],
    fineness: [0, 1],
    extraction: [0, 1],
  };
  const clean = {};
  for (const [key, [min, max]] of Object.entries(fields)) {
    const value = recipe[key];
    if (!Number.isFinite(value) || value < min || value > max) return null;
    clean[key] = value;
  }
  if (Number.isFinite(recipe.separation)) {
    clean.separation = Math.max(0, Math.min(1, recipe.separation));
  }
  if (Number.isFinite(recipe.espressoTemperature)) {
    clean.espressoTemperature = Math.max(5, Math.min(95, recipe.espressoTemperature));
  }
  if (Number.isInteger(recipe.seed)) clean.seed = recipe.seed >>> 0;
  return clean;
}

export function milkProfile(recipe) {
  if (!recipe) return null;
  return {
    espressoMl: recipe.espressoMl,
    milkMl: recipe.milkMl,
    temperatureC: recipe.temperature,
    aeration: recipe.foam,
    coarseness: 1 - recipe.fineness,
    separation: recipe.separation ?? 0,
    crema: recipe.extraction,
    seed: recipe.seed,
  };
}

export function cupNotes(recipe, amount) {
  const foamLabel = recipe.foam < .10 ? '泡が少なめ'
    : recipe.fineness < .48 ? '粗い泡が多い'
      : recipe.foam > .31 ? '厚めの泡' : 'なめらか';
  let tip = '液面近くから少しずつ注ぐと、白い模様の幅を調整しやすくなります。';
  if (amount < 8) tip = '高めから少量をなじませ、次に液面近くで白を浮かべてみましょう。';
  if (recipe.extraction < .48) tip = '次は抽出の量と時間を見比べ、クレマの色が薄くなる前に止めてみましょう。';
  if (recipe.foam < .10) tip = '次は冷たいうちにノズルを液面の近くへ寄せ、短く空気を入れてみましょう。';
  if (recipe.fineness < .48) tip = '次は空気を入れた後、ノズルを少し沈めて渦で泡を整えてみましょう。';
  if (recipe.temperature < 52) tip = '次は泡を整えながら、温度がもう少し上がるまで温めてみましょう。';
  if (recipe.temperature > 68) tip = '次は温度が60〜65℃に近づいたところで、早めにスチームを止めてみましょう。';
  return { foamLabel, tip };
}
