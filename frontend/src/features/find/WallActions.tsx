import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { exportsApi } from '@/api/exports'
import { routes } from '@/app/routes'
import { Button, ErrorMessage } from '@/components/ui'
import { ShareSheet } from '@/features/handoff/ShareSheet'
import { useDeleteWall } from '@/hooks/useWallMutations'

interface WallActionsProps {
  wallId: string
  title: string
  /** Read-only accounts (homeowners) get PDF actions instead of share/edit/delete. */
  readOnly: boolean
  canEdit: boolean
  canDelete: boolean
}

const BAR =
  'fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom,0px))] z-30 border-t border-line bg-surface md:static md:border-0 md:bg-transparent'
const ROW = 'mx-auto flex max-w-lg gap-2 px-4 py-2.5 md:max-w-none md:p-0'

/**
 * Record actions: a fixed bar above the tab bar on phones; inline in the page header on
 * larger screens. Homeowners open or download the PDF; tradespeople share, edit, delete.
 */
export function WallActions({ wallId, title, readOnly, canEdit, canDelete }: WallActionsProps) {
  const navigate = useNavigate()
  const deleteWall = useDeleteWall()
  const [shareOpen, setShareOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (readOnly) {
    return (
      <div className={BAR}>
        <div className={ROW}>
          <a href={exportsApi.url(wallId, 'pdf', true)} className="contents">
            <Button variant="secondary">Download</Button>
          </a>
          <a href={exportsApi.url(wallId, 'pdf')} target="_blank" rel="noopener" className="flex-1 md:flex-none">
            <Button fullWidth>Open PDF</Button>
          </a>
        </div>
      </div>
    )
  }

  const handleDelete = () =>
    deleteWall.mutate(wallId, { onSuccess: () => navigate(routes.home(), { replace: true }) })

  return (
    <>
      <div className={BAR}>
        <div className={ROW}>
          {confirmDelete ? (
            <>
              <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={deleteWall.isPending}>
                Keep
              </Button>
              <Button variant="danger" className="w-full md:w-auto" loading={deleteWall.isPending} onClick={handleDelete}>
                Delete this wall
              </Button>
            </>
          ) : (
            <>
              {canDelete ? (
                <Button variant="ghost" aria-label="Delete wall" onClick={() => setConfirmDelete(true)}>
                  Delete
                </Button>
              ) : null}
              {canEdit ? (
                <Link to={routes.editWall(wallId)} className="contents">
                  <Button variant="secondary">Edit</Button>
                </Link>
              ) : null}
              <Button className="w-full md:w-auto" onClick={() => setShareOpen(true)}>
                Share PDF
              </Button>
            </>
          )}
        </div>
        {deleteWall.isError ? (
          <div className="mx-auto max-w-lg px-4 pb-2 md:mt-2 md:p-0">
            <ErrorMessage error={deleteWall.error} />
          </div>
        ) : null}
      </div>
      <ShareSheet open={shareOpen} wallId={wallId} title={title} onClose={() => setShareOpen(false)} />
    </>
  )
}
