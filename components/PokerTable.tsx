"use client"
import { useEffect, useRef } from "react"
import { useGame } from "@/context/GameContext"
import Dice3D from "./Dice3D"
import PlayerAvatar from "./PlayerAvatar"
import { cn } from "@/lib/utils"
import { updateData } from "@/lib/firebase"

export default function PokerTable() {
  const { room, user, isCurrentPlayer, rollDice, takeScore, startGame } = useGame()
  const turnTimerRef = useRef<NodeJS.Timeout | null>(null)

  if (!room || !user) return null

  const players = Object.values(room.players || {})
  const activePlayers = players.filter((p) => p.status === "active")
  const currentPlayer = room.players[room.gameState.currentPlayerId]
  const gameInProgress = room.gameState.phase === "playing"  
  const hasRolledDice = room.gameState.diceValues && room.gameState.diceValues.length > 0
  const hasRolledOne = room.gameState.diceValues && room.gameState.diceValues.includes(1)
  const isGameOver = room.gameState.phase === "ended"
  const winner = room.gameState.winner ? room.players[room.gameState.winner] : null

  // Set up turn timer
  useEffect(() => {
    let timerId: NodeJS.Timeout | null = null

    // Clear any existing timer
    if (turnTimerRef.current) {
      clearTimeout(turnTimerRef.current)
      turnTimerRef.current = null
    }

    // Only set timer if it's the current player's turn and they've rolled dice without a 1
    if (gameInProgress && isCurrentPlayer() && hasRolledDice && !hasRolledOne) {
      const turnTimeLimit = room.settings.turnTimeLimit || 20 // Default 20 seconds

      timerId = setTimeout(() => {
        console.log("Turn timer expired, auto-taking score")
        takeScore()
      }, turnTimeLimit * 1000)

      turnTimerRef.current = timerId
    }

    // if(hasRolledOne){
    //   handleRolledOne()
    // }

    return () => {
      if (timerId) {
        clearTimeout(timerId)
      }
    }
  }, [
    gameInProgress,
    isCurrentPlayer,
    hasRolledDice,
    hasRolledOne,
    room?.gameState.currentPlayerId,
    room?.gameState.diceValues,
    room?.gameState.phase,
    room?.settings.turnTimeLimit,
    takeScore,
  ])

  // const handleRolledOne = () => {
  //     // Move to next player (only active players)
  //     const currentPlayerId = room.gameState.currentPlayerId
  //     if (currentPlayerId !== user.id) return // Safety check
  //     const activePlayers = Object.values(room.players).filter(p => p.status === "active")
  //     const currentPlayerIndex = activePlayers.findIndex((p) => p.id === currentPlayerId)
  //     const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length
  //     const nextPlayerId = activePlayers[nextPlayerIndex].id
  //     updateData(`rooms/${room.id}`,{
  //       gameState: {
  //         accumulatedScore: 0,
  //         currentPlayerId: nextPlayerId,
  //         diceValues: [],
  //         phase: "playing",         
  //       },
  //     })
  // }

  // Calculate positions for players around the table
  const getPlayerPosition = (index: number, total: number) => {
    const angleStep = (2 * Math.PI) / total
    const angle = index * angleStep - Math.PI / 2 // Start from top

    const x = 50 + 40 * Math.cos(angle)
    const y = 50 + 30 * Math.sin(angle)

    return { x, y }
  }

  // Handle roll dice
  const handleRollDice = async () => {
    await rollDice()
  }

  // Handle starting a new game after one ends
  const handleStartNewGame = async () => {
    // Activate all waiting players for the new game
    const playerUpdates: any = {}
    players.forEach((player) => {
      playerUpdates[`players/${player.id}/status`] = "active"
      playerUpdates[`players/${player.id}/score`] = 0 // Reset scores for new game
    })

    // Choose first player (lowest turnOrder)
    const sortedPlayers = [...players].sort((a, b) => a.turnOrder - b.turnOrder)
    const firstPlayerId = sortedPlayers[0].id

    // Update game state
    await updateData(`rooms/${room.id}`, {
      ...playerUpdates,
      gameState: {
        currentPlayerId: firstPlayerId,
        accumulatedScore: 0,
        diceValues: [],
        phase: "playing",
        lastRollTime: Date.now(),
        winner: null,
      },
    })
  }

  return (
    <div className="relative w-full mx-auto">
      {/* Poker table */}
      <div className="relative w-full aspect-[4/3] bg-green-800 rounded-[40%] border-8 border-brown-800 shadow-xl overflow-hidden">
        {/* Felt texture */}
        <div className="absolute inset-0 bg-[url('/felt-texture.png')] opacity-30 rounded-[40%]" />

        {/* Center area for dice and game info */}
        <div className="absolute inset-[10%] flex flex-col items-center justify-center">
          {gameInProgress ? (
            <>
              {/* Dice area */}
              <div className="absolute top-1 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                <Dice3D />
              </div>

              {/* Game info */}
              <div className="mt-4 text-white text-center">
                <div className="text-xl font-bold">{currentPlayer?.name}'s Turn</div>

                {room.gameState.accumulatedScore > 0 && (
                  <div className="text-2xl font-bold mt-2">Current: {room.gameState.accumulatedScore} points</div>
                )}

                {/* Controls for current player */}
                {isCurrentPlayer() && (
                  <div className="mt-4 flex flex-col sm:flex-row gap-4 justify-center items-center">
                    {!hasRolledDice || (hasRolledDice && !hasRolledOne) ? (
                      <button
                        onClick={handleRollDice}
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
          ) : isGameOver ? (
            <div className="text-white text-center">
              <h2 className="text-2xl font-bold mb-4">Game Over!</h2>

              {winner && (
                <div className="text-xl mb-6">
                  {winner.name} wins with {winner.score} points!
                </div>
              )}

              <button
                onClick={handleStartNewGame}
                className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-full font-bold"
              >
                Start New Game
              </button>
            </div>
          ) : (
            <div className="text-white text-center">
              <h2 className="text-2xl font-bold mb-4">Waiting for players...</h2>

              {players.length >= 2 && (
                <button
                  onClick={startGame}
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
        const isWinner = isGameOver && player.id === room.gameState.winner

        return (
          <div
            key={player.id}
            className={cn(
              "absolute transform -translate-x-1/2 -translate-y-1/2",
              isCurrentTurn && "z-10",
              isWinner && "animate-bounce",
            )}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
          >
            <PlayerAvatar
              player={player}
              isCurrentUser={player.id === user.id}
              isCurrentTurn={isCurrentTurn}
              isWinner={isWinner}
            />
          </div>
        )
      })}

      {/* Player scores display */}
      <div className="absolute bottom-2 left-2 bg-black/50 text-white p-2 rounded-lg text-sm">
        <h3 className="font-bold mb-1">Scores:</h3>
        <ul>
          {players
            .sort((a, b) => b.score - a.score)
            .map((player) => (
              <li
                key={player.id}
                className={cn(
                  "flex justify-between",
                  player.status === "waiting" && "opacity-50",
                  player.status === "disconnected" && "line-through opacity-50",
                )}
              >
                <span>{player.name}</span>
                <span className="ml-4">{player.score}</span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  )
}
