// Maps free-text vendor "Type" strings (from the Gates spreadsheet, and any
// future import) onto Vouch category ids. First matching rule wins, so order
// is significant: specific patterns sit above generic ones.
const RULES = [
  [/plumb/i, 'plumbing'],
  [/dryer/i, 'appliance'], // before "vent" so "Dryer Vent Repair" is an appliance
  [/chimney|fireplace/i, 'chimney'],
  [/roof/i, 'roofing'],
  [/gutter/i, 'gutters'],
  [/power\s*wash/i, 'powerwash'],
  [/shower door|garage door|window/i, 'windows_doors'],
  [/sprinkler|irrigation/i, 'sprinklers'],
  [/tree/i, 'tree'],
  [/snow|plow/i, 'snow'],
  [/pool|spa/i, 'pool'],
  [/insulation|water filtration|mold|air quality|vent/i, 'water_air'],
  [/generator|electric|christmas lights|exteriror lights|exterior lights/i, 'electrical'],
  [/hvac|boiler|propane|heating|cooling/i, 'hvac'],
  [/masonry|masonary|driveway|outdoor kitch/i, 'masonry'],
  [/contractor|remodel|tennis/i, 'contractor'],
  [/\bcar\b|mechanic|airport|detail|vehicle|auto/i, 'auto'], // before "broker"
  [/architect|\blaw\b|estate|real estate|broker|attorney|financial|insurance|accounting|planning/i, 'professional'],
  [/grill|bbq/i, 'cleaning'],
  [/grout|tile/i, 'handyman'],
  [/appliance|repair maintenance/i, 'appliance'],
  [/exterminator|pest|mosquito|animal|wildlife|rodent/i, 'pest'],
  [/shrink wrap|unwrap|sanitation|garbage/i, 'other'],
  [/moving|hauling/i, 'moving'],
  [/\bav\b|sonos|camera|security|computer|\btv\b|sound|theater/i, 'tech'],
  [/bartender|server|ice cream|party|event|caterer|catering|\bdj\b/i, 'events'],
  [/babysit|child|nanny|daycare/i, 'childcare'],
  [/pet|dog|\bcat\b|groom/i, 'petcare'],
  [/clean/i, 'cleaning'],
  [/landscap|lawn|garden|grass|\bsod\b/i, 'landscaping'],
  [/handyman|handy|closet/i, 'handyman'],
  [/paint/i, 'painting'],
];

export function mapType(type) {
  const t = type ?? '';
  for (const [re, id] of RULES) if (re.test(t)) return id;
  return 'other';
}
