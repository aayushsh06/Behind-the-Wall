import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { routes } from '@/app/routes'
import { Button, ErrorMessage } from '@/components/ui'
import { ShareSheet } from '@/features/handoff/ShareSheet'
import { useDeleteWall } from '@/hooks/useWallMutations'

interface WallActionsProps {
  wallId: string
  title: string
}

/** Sticky action bar on the record view: share (primary), edit, delete with inline confirm. */
export function WallActions({ wallId, title }: WallActionsProps) {
  const navigate = useNavigate()
  const deleteWall = useDeleteWall()
  const [shareOpen, setShareOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleDelete = () =>
    deleteWall.mutate(wallId, { onSuccess: () => navigate(routes.home(), { replace: true }) })

  return (
    <>
      <div
        className="fixed inset-x-0 bottom-14 z-30 border-t border-stone-200 bg-white/95 backdrop-blur"
        style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <div className="mx-auto flex max-w-lg gap-2 px-4 py-2">
          {confirmDelete ? (
            <>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleteWall.isPending}>
                Keep
              </Button>
              <Button variant="danger" fullWidth loading={deleteWall.isPending} onClick={handleDelete}>
                Delete this wall
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" aria-label="Delete wall" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
              <Link to={routes.editWall(wallId)} className="contents">
                <Button variant="secondary">Edit</Button>
              </Link>
              <Button fullWidth onClick={() => setShareOpen(true)}>
                Share this wall
              </Button>
            </>
          )}
        </div>
        {deleteWall.isError ? (
          <div className="mx-auto max-w-lg px-4 pb-2">
            <ErrorMessage error={deleteWall.error} />
          </div>
        ) : null}
      </div>
      <ShareSheet open={shareOpen} wallId={wallId} title={title} onClose={() => setShareOpen(false)} />
    </>
  )
}
