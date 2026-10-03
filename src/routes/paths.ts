/** Central route path constants — avoids hardcoding strings in components. */
export const ROUTES = {
  dashboard: '/',
  transactions: '/transactions',
  smallSpends: '/small-spends',
  analytics: '/analytics',
  settings: '/settings',
  onboarding: '/onboarding',
  login: '/login',
} as const

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES]
