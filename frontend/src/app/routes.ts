/** Route path builders so links never hard-code strings. */
export const routes = {
  home: () => '/',
  /** The public landing page; open to everyone, signed in or not. */
  landing: () => '/welcome',
  login: () => '/login',
  register: () => '/register',
  /** Record a wall; optionally for a known client (prefills their email). */
  newWall: (homeownerEmail?: string) =>
    homeownerEmail ? `/walls/new?homeowner=${encodeURIComponent(homeownerEmail)}` : '/walls/new',
  wall: (id: string) => `/walls/${id}`,
  /** One client's walls (tradespeople). `key` is the homeowner id or `invite:<email>`. */
  client: (key: string) => `/clients/${encodeURIComponent(key)}`,
  editWall: (id: string) => `/walls/${id}/edit`,
  settings: () => '/settings',
} as const

export const routePatterns = {
  home: '/',
  welcome: '/welcome',
  login: '/login',
  register: '/register',
  newWall: '/walls/new',
  wall: '/walls/:id',
  client: '/clients/:key',
  editWall: '/walls/:id/edit',
  settings: '/settings',
} as const
