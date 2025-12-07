import { 
  Utensils, 
  Bus, 
  ShoppingBag, 
  Home, 
  Gift, 
  HeartPulse, 
  Film, 
  PiggyBank, 
  Plane, 
  Car, 
  Gem,
  MoreHorizontal 
} from 'lucide-react';

export const CATEGORIES = {
  food: { 
    id: 'food', 
    label: 'Food', 
    icon: Utensils, 
    color: 'bg-orange-100 text-orange-600', 
    type: 'expense' 
  },
  transport: { 
    id: 'transport', 
    label: 'Transport', 
    icon: Bus, 
    color: 'bg-blue-100 text-blue-600', 
    type: 'expense' 
  },
  groceries: { 
    id: 'groceries', 
    label: 'Groceries', 
    icon: ShoppingBag, 
    color: 'bg-green-100 text-green-600', 
    type: 'expense' 
  },
  rent: { 
    id: 'rent', 
    label: 'Rent', 
    icon: Home, 
    color: 'bg-indigo-100 text-indigo-600', 
    type: 'expense' 
  },
  gifts: { 
    id: 'gifts', 
    label: 'Gifts', 
    icon: Gift, 
    color: 'bg-pink-100 text-pink-600', 
    type: 'expense' 
  },
  medicine: { 
    id: 'medicine', 
    label: 'Medicine', 
    icon: HeartPulse, 
    color: 'bg-red-100 text-red-600', 
    type: 'expense' 
  },
  entertainment: { 
    id: 'entertainment', 
    label: 'Entertainment', 
    icon: Film, 
    color: 'bg-purple-100 text-purple-600', 
    type: 'expense' 
  },
  savings: { 
    id: 'savings', 
    label: 'Savings', 
    icon: PiggyBank, 
    color: 'bg-emerald-100 text-emerald-600', 
    type: 'expense' // Treated as expense/transfer in cashflow
  },
  travel: { 
    id: 'travel', 
    label: 'Travel', 
    icon: Plane, 
    color: 'bg-sky-100 text-sky-600', 
    type: 'expense' 
  },
  car: { 
    id: 'car', 
    label: 'Car', 
    icon: Car, 
    color: 'bg-zinc-100 text-zinc-600', 
    type: 'expense' 
  },
  wedding: { 
    id: 'wedding', 
    label: 'Wedding', 
    icon: Gem, 
    color: 'bg-rose-100 text-rose-600', 
    type: 'expense' 
  },
  other: { 
    id: 'other', 
    label: 'Other', 
    icon: MoreHorizontal, 
    color: 'bg-gray-100 text-gray-600', 
    type: 'expense' 
  }
};

export const CATEGORY_LIST = Object.values(CATEGORIES);

/**
 * Returns the full category object for a given ID (key).
 * Falls back to 'other' if not found.
 */
export function getCategory(id) {
  return CATEGORIES[id] || CATEGORIES.other;
}

/**
 * Alias for getCategory to strictly return details object {id, label, icon, color}
 */
export function getCategoryDetails(id) {
  return getCategory(id);
}

/**
 * Returns the human-readable label for a category ID.
 */
export function getCategoryLabel(id) {
  return getCategory(id).label;
}

/**
 * Smart resolver that handles both keys ("groceries") and legacy labels ("Groceries").
 * Useful for mapping bill data that might be inconsistent.
 * Returns the canonical category object.
 */
export function resolveCategory(input) {
  if (!input) return CATEGORIES.other;

  // 1. Try exact key match
  if (CATEGORIES[input]) return CATEGORIES[input];

  // 2. Try label match (case-insensitive)
  const lower = String(input).toLowerCase();
  const found = CATEGORY_LIST.find(c => c.label.toLowerCase() === lower);
  
  return found || CATEGORIES.other;
}

/**
 * Returns the canonical key for a given input (key or label).
 */
export function resolveCategoryKey(input) {
  return resolveCategory(input).id;
}