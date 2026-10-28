import { ApiError, http } from '@/api/client'
import type { Role, User } from '@/domain/types'

export interface RegisterInput {
  name: string
  email: string
  password: string
  role: Role
}

export interface LoginInput {
  email: string
  password: string
}

export const authApi = {
  register: (input: RegisterInput) => http.post<User>('/auth/register', input),
  login: (input: LoginInput) => http.post<User>('/auth/login', input),
  logout: () => http.post<void>('/auth/logout', {}),
  /** The signed-in user, or null when there is no valid session. */
  me: async (): Promise<User | null> => {
    try {
      return await http.get<User>('/auth/me')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) return null
      throw error
    }
  },
}
