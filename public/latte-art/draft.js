const DRAFT_KEY = 'unity-mix.latte-art.draft.v1';
const emptyDraft = () => ({ stage: 'pour', milk: null, strokes: [] });

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
    if (Array.isArray(draft) && draft.length && draft.every(validStroke)) {
      return { stage: 'draw', milk: 'legacy', strokes: draft };
    }
    if (draft?.version === 2 && (draft.stage === 'pour' || draft.stage === 'draw')) {
      const strokes = Array.isArray(draft.strokes) && draft.strokes.every(validStroke) ? draft.strokes : [];
      return { stage: draft.stage, milk: draft.milk ?? null, strokes: draft.stage === 'draw' ? strokes : [],
        ...(typeof draft.volumeSurface === 'boolean' ? { volumeSurface: draft.volumeSurface } : {}) };
    }
  } catch {
    // Storage can be unavailable or contain a partial value.
  }
  return emptyDraft();
}

export function writeDraft(storage, draft) {
  try {
    if (draft.stage === 'draw' || draft.milk) storage?.setItem(DRAFT_KEY, JSON.stringify({ version: 2, ...draft }));
    else storage?.removeItem(DRAFT_KEY);
  } catch {
    // Drawing can continue in memory when the browser disables or fills storage.
  }
}
