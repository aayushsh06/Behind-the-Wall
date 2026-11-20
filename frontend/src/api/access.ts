import { http } from '@/api/client'
import type { AccessGrant, HomeownerStatus, InviteResult } from '@/domain/types'

export type AccessDecision = 'approve' | 'decline' | 'revoke'

export const accessApi = {
  list: () => http.get<AccessGrant[]>('/access-requests'),
  request: (homeownerEmail: string, message: string) =>
    http.post<AccessGrant>('/access-requests', { homeowner_email: homeownerEmail, message }),
  decide: (id: string, decision: AccessDecision) =>
    http.post<AccessGrant>(`/access-requests/${id}/decision`, { decision }),
}

export const invitesApi = {
  lookup: (email: string) =>
    http.get<{ email: string; status: HomeownerStatus }>(
      `/homeowners/lookup?email=${encodeURIComponent(email)}`,
    ),
  send: (email: string) => http.post<InviteResult>('/invites', { email }),
}
