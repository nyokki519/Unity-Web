const DRAFT_KEY = 'unity-mix.latte-art.draft.v1';

function validStroke(stroke) {
  return stroke && Number.isFinite(stroke.width) && stroke.width > 0 && stroke.width <= .08
    && typeof stroke.color === 'string' && /^#[0-9a-f]{6}$/i.test(stroke.color)
    && Array.isArray(stroke.paths) && stroke.paths.length > 0
    && stroke.paths.every(path => Array.isArray(path) && path.length > 0
      && path.every(point => point && Number.isFinite(point.x) && Number.isFinite(point.y)
        && point.x ** 2 + point.y ** 2 <= 1.000001));
}

export function readDraft(storage) {
  try {
    const draft = JSON.parse(storage?.getItem(DRAFT_KEY) ?? 'null');
    return Array.isArray(draft) && draft.every(validStroke) ? draft : [];
  } catch {
    return [];
  }
}

export function writeDraft(storage, strokes) {
  try {
    if (strokes.length) storage?.setItem(DRAFT_KEY, JSON.stringify(strokes));
    else storage?.removeItem(DRAFT_KEY);
  } catch {
    // Drawing can continue in memory when the browser disables or fills storage.
  }
}
