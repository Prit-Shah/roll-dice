"use client"
import { useGame } from "@/context/GameContext"
import Dice3D from "./Dice3D"
import PlayerAvatar from "./PlayerAvatar"
import { cn } from "@/lib/utils"

export default function PokerTable() {
  const { room, user, isCurrentPlayer, rollDice, takeScore } = useGame()

  if (!room || !user) return null

  const players = Object.values(room.players)
  const currentPlayer = room.players[room.gameState.currentPlayerId]
  const gameInProgress = room.gameState.phase === "playing"
  const hasRolledDice = room.gameState.diceValues.length > 0
  const hasRolledOne = room.gameState.diceValues.includes(1)

  // Calculate positions for players around the table
  const getPlayerPosition = (index: number, total: number) => {
    const angleStep = (2 * Math.PI) / total
    const angle = index * angleStep - Math.PI / 2 // Start from top

    const x = 50 + 40 * Math.cos(angle)
    const y = 50 + 30 * Math.sin(angle)

    return { x, y }
  }

  return (
    <div className="relative w-full max-w-4xl aspect-[4/3] mx-auto">
      {/* Poker table */}
      <div className="absolute inset-0 bg-green-800 rounded-[40%] border-8 border-brown-800 shadow-xl">
        {/* Felt texture */}
        <div className="absolute inset-0 bg-[url('/felt-texture.png')] opacity-30 rounded-[40%]" />

        {/* Center area for dice and game info */}
        <div className="absolute inset-[15%] flex flex-col items-center justify-center">
          {gameInProgress ? (
            <>
              {/* Dice area */}
              <Dice3D />

              {/* Game info */}
              <div className="mt-4 text-white text-center">
                <div className="text-xl font-bold">{currentPlayer?.name}'s Turn</div>

                {room.gameState.accumulatedScore > 0 && (
                  <div className="text-2xl font-bold mt-2">Current: {room.gameState.accumulatedScore} points</div>
                )}

                {/* Controls for current player */}
                {isCurrentPlayer() && (
                  <div className="mt-4 flex gap-4 justify-center">
                    {!hasRolledDice || (hasRolledDice && !hasRolledOne) ? (
                      <button
                        onClick={rollDice}
                        className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-2 rounded-full font-bold"
                      >
                        Roll Dice
                      </button>
                    ) : null}

                    {hasRolledDice && !hasRolledOne && (
                      <button
                        onClick={takeScore}
                        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-full font-bold"
                      >
                        Take {room.gameState.accumulatedScore} Points
                      </button>
                    )}
                  </div>
                )}

                {/* Message for rolled one */}
                {hasRolledOne && (
                  <div className="mt-4 text-red-300 text-xl font-bold animate-pulse">Rolled a 1! Turn over.</div>
                )}
              </div>
            </>
          ) : (
            <div className="text-white text-center">
              <h2 className="text-2xl font-bold mb-4">
                {room.gameState.phase === "waiting" ? "Waiting for players..." : "Game Over!"}
              </h2>

              {room.gameState.phase === "ended" && (
                <div className="text-xl">
                  {Object.values(room.players).sort((a, b) => b.score - a.score)[0]?.name} wins!
                </div>
              )}

              {players.length >= 2 && room.gameState.phase === "waiting" && (
                <button
                  onClick={() => {
                    // Start game logic
                    const updates: any = {
                      [`rooms/${room.id}/gameState/phase`]: "playing",
                    }
                    // Implementation in GameContext
                  }}
                  className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-bold"
                >
                  Start Game
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Players around the table */}
      {players.map((player, index) => {
        const position = getPlayerPosition(index, players.length)
        const isCurrentTurn = gameInProgress && player.id === room.gameState.currentPlayerId

        return (
          <div
            key={player.id}
            className={cn("absolute transform -translate-x-1/2 -translate-y-1/2", isCurrentTurn && "z-10")}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          >
            <PlayerAvatar player={player} isCurrentUser={player.id === user.id} isCurrentTurn={isCurrentTurn} />
          </div>
        )
      })}
    </div>
  )
}
