/** Original Unity Salon chips. Values are display units, never ledger cents. */
const VALUES = new Set([1,10,100,500,1000,5000]);
export function chipArt(value) {
  const number = Number(value);
  if (VALUES.has(number)) return new URL(`./salon-assets/chip-${number}.svg`, import.meta.url).href;
  const label = Number.isFinite(number) && number >= 0 ? Math.floor(number).toLocaleString('en-US') : '•';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="208" viewBox="0 0 200 208"><circle cx="100" cy="105" r="94" fill="#071319"/><circle cx="100" cy="99" r="94" fill="#164c43" stroke="#b59b67" stroke-width="4"/><circle cx="100" cy="99" r="80" fill="none" stroke="#f1e8d7" stroke-width="12" stroke-dasharray="10 30"/><circle cx="100" cy="99" r="66" fill="#101b24" stroke="#b59b67"/><text x="100" y="77" text-anchor="middle" font-family="Georgia" font-size="12" fill="#b59b67" letter-spacing="3">UNITY</text><text x="100" y="121" text-anchor="middle" font-family="Georgia" font-size="28" fill="#f1e8d7">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
export function createChip(value) {
  const img = document.createElement('img');
  img.src = chipArt(value); img.alt = `${value} chip`; img.width = 200; img.height = 208; img.draggable = false;
  return img;
}
export const titleCardArt = new URL('./salon-assets/title-ace.svg', import.meta.url).href;
export const titleBackArt = new URL('./salon-assets/title-back.svg', import.meta.url).href;
export const communityMarkArt = new URL('./salon-assets/community-mark.svg', import.meta.url).href;
