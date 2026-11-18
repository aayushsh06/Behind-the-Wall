import { http } from '@/api/client'

export type HomePermission = 'owner' | 'viewer' | 'editor'
export interface Home {
  id: string
  name: string
  permission: HomePermission
}

export interface HomeMember {
  user_id: string
  name: string
  email: string
  permission: 'viewer' | 'editor'
}

export interface Invitation {
  id: string
  token: string
  permission: 'viewer' | 'editor'
  expires_at: string
}

export const homesApi = {
  list: () => http.get<Home[]>('/homes'),
  create: (name: string) => http.post<Home>('/homes', { name }),
  invite: (homeId: string, permission: 'viewer' | 'editor') =>
    http.post<Invitation>(`/homes/${homeId}/invitations`, { permission }),
  accept: (token: string) => http.post<Home>('/homes/accept-invitation', { token }),
  revoke: (homeId: string, invitationId: string) =>
    http.delete(`/homes/${homeId}/invitations/${invitationId}`),
  invitations: (homeId: string) =>
    http.get<Omit<Invitation, 'token'>[]>(`/homes/${homeId}/invitations`),
  members: (homeId: string) => http.get<HomeMember[]>(`/homes/${homeId}/members`),
  removeMember: (homeId: string, userId: string) =>
    http.delete(`/homes/${homeId}/members/${userId}`),
}
