export interface Category {
  id: string;
  label: string;
  emoji: string;
}

export const CATEGORIES: Category[] = [
  { id: 'plumbing', label: 'Plumber', emoji: '🔧' },
  { id: 'electrical', label: 'Electrician', emoji: '💡' },
  { id: 'hvac', label: 'Heating & Cooling', emoji: '🌡️' },
  { id: 'handyman', label: 'Handyman', emoji: '🔨' },
  { id: 'cleaning', label: 'House Cleaning', emoji: '🧹' },
  { id: 'landscaping', label: 'Lawn & Garden', emoji: '🌳' },
  { id: 'roofing', label: 'Roofing', emoji: '🏠' },
  { id: 'painting', label: 'Painting', emoji: '🎨' },
  { id: 'pest', label: 'Pest Control', emoji: '🐜' },
  { id: 'appliance', label: 'Appliance Repair', emoji: '🧺' },
  { id: 'childcare', label: 'Babysitting & Childcare', emoji: '🧸' },
  { id: 'petcare', label: 'Pet Care', emoji: '🐶' },
  { id: 'auto', label: 'Auto Repair', emoji: '🚗' },
  { id: 'moving', label: 'Moving & Hauling', emoji: '📦' },
  { id: 'tech', label: 'Computer & TV Help', emoji: '💻' },
  { id: 'other', label: 'Something Else', emoji: '⭐' },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category {
  return byId.get(id) ?? { id: 'other', label: 'Something Else', emoji: '⭐' };
}

export function isValidCategory(id: string): boolean {
  return byId.has(id);
}
