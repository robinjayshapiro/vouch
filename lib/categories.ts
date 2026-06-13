export interface Category {
  id: string;
  label: string;
  emoji: string;
}

// Grouped loosely (trades → outdoor → home → life) but kept as one flat list;
// the order here is the order shown in the picker and dropdown.
export const CATEGORIES: Category[] = [
  // Trades
  { id: 'plumbing', label: 'Plumber', emoji: '🔧' },
  { id: 'electrical', label: 'Electrician', emoji: '💡' },
  { id: 'hvac', label: 'Heating & Cooling', emoji: '🌡️' },
  { id: 'handyman', label: 'Handyman', emoji: '🔨' },
  { id: 'contractor', label: 'Contractor & Remodel', emoji: '🏗️' },
  { id: 'masonry', label: 'Masonry & Driveways', emoji: '🧱' },
  { id: 'roofing', label: 'Roofing', emoji: '🏠' },
  { id: 'gutters', label: 'Gutters', emoji: '🌧️' },
  { id: 'painting', label: 'Painting', emoji: '🎨' },
  { id: 'chimney', label: 'Chimney & Fireplace', emoji: '🔥' },
  // Outdoor
  { id: 'landscaping', label: 'Lawn & Landscaping', emoji: '🌳' },
  { id: 'sprinklers', label: 'Sprinklers & Irrigation', emoji: '💧' },
  { id: 'tree', label: 'Tree Service', emoji: '🌲' },
  { id: 'snow', label: 'Snow Removal', emoji: '❄️' },
  { id: 'pool', label: 'Pool & Spa', emoji: '🏊' },
  // Home
  { id: 'cleaning', label: 'House Cleaning', emoji: '🧹' },
  { id: 'powerwash', label: 'Power Washing', emoji: '💦' },
  { id: 'windows_doors', label: 'Windows & Doors', emoji: '🚪' },
  { id: 'appliance', label: 'Appliance Repair', emoji: '🧺' },
  { id: 'water_air', label: 'Water, Air & Insulation', emoji: '🚰' },
  // Pests
  { id: 'pest', label: 'Pest & Wildlife', emoji: '🐜' },
  // Life
  { id: 'auto', label: 'Auto & Transport', emoji: '🚗' },
  { id: 'moving', label: 'Moving & Hauling', emoji: '📦' },
  { id: 'tech', label: 'Tech, AV & Security', emoji: '🎥' },
  { id: 'childcare', label: 'Babysitting & Childcare', emoji: '🧸' },
  { id: 'petcare', label: 'Pet Care', emoji: '🐶' },
  { id: 'events', label: 'Party & Events', emoji: '🎉' },
  { id: 'professional', label: 'Professional Services', emoji: '💼' },
  { id: 'other', label: 'Something Else', emoji: '⭐' },
];

const byId = new Map(CATEGORIES.map((c) => [c.id, c]));

export function getCategory(id: string): Category {
  return byId.get(id) ?? { id: 'other', label: 'Something Else', emoji: '⭐' };
}

export function isValidCategory(id: string): boolean {
  return byId.has(id);
}
