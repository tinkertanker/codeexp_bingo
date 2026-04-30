import { useCallback, useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { approveCompletion, rejectCompletion } from '../../lib/admin'
import { publicPhotoUrl } from '../../lib/storage'
import { supabase, type BingoSquare, type SquareCompletion, type Team } from '../../lib/supabase'

type Pending = SquareCompletion & {
  team: Team
  square: BingoSquare
}

export default function ApprovalQueue() {
  return (
    <AdminLayout>
      {(creds) => <Queue mentorName={creds.name} />}
    </AdminLayout>
  )
}

function Queue({ mentorName }: { mentorName: string }) {
  const [items, setItems] = useState<Pending[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('square_completions')
      .select('*, team:teams(*), square:bingo_squares(*)')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }
    setItems((data ?? []) as Pending[])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const channel = supabase
      .channel('admin:queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'square_completions' },
        () => load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  const onApprove = async (item: Pending) => {
    setBusyId(item.id)
    setError(null)
    const r = await approveCompletion(item.id, mentorName)
    if (!r.ok) setError(r.reason ?? 'Approve failed.')
    setBusyId(null)
  }

  const onReject = async (item: Pending) => {
    const reason = window.prompt('Reason for rejection? (shown to the team)')
    if (!reason) return
    setBusyId(item.id)
    setError(null)
    const r = await rejectCompletion(item.id, mentorName, reason)
    if (!r.ok) setError(r.reason ?? 'Reject failed.')
    setBusyId(null)
  }

  return (
    <div>
      <h2 className="bh-display text-xl font-bold mb-4 text-white">Pending approvals</h2>
      {loading && <p className="text-sm text-bh-dim bh-display">Loading…</p>}
      {error && <p className="text-sm text-bh-magenta mb-2">{error}</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-bh-dim">Nothing pending. Nice work.</p>
      )}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="bh-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="bh-display text-sm font-bold text-white">{item.team.name} <span className="text-xs text-bh-dim font-normal">· {item.team.colour}</span></div>
                <div className="text-xs text-bh-dim mb-2">{item.square.title} <span className="text-bh-dim/70">· {item.square.verification_kind}</span></div>
                {item.photo_path && (
                  <a href={publicPhotoUrl(item.photo_path)} target="_blank" rel="noopener noreferrer">
                    <img
                      src={publicPhotoUrl(item.photo_path)}
                      alt="evidence"
                      className="rounded max-h-64 ring-1 ring-bh-line"
                    />
                  </a>
                )}
                {item.ig_url && (
                  <a href={item.ig_url} target="_blank" rel="noopener noreferrer" className="text-bh-cyan underline text-sm break-all">
                    {item.ig_url}
                  </a>
                )}
                {item.text_answer && <div className="text-sm text-white/80 mt-1 italic">"{item.text_answer}"</div>}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => onApprove(item)}
                  disabled={busyId === item.id}
                  className="bh-btn-primary text-xs px-3 py-2 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject(item)}
                  disabled={busyId === item.id}
                  className="bh-display px-3 py-2 rounded-md bg-bh-panel text-bh-magenta ring-1 ring-bh-magenta/40 text-xs tracking-wider hover:bg-bh-magenta/10 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
