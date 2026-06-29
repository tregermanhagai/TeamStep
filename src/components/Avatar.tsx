import { Player, PlayerScore } from '../types'

type AvatarSource = Pick<Player | PlayerScore, 'full_name' | 'avatar_type' | 'avatar_value'>

interface Props {
  player: AvatarSource
  size?: number
}

export function Avatar({ player, size = 40 }: Props) {
  const { full_name, avatar_type, avatar_value } = player

  if (avatar_type === 'photo' && avatar_value) {
    return (
      <img
        src={avatar_value}
        alt={full_name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  if (avatar_type === 'gallery' && avatar_value) {
    return (
      <img
        src={`/avatars/${avatar_value}`}
        alt={full_name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }

  const initials = full_name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const colors = ['#06C8E0', '#22C55E', '#F59E0B', '#8B5CF6', '#EF4444', '#EC4899']
  const color = colors[full_name.charCodeAt(0) % colors.length]

  return (
    <div
      className="rounded-full flex items-center justify-center font-bold flex-shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.38, color: '#0B1627' }}
    >
      {initials}
    </div>
  )
}
