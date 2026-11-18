/** Route path builders so links never hard-code strings. */
export const routes = {
  home: () => '/',
  homes: () => '/homes',
  welcome: () => '/welcome',
  login: () => '/login',
  register: () => '/register',
  newWall: () => '/walls/new',
  wall: (id: string) => `/walls/${id}`,
  editWall: (id: string) => `/walls/${id}/edit`,
  settings: () => '/settings',
} as const

export const routePatterns = {
  home: '/',
  homes: '/homes',
  join: '/join/:token',
  welcome: '/welcome',
  login: '/login',
  register: '/register',
  newWall: '/walls/new',
  wall: '/walls/:id',
  editWall: '/walls/:id/edit',
  settings: '/settings',
} as const
