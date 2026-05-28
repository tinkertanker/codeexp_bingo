import type { Photo, Team, TeamId } from '../lib/types'

export type PhotoWithUrl = Photo & { url: string | null }

export type PhotoWallProps = {
  photos: PhotoWithUrl[]
  teamsById: Map<TeamId, Team>
  cap?: number
}

export default function PhotoWall({ photos, teamsById, cap = 18 }: PhotoWallProps) {
  const recent = photos.slice(0, cap)
  if (recent.length === 0) {
    return (
      <div className="grid grid-cols-3 gap-3 h-full auto-rows-fr">
        {Array.from({ length: Math.min(cap, 9) }).map((_, i) => (
          <figure
            key={i}
            className={[
              'relative aspect-square rounded-lg overflow-hidden ring-1 ring-white/10',
              i % 4 === 0 ? 'bg-team-red/60' : i % 4 === 1 ? 'bg-team-blue/60' : i % 4 === 2 ? 'bg-team-green/60' : 'bg-team-yellow/60',
            ].join(' ')}
          >
            <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.20),transparent_42%),radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.55)_0_16%,transparent_17%),radial-gradient(circle_at_50%_82%,rgba(0,0,0,0.28)_0_35%,transparent_36%)]" />
            <figcaption className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 text-white text-xs">
              Demo photo
            </figcaption>
          </figure>
        ))}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-3 h-full auto-rows-fr">
      {recent.map((p) => {
        const team = teamsById.get(p.teamId)
        return (
          <figure key={p._id} className="relative aspect-square rounded-lg overflow-hidden ring-1 ring-white/10 bg-black/20">
            {p.url && (
              <img
                src={p.url}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            )}
            {team && (
              <figcaption className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 text-white text-xs flex items-center gap-1.5">
                <span className={['inline-block w-2.5 h-2.5 rounded-full', `bg-team-${team.colour}`].join(' ')} />
                <span className="truncate">{team.name}</span>
              </figcaption>
            )}
          </figure>
        )
      })}
    </div>
  )
}
