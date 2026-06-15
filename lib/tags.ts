// Contextual tags a member can attach to a vouch — the "why" behind a
// recommendation, replacing the old 1–5 star rating. Mirrors lib/categories.ts:
// a fixed {id,label,emoji} list with id lookup + validation. Tags are optional
// and multiple per vouch; the order here is the order shown in the picker.

export interface Tag {
  id: string;
  label: string;
  emoji: string;
}

export const TAGS: Tag[] = [
  { id: 'fair_price', label: 'Fair Price', emoji: '💸' },
  { id: 'fast_response', label: 'Fast Response', emoji: '⚡' },
  { id: 'reliable', label: 'Reliable', emoji: '🤝' },
  { id: 'quality_work', label: 'Quality Work', emoji: '✨' },
  { id: 'clean_tidy', label: 'Clean & Tidy', emoji: '🧹' },
  { id: 'friendly', label: 'Friendly', emoji: '😊' },
  { id: 'on_time', label: 'On Time', emoji: '📅' },
  { id: 'communication', label: 'Great Communication', emoji: '🗣️' },
  { id: 'knowledgeable', label: 'Knowledgeable', emoji: '🧠' },
  { id: 'good_in_a_pinch', label: 'Good in a Pinch', emoji: '🆘' },
  { id: 'above_beyond', label: 'Goes Above & Beyond', emoji: '💪' },
];

const byId = new Map(TAGS.map((t) => [t.id, t]));

export function getTag(id: string): Tag | undefined {
  return byId.get(id);
}

export function isValidTag(id: string): boolean {
  return byId.has(id);
}

// Server-side cleanup for an incoming tags payload: keep only known tag ids,
// dedupe, and cap at the taxonomy size. Anything non-array yields no tags.
export function sanitizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw === 'string' && isValidTag(raw)) seen.add(raw);
    if (seen.size >= TAGS.length) break;
  }
  return Array.from(seen);
}
