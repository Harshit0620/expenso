/**
 * Default spending categories.
 *
 * This is a frontend-side fallback/seed list only. Categories are expected to
 * live in the `categories` table in Supabase (source of truth). These values
 * exist so the UI has a stable set of labels/slugs before data is connected.
 *
 * Designed to later support automatic + AI categorization and user correction
 * without a complex system.
 */

export interface CategoryConfig {
  /** Stable machine key used in code and analytics. */
  slug: string
  /** Human-readable label shown in the UI. */
  label: string
}

export const DEFAULT_CATEGORIES: readonly CategoryConfig[] = [
  { slug: 'food', label: 'Food' },
  { slug: 'groceries', label: 'Groceries' },
  { slug: 'travel', label: 'Travel' },
  { slug: 'shopping', label: 'Shopping' },
  { slug: 'entertainment', label: 'Entertainment' },
  { slug: 'bills', label: 'Bills' },
  { slug: 'subscriptions', label: 'Subscriptions' },
  { slug: 'health', label: 'Health' },
  { slug: 'education', label: 'Education' },
  { slug: 'other', label: 'Other' },
] as const
