import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppShell } from '@/app/layout/AppShell'
import { routePatterns } from '@/app/routes'
import { AuthLayout } from '@/features/auth/AuthLayout'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { RequireAuth, TradespersonOnly } from '@/features/auth/RequireAuth'
import { EditWallPage } from '@/features/capture/EditWallPage'
import { NewWallPage } from '@/features/capture/NewWallPage'
import { PhoneOnly } from '@/features/capture/PhoneOnly'
import { WallDetailPage } from '@/features/find/WallDetailPage'
import { WallListPage } from '@/features/find/WallListPage'
import { Landing } from '@/features/marketing/Landing'
import { SettingsPage } from '@/features/settings/SettingsPage'

export const router = createBrowserRouter([
  // Signed-out visitors also get the landing page at "/" (see RequireAuth). Here it is
  // reachable by everyone, including signed-in users clicking the logo.
  { path: routePatterns.welcome, element: <Landing /> },
  {
    element: <AuthLayout />,
    children: [
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
            <PhoneOnly title="Record a wall">
              <NewWallPage />
            </PhoneOnly>
          </TradespersonOnly>
        ),
      },
      { path: routePatterns.wall, element: <WallDetailPage /> },
      {
        path: routePatterns.editWall,
        element: (
          <TradespersonOnly>
            <PhoneOnly title="Edit this wall">
              <EditWallPage />
            </PhoneOnly>
          </TradespersonOnly>
        ),
      },
      { path: routePatterns.settings, element: <SettingsPage /> },
      { path: '*', element: <Navigate to={routePatterns.home} replace /> },
    ],
  },
])
