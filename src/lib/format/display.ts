import { createElement, type ReactElement } from 'react'
import {
  Bus,
  Coffee,
  GraduationCap,
  HeartPulse,
  Home,
  Repeat,
  ShoppingBag,
  ShoppingCart,
  Tag,
  Utensils,
  Film,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { DEFAULT_CATEGORIES } from '../config/categories'

/** slug → category label, from the single source of truth. */
const LABELS = new Map(DEFAULT_CATEGORIES.map((c) => [c.slug, c.label]))

/** Human label for a category id/slug, with a safe fallback. */
export function categoryLabel(categoryId: string | null | undefined): string {
  if (!categoryId) return 'Uncategorized'
  return LABELS.get(categoryId) ?? 'Uncategorized'
}

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  food: Utensils,
  groceries: ShoppingCart,
  travel: Bus,
  shopping: ShoppingBag,
  entertainment: Film,
  bills: Home,
  subscriptions: Repeat,
  health: HeartPulse,
  education: GraduationCap,
  other: Tag,
}

export function categoryIcon(categoryId: string | null | undefined): LucideIcon {
  if (!categoryId) return Coffee
  return CATEGORY_ICONS[categoryId] ?? Tag
}

/**
 * Renders the category icon as an element.
 *
 * Uses `createElement` (not a `<Icon />` variable) so no component is created
 * during render — keeps `react-hooks/static-components` happy.
 */
export function categoryIconElement(
  categoryId: string | null | undefined,
  className?: string,
): ReactElement {
  return createElement(categoryIcon(categoryId), { className, 'aria-hidden': true })
}
