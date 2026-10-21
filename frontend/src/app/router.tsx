import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppShell } from '@/app/layout/AppShell'
import { routePatterns } from '@/app/routes'
import { WallDetailPage } from '@/features/find/WallDetailPage'
import { WallListPage } from '@/features/find/WallListPage'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: routePatterns.home, element: <WallListPage /> },
      { path: routePatterns.wall, element: <WallDetailPage /> },
      { path: '*', element: <Navigate to={routePatterns.home} replace /> },
    ],
  },
])
