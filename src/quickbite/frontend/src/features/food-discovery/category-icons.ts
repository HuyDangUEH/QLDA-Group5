import { Cookie, CupSoda, Salad, Sandwich, Soup, UtensilsCrossed, type LucideIcon } from 'lucide-react';

/** Ánh xạ tên icon lưu trong DB (food_categories.icon) sang icon Lucide */
const ICONS: Record<string, LucideIcon> = {
  utensils: UtensilsCrossed,
  soup: Soup,
  sandwich: Sandwich,
  'cup-soda': CupSoda,
  cookie: Cookie,
  salad: Salad,
};

export const categoryIcon = (name: string | null | undefined): LucideIcon => (name && ICONS[name]) || UtensilsCrossed;
