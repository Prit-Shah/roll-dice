"use client"
import type { Player } from "@/types/game"
import { cn } from "@/lib/utils"

interface PlayerAvatarProps {
  player: Player
  isCurrentUser: boolean
  isCurrentTurn: boolean
}

export default function PlayerAvatar({ player, isCurrentUser, isCurrentTurn }: PlayerAvatarProps) {
  // Generate a color based on player ID for consistent colors
  const getPlayerColor = (id: string) => {
    const colors = ["bg-red-500", "bg-blue-500", "bg-yellow-500", "bg-purple-500", "bg-green-500", "bg-pink-500"]

    // Simple hash function to get consistent color
    let hash = 0
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash)
    }

    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className="flex flex-col items-center">
      {/* Avatar */}
      <div
        className={cn(
          "relative w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl",
          getPlayerColor(player.id),
          player.status === "waiting" && "opacity-50",
          player.status === "disconnected" && "opacity-30 grayscale",
          isCurrentTurn && "ring-4 ring-yellow-300 ring-opacity-75 animate-pulse",
        )}
      >
        {player.name.substring(0, 1).toUpperCase()}

        {isCurrentUser && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-green-500" />
        )}
      </div>

      {/* Player name */}
      <div className="mt-1 text-sm font-medium text-white bg-black/50 px-2 py-0.5 rounded-full">{player.name}</div>

      {/* Player score */}
      <div className="mt-1 text-sm font-bold text-white bg-blue-500/80 px-2 py-0.5 rounded-full">
        {player.score} pts
      </div>

      {/* Status indicator */}
      {player.status === "waiting" && (
        <div className="mt-1 text-xs text-white bg-orange-500/80 px-2 py-0.5 rounded-full">Waiting</div>
      )}

      {player.status === "disconnected" && (
        <div className="mt-1 text-xs text-white bg-red-500/80 px-2 py-0.5 rounded-full">Disconnected</div>
      )}
    </div>
  )
}
