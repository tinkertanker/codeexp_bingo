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
      <h2 className="text-xl font-semibold mb-4">Pending approvals</h2>
      {loading && <p className="text-sm text-slate-500">Loading…</p>}
      {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}
      {!loading && items.length === 0 && (
        <p className="text-sm text-slate-500">Nothing pending. Nice work.</p>
      )}
      <ul className="space-y-3">
        {items.map((item) => (
          <li key={item.id} className="bg-white rounded-lg shadow-sm ring-1 ring-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{item.team.name} <span className="text-xs text-slate-400">· {item.team.colour}</span></div>
                <div className="text-xs text-slate-500 mb-2">{item.square.title} <span className="text-slate-400">· {item.square.verification_kind}</span></div>
                {item.photo_path && (
                  <a href={publicPhotoUrl(item.photo_path)} target="_blank" rel="noopener noreferrer">
                    <img
                      src={publicPhotoUrl(item.photo_path)}
                      alt="evidence"
                      className="rounded-lg max-h-64 ring-1 ring-slate-200"
                    />
                  </a>
                )}
                {item.ig_url && (
                  <a href={item.ig_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-sm break-all">
                    {item.ig_url}
                  </a>
                )}
                {item.text_answer && <div className="text-sm text-slate-700 mt-1">"{item.text_answer}"</div>}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button
                  onClick={() => onApprove(item)}
                  disabled={busyId === item.id}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject(item)}
                  disabled={busyId === item.id}
                  className="px-3 py-2 rounded-lg bg-white text-rose-700 ring-1 ring-rose-200 text-sm disabled:opacity-50"
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
