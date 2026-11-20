import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppShell } from '@/app/layout/AppShell'
import { routePatterns } from '@/app/routes'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { VerifyEmailPage } from '@/features/auth/EmailConfirmation'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { RequireAuth, TradespersonOnly } from '@/features/auth/RequireAuth'
import { WelcomePage } from '@/features/auth/WelcomePage'
import { EditWallPage } from '@/features/capture/EditWallPage'
import { NewWallPage } from '@/features/capture/NewWallPage'
import { WallDetailPage } from '@/features/find/WallDetailPage'
import { WallListPage } from '@/features/find/WallListPage'
import { SettingsPage } from '@/features/settings/SettingsPage'

export const router = createBrowserRouter([
  // Works signed in or out, so it sits outside both the public and signed-in layouts.
  { path: routePatterns.verifyEmail, element: <VerifyEmailPage /> },
  {
    element: <AuthLayout />,
    children: [
      { path: routePatterns.welcome, element: <WelcomePage /> },
      { path: routePatterns.login, element: <LoginPage /> },
      { path: routePatterns.register, element: <RegisterPage /> },
    ],
  },
  {
    element: (
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    ),
    children: [
      { path: routePatterns.home, element: <WallListPage /> },
      {
        path: routePatterns.newWall,
        element: (
          <TradespersonOnly>
            <NewWallPage />
          </TradespersonOnly>
        ),
      },
      { path: routePatterns.wall, element: <WallDetailPage /> },
      {
        path: routePatterns.editWall,
        element: (
          <TradespersonOnly>
            <EditWallPage />
          </TradespersonOnly>
        ),
      },
      { path: routePatterns.settings, element: <SettingsPage /> },
      { path: '*', element: <Navigate to={routePatterns.home} replace /> },
    ],
  },
])
