import { useState } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import Leaderboard from '../components/Leaderboard'
import PhotoWall from '../components/PhotoWall'
import { categoryLabel } from '../lib/categories'
import { PROBLEM_STATEMENTS } from '../lib/problemStatements'
import { checkScoreboardPasscode, isScoreboardUnlocked } from '../lib/scoreboard'
import { computeStandings, type Standing } from '../lib/standings'
import { effectiveCategory } from '../lib/squares'
import { saveScoreboardPass } from '../lib/token'
import type { DrawWinner, TeamCategory, TeamId } from '../lib/types'

type ScreenTab = 'overview' | 'bingo' | 'photos' | 'fanfavs'

export default function Scoreboard() {
  const [unlocked, setUnlocked] = useState(isScoreboardUnlocked())
  if (!unlocked) return <ScoreboardGate onUnlock={() => setUnlocked(true)} />
  return <ScoreboardView />
}

function ScoreboardGate({ onUnlock }: { onUnlock: () => void }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (checkScoreboardPasscode(value)) {
      saveScoreboardPass(value.trim())
      onUnlock()
    } else {
      setError(true)
    }
  }
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <form onSubmit={submit} className="bh-card p-6 w-full max-w-sm space-y-4">
        <h1 className="bh-display text-xl font-bold text-white">
          CODE_EXP <span className="text-bh-lime">2026</span>
        </h1>
        <p className="text-sm text-bh-dim">This screen is for the venue TVs. Enter the screen passcode to continue.</p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(false)
          }}
          placeholder="Screen passcode"
          className="w-full rounded-md ring-1 ring-bh-line bg-black/40 px-3 py-2 text-sm text-white focus:ring-bh-lime focus:outline-none"
        />
        {error && <p className="text-xs text-bh-magenta">Wrong passcode.</p>}
        <button type="submit" className="bh-btn-primary w-full">Unlock</button>
      </form>
    </div>
  )
}

function ScoreboardView() {
  const bundle = useQuery(api.scoreboard.bundle)
  const [categoryFilter, setCategoryFilter] = useState<'all' | TeamCategory>('all')
  const [problemFilter, setProblemFilter] = useState('all')
  const [groupByMission, setGroupByMission] = useState(false)
  const [activeTab, setActiveTab] = useState<ScreenTab>('overview')
  const [selectedStanding, setSelectedStanding] = useState<Standing | null>(null)

  if (bundle === undefined) {
    return <div className="p-8 text-bh-dim bg-black min-h-screen bh-display">Loading scoreboard...</div>
  }

  const standings: Standing[] = computeStandings(bundle.teams, bundle.squares, bundle.completions, bundle.submissions)
  const teamsById = new Map(bundle.teams.map((t) => [t._id, t] as const))
  const winners: DrawWinner[] = bundle.game?.drawWinners ?? []
  const winnerIds = new Set<TeamId>(winners.map((w) => w.teamId))
  const categoryFiltered =
    categoryFilter === 'all' ? standings : standings.filter((s) => effectiveCategory(s.team) === categoryFilter)
  const filtered =
    problemFilter === 'all'
      ? categoryFiltered
      : problemFilter === 'unassigned'
        ? categoryFiltered.filter((s) => !s.team.problemStatement)
        : categoryFiltered.filter((s) => s.team.problemStatement === problemFilter)
  const groups = [
    ...PROBLEM_STATEMENTS.map((p) => ({
      id: p.id,
      label: p.mission,
      rows: filtered.filter((s) => s.team.problemStatement === p.id),
    })),
    { id: 'unassigned', label: 'Unassigned', rows: filtered.filter((s) => !s.team.problemStatement) },
  ].filter((g) => g.rows.length > 0)

  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 30% 0%, rgba(23,125,129,0.35), transparent 55%),' +
            'radial-gradient(ellipse at 80% 100%, rgba(166,251,0,0.18), transparent 55%),' +
            'linear-gradient(rgba(166,251,0,0.05) 1px, transparent 1px),' +
            'linear-gradient(90deg, rgba(166,251,0,0.05) 1px, transparent 1px)',
          backgroundSize: 'auto, auto, 40px 40px, 40px 40px',
        }}
      />
      <div className="absolute top-6 left-10 h-1 w-40 bg-bh-lime" />
      <div className="absolute top-3 left-56 h-1 w-12 bg-bh-magenta" />
      <div className="absolute top-12 right-24 h-1 w-24 bg-bh-orange" />
      <div className="absolute bottom-10 right-40 h-1 w-32 bg-bh-cyan" />

      <div className="relative grid h-screen" style={{ gridTemplateColumns: '1.05fr 1fr' }}>
        <section className="p-8 flex flex-col min-h-0">
          <header className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <img src="/code-exp-logo.png" alt="" className="w-14 h-14 drop-shadow-[0_0_18px_rgba(166,251,0,0.5)]" />
              <div>
                <div className="bh-display text-[0.7rem] text-bh-dim tracking-[0.2em]">-- BRAINHACK 2026 --</div>
                <h1 className="bh-display text-4xl font-extrabold tracking-tight text-white">
                  CODE_EXP <span className="text-bh-lime">2026</span>
                </h1>
              </div>
            </div>
            {bundle.game && (
              <span
                className={[
                  'bh-display px-3 py-1 rounded text-xs font-bold uppercase tracking-widest ring-1',
                  bundle.game.isOpen ? 'bg-bh-lime text-black ring-bh-lime shadow-neon-lime' : 'bg-bh-panel text-bh-dim ring-bh-line',
                ].join(' ')}
              >
                {bundle.game.isOpen ? 'Live' : 'Closed'}
              </span>
            )}
          </header>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')}>Overview</TabButton>
            <TabButton active={activeTab === 'bingo'} onClick={() => setActiveTab('bingo')}>Bingo details</TabButton>
            <TabButton active={activeTab === 'photos'} onClick={() => setActiveTab('photos')}>Photos</TabButton>
            <TabButton active={activeTab === 'fanfavs'} onClick={() => setActiveTab('fanfavs')}>Fan favourites</TabButton>
          </div>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <SegButton active={categoryFilter === 'all'} onClick={() => setCategoryFilter('all')}>All</SegButton>
            <SegButton active={categoryFilter === 'cat1'} onClick={() => setCategoryFilter('cat1')}>{categoryLabel('cat1')}</SegButton>
            <SegButton active={categoryFilter === 'cat2'} onClick={() => setCategoryFilter('cat2')}>{categoryLabel('cat2')}</SegButton>
            {activeTab === 'bingo' && (
              <>
                <span className="w-px h-5 bg-bh-line mx-1" />
                <SegButton active={!groupByMission} onClick={() => setGroupByMission(false)}>Overall</SegButton>
                <SegButton active={groupByMission} onClick={() => setGroupByMission(true)}>By mission</SegButton>
              </>
            )}
          </div>

          {(activeTab === 'overview' || activeTab === 'bingo') && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="bh-display text-[0.65rem] text-bh-dim tracking-wider mr-1">Problem</span>
              <SegButton active={problemFilter === 'all'} onClick={() => setProblemFilter('all')}>All</SegButton>
              {PROBLEM_STATEMENTS.map((p) => (
                <SegButton key={p.id} active={problemFilter === p.id} onClick={() => setProblemFilter(p.id)}>
                  {p.mission}
                </SegButton>
              ))}
              <SegButton active={problemFilter === 'unassigned'} onClick={() => setProblemFilter('unassigned')}>Unassigned</SegButton>
            </div>
          )}

          {activeTab === 'bingo' && (
            <div className="text-xs text-bh-dim mb-3 bh-display tracking-wider">
              <span className="text-bh-lime">L</span> = lines · <span className="text-white">TOTAL</span> = lucky-draw entries (lines + clean-ZIP bonus)
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-auto bh-card p-2">
            {activeTab === 'bingo' && groupByMission ? (
              <div className="space-y-4">
                {groups.map((g) => (
                  <div key={g.id}>
                    <h3 className="bh-display text-sm text-bh-cyan tracking-wider mb-1">
                      {g.label} <span className="text-bh-dim">· {g.rows.length}</span>
                    </h3>
                    <Leaderboard standings={g.rows} highlightTeamIds={winnerIds} onTeamClick={setSelectedStanding} />
                  </div>
                ))}
              </div>
            ) : activeTab === 'photos' ? (
              <PhotoWall photos={bundle.photos} teamsById={teamsById} cap={18} />
            ) : activeTab === 'fanfavs' ? (
              <div className="grid grid-cols-2 gap-3">
                <FanBoard title={categoryLabel('cat1')} rows={bundle.fanFavs.cat1.rows} />
                <FanBoard title={categoryLabel('cat2')} rows={bundle.fanFavs.cat2.rows} />
              </div>
            ) : (
              <Leaderboard standings={filtered} highlightTeamIds={winnerIds} onTeamClick={setSelectedStanding} />
            )}
          </div>
        </section>
        <section className="p-6 flex flex-col min-h-0">
          <h2 className="bh-display text-2xl font-bold mb-3 text-white">
            {activeTab === 'bingo' ? 'Mission groups' : activeTab === 'fanfavs' ? 'Top fan favourites' : 'Live photo wall'}
          </h2>
          <div className="flex-1 min-h-0 overflow-hidden">
            {activeTab === 'bingo' ? (
              <div className="space-y-2 overflow-auto h-full pr-1">
                {groups.map((g) => (
                  <div key={g.id} className="rounded-md ring-1 ring-bh-line bg-bh-surface/70 px-3 py-2">
                    <div className="bh-display text-sm text-white">{g.label}</div>
                    <div className="text-xs text-bh-dim">{g.rows.length} teams</div>
                  </div>
                ))}
              </div>
            ) : activeTab === 'fanfavs' ? (
              <div className="grid grid-cols-1 gap-3">
                <FanBoard title={categoryLabel('cat1')} rows={bundle.fanFavs.cat1.rows} />
                <FanBoard title={categoryLabel('cat2')} rows={bundle.fanFavs.cat2.rows} />
              </div>
            ) : (
              <PhotoWall photos={bundle.photos} teamsById={teamsById} cap={18} />
            )}
          </div>
          {activeTab === 'overview' && (bundle.fanFavs.cat1.rows.length > 0 || bundle.fanFavs.cat2.rows.length > 0) && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <FanBoard title={categoryLabel('cat1')} rows={bundle.fanFavs.cat1.rows} />
              <FanBoard title={categoryLabel('cat2')} rows={bundle.fanFavs.cat2.rows} />
            </div>
          )}
        </section>
      </div>
      {winners.length > 0 && (
        <div className="absolute bottom-0 left-0 right-0 bg-bh-lime text-black px-6 py-4 flex items-center justify-center gap-6 bh-display text-2xl font-extrabold shadow-[0_-8px_40px_rgba(166,251,0,0.45)]">
          <span>WINNERS</span>
          {winners
            .slice()
            .sort((a, b) => a.prizeRank - b.prizeRank)
            .map((w) => {
              const t = teamsById.get(w.teamId)
              return (
                <span key={w.teamId} className="px-3 py-1 rounded bg-black/15">
                  #{w.prizeRank} {t?.name ?? '(unknown)'}
                </span>
              )
            })}
        </div>
      )}
      {selectedStanding && <TeamAssetsModal standing={selectedStanding} onClose={() => setSelectedStanding(null)} />}
    </div>
  )
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'bh-display px-3 py-1.5 rounded text-xs tracking-wider transition ring-1',
        active ? 'bg-white text-black ring-white' : 'text-bh-dim ring-bh-line hover:text-white hover:bg-bh-panel',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

function SegButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'bh-display px-3 py-1 rounded text-xs tracking-wider transition ring-1',
        active ? 'bg-bh-lime text-black ring-bh-lime shadow-neon-lime' : 'text-bh-dim ring-bh-line hover:text-white hover:bg-bh-panel',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

type FanRow = { team: { _id: string; name: string; colour: string }; points: number }

function FanBoard({ title, rows }: { title: string; rows: FanRow[] }) {
  return (
    <div className="bh-card p-3">
      <h3 className="bh-display text-sm font-bold text-bh-magenta mb-2 tracking-wider">{title.toUpperCase()}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-bh-dim">No votes yet.</p>
      ) : (
        <ol className="space-y-1">
          {rows.slice(0, 5).map((f, i) => (
            <li key={f.team._id} className="flex items-center gap-2 text-sm">
              <span className="bh-display w-5 text-right text-xs text-bh-dim tabular-nums">{i + 1}</span>
              <span className={['inline-block w-2.5 h-2.5 rounded-full', `bg-team-${f.team.colour}`].join(' ')} />
              <span className="flex-1 truncate text-white">{f.team.name}</span>
              <span className="bh-display text-bh-magenta font-extrabold tabular-nums">{f.points}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

function TeamAssetsModal({ standing, onClose }: { standing: Standing; onClose: () => void }) {
  const team = standing.team
  const links = [
    ['Pitch', team.pitchUrl],
    ['Slides', team.slideDeckUrl],
    ['Wireframe', team.wireframeUrl],
    ['Architecture', team.architectureUrl],
  ] as const
  const hasLinks = links.some(([, href]) => Boolean(href))
  return (
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm grid place-items-center p-6 z-20">
      <div className="bh-card p-5 w-full max-w-xl">
        <div className="flex items-start gap-3">
          <span className={['mt-1 inline-block w-4 h-4 rounded-full', `bg-team-${team.colour}`].join(' ')} />
          <div className="flex-1 min-w-0">
            <div className="bh-display text-xs text-bh-dim tracking-wider">
              {team.teamNumber ? `TEAM ${team.teamNumber}` : categoryLabel(effectiveCategory(team)).toUpperCase()}
            </div>
            <h2 className="bh-display text-2xl font-bold text-white truncate">{team.name}</h2>
            {team.appName && <p className="text-bh-lime text-sm mt-1">{team.appName}</p>}
          </div>
          <button onClick={onClose} className="text-bh-dim hover:text-white text-xl leading-none" aria-label="Close">
            x
          </button>
        </div>
        {team.description && <p className="mt-4 text-sm text-white/80">{team.description}</p>}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Stat label="Lines" value={standing.lines} />
          <Stat label="Entries" value={standing.entries} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {links.map(([label, href]) =>
            href ? (
              <a key={label} href={href} target="_blank" rel="noreferrer" className="bh-btn-ghost text-sm text-center">
                {label}
              </a>
            ) : null,
          )}
          {!hasLinks && <p className="col-span-2 text-sm text-bh-dim">No asset links loaded for this team yet.</p>}
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md ring-1 ring-bh-line bg-black/30 px-3 py-2">
      <div className="text-xs text-bh-dim">{label}</div>
      <div className="bh-display text-xl font-bold text-white tabular-nums">{value}</div>
    </div>
  )
}
