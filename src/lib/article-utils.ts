// ============================================================
//  Article helpers — category → accent tone mapping for the
//  editorial blog cards/chips. Mirrors the designer's CAT_COLOR
//  map, falling back to a deterministic tone for any other tag so
//  a given category always gets the same colour.
// ============================================================
export type Tone = 'coral' | 'green' | 'blue';

const KNOWN: Record<string, Tone> = {
  editorial: 'coral',
  'style guide': 'blue',
  interviews: 'green',
  sustainability: 'green',
  'behind the seams': 'coral',
};

const CYCLE: Tone[] = ['coral', 'blue', 'green'];

/** Resolve a category/tag string to one of the three accent tones. */
export function categoryTone(category: string): Tone {
  const key = category.trim().toLowerCase();
  if (KNOWN[key]) return KNOWN[key];
  // Deterministic fallback — sum char codes so the same tag is stable.
  let sum = 0;
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i);
  return CYCLE[sum % CYCLE.length];
}
