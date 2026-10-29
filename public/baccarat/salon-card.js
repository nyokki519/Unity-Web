const atlas = new URL('./classic-cards.png', import.meta.url).href;
export function frameForCard(card, hidden = false) {
 if (hidden) return 53;
 const id = typeof card === 'object' && card !== null ? card.card ?? card.id : card;
 if (!Number.isInteger(id) || id < 0) throw new TypeError('Invalid card');
 return id % 52;
}
export function createCard(card, {hidden = false} = {}) {
 const frame = frameForCard(card, hidden), el = document.createElement('span');
 el.className = 'salon-card'; el.setAttribute('role', 'img');
 const ranks = ['エース','2','3','4','5','6','7','8','9','10','ジャック','クイーン','キング'];
 const suits = ['スペード','ハート','ダイヤ','クラブ'];
 el.setAttribute('aria-label', hidden ? '裏向きのカード' : `${suits[Math.floor(frame / 13)]}の${ranks[frame % 13]}`);
 el.style.backgroundImage = `url("${atlas}")`;
 el.style.backgroundSize = '1300% 500%';
 el.style.backgroundPosition = `${(frame % 13) / 12 * 100}% ${Math.floor(frame / 13) / 4 * 100}%`;
 return el;
}
