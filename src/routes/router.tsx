import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../components/layout/AppLayout'
import { AnalyticsPage } from '../pages/AnalyticsPage'
import { DashboardPage } from '../pages/DashboardPage'
import { LoginPage } from '../pages/LoginPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { OnboardingPage } from '../pages/OnboardingPage'
import { SettingsPage } from '../pages/SettingsPage'
import { SmallSpendsPage } from '../pages/SmallSpendsPage'
import { TransactionsPage } from '../pages/TransactionsPage'
import { ProtectedRoute } from './ProtectedRoute'
import { ROUTES } from './paths'

/** Application route table. Screens are placeholders until built in later phases. */
export const router = createBrowserRouter([
  { path: ROUTES.onboarding, element: <OnboardingPage /> },
  { path: ROUTES.login, element: <LoginPage /> },
  {
    element: <ProtectedRoute />,
    children: [
      {
        path: ROUTES.dashboard,
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: ROUTES.transactions, element: <TransactionsPage /> },
          { path: ROUTES.smallSpends, element: <SmallSpendsPage /> },
          { path: ROUTES.analytics, element: <AnalyticsPage /> },
          { path: ROUTES.settings, element: <SettingsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
