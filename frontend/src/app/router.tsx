import { createBrowserRouter, Navigate } from 'react-router-dom'

import { AppShell } from '@/app/layout/AppShell'
import { routePatterns } from '@/app/routes'
import { EditWallPage } from '@/features/capture/EditWallPage'
import { NewWallPage } from '@/features/capture/NewWallPage'
import { WallDetailPage } from '@/features/find/WallDetailPage'
import { WallListPage } from '@/features/find/WallListPage'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    children: [
      { path: routePatterns.home, element: <WallListPage /> },
      { path: routePatterns.newWall, element: <NewWallPage /> },
      { path: routePatterns.wall, element: <WallDetailPage /> },
      { path: routePatterns.editWall, element: <EditWallPage /> },
      { path: '*', element: <Navigate to={routePatterns.home} replace /> },
    ],
  },
])
