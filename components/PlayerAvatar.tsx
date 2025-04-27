import { cn } from "@/lib/utils"
import type { Player } from "@/types/game"

interface PlayerAvatarProps {
  player: Player
  isCurrentUser: boolean
  isCurrentTurn: boolean
  isWinner?: boolean
}

export default function PlayerAvatar({ player, isCurrentUser, isCurrentTurn, isWinner }: PlayerAvatarProps) {
  // Generate a consistent color based on player name
  const getPlayerColor = (name: string) => {
    const colors = [
      "bg-red-500",
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-teal-500",
    ]

    // Simple hash function to get consistent color
    let hash = 0
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }

    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className="flex flex-col items-center">
      {/* Avatar */}
      <div
        className={cn(
          "relative w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg",
          getPlayerColor(player.name),
          isCurrentTurn && "ring-4 ring-yellow-300 animate-pulse",
          isWinner && "ring-4 ring-yellow-400",
          player.status === "waiting" && "opacity-50",
          player.status === "disconnected" && "opacity-30",
        )}
      >
        {player.name.charAt(0).toUpperCase()}

        {/* Current user indicator */}
        {isCurrentUser && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full border-2 border-green-500"></div>
        )}
      </div>

      {/* Player name and score */}
      <div className="mt-1 text-center">
        <div
          className={cn(
            "text-xs font-semibold text-white bg-black/50 px-2 py-0.5 rounded",
            isCurrentUser && "text-green-300",
            player.status === "waiting" && "italic",
            player.status === "disconnected" && "line-through",
          )}
        >
          {player.name}
        </div>
        <div className="text-xs font-bold text-white bg-black/70 px-2 rounded mt-0.5">{player.score}</div>
      </div>
    </div>
  )
}
