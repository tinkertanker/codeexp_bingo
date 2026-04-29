import { publicPhotoUrl } from '../lib/storage'
import type { Photo, Team } from '../lib/supabase'

export type PhotoWallProps = {
  photos: Photo[]
  teamsById: Map<string, Team>
  cap?: number
}

export default function PhotoWall({ photos, teamsById, cap = 18 }: PhotoWallProps) {
  const recent = photos.slice(0, cap)
  if (recent.length === 0) {
    return (
      <div className="grid place-items-center h-full text-slate-300 text-2xl">
        Photos appear here as teams play.
      </div>
    )
  }
  return (
    <div className="grid grid-cols-3 gap-3 auto-rows-[1fr]">
      {recent.map((p) => {
        const team = teamsById.get(p.team_id)
        return (
          <figure key={p.id} className="relative rounded-lg overflow-hidden ring-1 ring-white/10 bg-black/20">
            <img
              src={publicPhotoUrl(p.storage_path)}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
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
