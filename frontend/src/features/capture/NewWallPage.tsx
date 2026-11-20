import { useNavigate, useSearchParams } from 'react-router-dom'

import { routes } from '@/app/routes'
import { PageHeader } from '@/components/ui'
import { useKnownClients, useKnownRooms } from '@/features/capture/useKnownRooms'
import { WallForm } from '@/features/capture/WallForm'
import { emptyDraft } from '@/features/capture/wallDraft'
import { useSignedInUser } from '@/hooks/useAuth'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useCreateWall } from '@/hooks/useWallMutations'

export function NewWallPage() {
  const navigate = useNavigate()
  // Opened from a client's page: their email is already known.
  const [params] = useSearchParams()
  const homeownerEmail = params.get('homeowner') ?? ''
  const createWall = useCreateWall()
  const knownRooms = useKnownRooms()
  const knownClients = useKnownClients()
  const user = useSignedInUser()
  // Starts as the account name; remembers an edit such as a company name, per account.
  const [lastAuthor, setLastAuthor] = useLocalStorage(`btw.lastAuthor.${user.id}`, user.name)

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Record a wall" backTo={routes.home()} />
      <WallForm
        initialDraft={emptyDraft(lastAuthor, homeownerEmail)}
        knownRooms={knownRooms}
        submitLabel="Save wall"
        submitting={createWall.isPending}
        submitError={createWall.error}
        destination={{ mode: 'choose', knownClientEmails: knownClients.map((c) => c.email) }}
        onSubmit={(input) => {
          setLastAuthor(input.author)
          createWall.mutate(input, { onSuccess: (wall) => navigate(routes.wall(wall.id), { replace: true }) })
        }}
      />
    </div>
  )
}
