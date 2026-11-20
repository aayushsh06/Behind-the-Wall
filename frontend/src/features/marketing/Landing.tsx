import { AuthChrome } from '@/features/auth/AuthLayout'
import { WelcomePage } from '@/features/auth/WelcomePage'

/** The public home page, shown at "/" to visitors who aren't signed in. */
export function Landing() {
  return (
    <AuthChrome>
      <WelcomePage />
    </AuthChrome>
  )
}
