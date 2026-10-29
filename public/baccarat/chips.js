/** Wallet values are hundredths of a displayed chip unit. */
export const CHIP_DENOMINATIONS = Object.freeze([50000, 10000, 5000, 1000, 500, 100]);
export function chipAsset(amount) {
  if (!CHIP_DENOMINATIONS.includes(amount)) throw new RangeError('Unknown chip denomination');
  return `./chips/${amount}.svg`;
}
/** Greedy representation; residual amounts below one chip stay in the wager label. */
export function wagerChips(amount, maxVisible = 5) {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new RangeError('Amount must be a nonnegative safe integer');
  if (!Number.isInteger(maxVisible) || maxVisible < 1 || maxVisible > 12) throw new RangeError('Visible cap must be an integer from 1 to 12');
  const visible = [];
  let remaining = BigInt(amount), total = 0n;
  for (const denomination of CHIP_DENOMINATIONS) {
    const unit = BigInt(denomination), count = remaining / unit;
    remaining %= unit;
    total += count;
    const take = Math.min(Number(count), maxVisible - visible.length);
    for (let i = 0; i < take; i++) visible.push(denomination);
  }
  const totalCount = Number(total);
  return { visible, hiddenCount: totalCount - visible.length, totalCount };
}
