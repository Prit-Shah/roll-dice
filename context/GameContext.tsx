"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { auth, getData, setData, updateData, removeData, ref, onDisconnect, database, onValue } from "@/lib/firebase"
import { signInAnonymously } from "firebase/auth"
import { generateRoomCode, generateGuestName } from "@/lib/utils"
import type { Room } from "@/types/game"

interface GameContextType {
  user: { id: string; name: string } | null
  room: Room | null
  loading: boolean
  error: string | null
  createRoom: () => Promise<string>
  joinRoom: (roomId: string) => Promise<boolean>
  leaveRoom: () => Promise<void>
  rollDice: () => Promise<void>
  takeScore: () => Promise<void>
  isCurrentPlayer: () => boolean
  startGame: () => Promise<void>
}

const GameContext = createContext<GameContextType>({
  user: null,
  room: null,
  loading: true,
  error: null,
  createRoom: async () => "",
  joinRoom: async () => false,
  leaveRoom: async () => {},
  rollDice: async () => {},
  takeScore: async () => {},
  isCurrentPlayer: () => false,
  startGame: async () => {},
})

export const useGame = () => useContext(GameContext)

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Handle authentication
  useEffect(() => {
    console.log("Setting up auth state listener")

    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      console.log("Auth state changed:", user)

      if (user) {
        const guestName = generateGuestName()
        console.log("User authenticated:", user.uid, guestName)
        setUser({ id: user.uid, name: guestName })
      } else {
        try {
          console.log("Attempting anonymous sign in")
          await signInAnonymously(auth)
        } catch (error) {
          console.error("Auth error:", error)

          // Create a fallback user for development
          const fallbackId = `fallback-${Math.random().toString(36).substring(2, 9)}`
          const fallbackName = `Guest${Math.floor(1000 + Math.random() * 9000)}`
          console.log("Using fallback user:", fallbackId, fallbackName)
          setUser({ id: fallbackId, name: fallbackName })

          setError("Authentication failed. Using fallback user.")
        }
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Create a new room
  const createRoom = async (): Promise<string> => {
    if (!user) return ""

    try {
      const roomCode = generateRoomCode()
      console.log("Creating room:", roomCode)

      const newRoom: Room = {
        id: roomCode,
        players: {
          [user.id]: {
            id: user.id,
            name: user.name,
            score: 0,
            status: "active",
            turnOrder: 1,
          },
        },
        gameState: {
          currentPlayerId: user.id,
          accumulatedScore: 0,
          diceValues: [],
          phase: "waiting", // Start in waiting phase
          lastRollTime: Date.now(),
          winner: null,
        },
        settings: {
          maxPlayers: 6,
          targetScore: 100,
          turnTimeLimit: 20, // 20 seconds per turn
        },
      }

      // Use our setData helper
      await setData(`rooms/${roomCode}`, newRoom)
      await joinRoom(roomCode)
      return roomCode
    } catch (error) {
      console.error("Create room error:", error)
      setError("Failed to create room")
      return ""
    }
  }

  // Join an existing room
  const joinRoom = async (roomId: string): Promise<boolean> => {
    if (!user) return false

    try {
      console.log("Joining room:", roomId)

      const roomData = await getData(`rooms/${roomId}`)
      if (!roomData) {
        setError("Room not found")
        return false
      }

      // Set player status based on game phase
      // If game is in progress, new players join as "waiting"
      const status = roomData.gameState.phase === "playing" ? "waiting" : "active"
      const players = Object.values(roomData.players || {})
      const maxTurnOrder = players.length > 0 ? Math.max(...players.map((p: any) => p.turnOrder)) : 0

      await updateData(`rooms/${roomId}/players/${user.id}`, {
        id: user.id,
        name: user.name,
        score: 0,
        status,
        turnOrder: maxTurnOrder + 1,
      })

      // Set up disconnect handler
      const playerRef = ref(database, `rooms/${roomId}/players/${user.id}`)
      const disconnectRef = onDisconnect(playerRef)
      await disconnectRef.update({
        status: "disconnected",
      })

      const roomRef = ref(database, `rooms/${roomId}`)
      onValue(roomRef, (snapshot) => {
        if (snapshot.exists()) {
          setRoom(snapshot.val() as Room)
        } else {
          setRoom(null)
        }
      })

      return true
    } catch (error) {
      console.error("Join room error:", error)
      setError("Failed to join room")
      return false
    }
  }

  // Leave a room
  const leaveRoom = async (): Promise<void> => {
    if (!room || !user) return

    try {
      await removeData(`rooms/${room.id}/players/${user.id}`)
      setRoom(null)
    } catch (error) {
      console.error("Leave room error:", error)
      setError("Failed to leave room")
    }
  }

  // Start a new game
  const startGame = async (): Promise<void> => {
    if (!room || !user) return

    try {
      const players = Object.values(room.players)
      
      // Need at least 2 players to start
      if (players.length < 2) {
        setError("Need at least 2 players to start")
        return
      }

      // Activate all waiting players
      const playerUpdates:any = {}
      players.forEach((player:any) => {
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
        }
      })

      console.log("Game started with first player:", firstPlayerId)
    } catch (error) {
      console.error("Start game error:", error)
      setError("Failed to start game")
    }
  }

  // Roll the dice
  const rollDice = async (): Promise<void> => {
    if (!room || !user) return

    try {
      // Only current player can roll
      if (room.gameState.currentPlayerId !== user.id) {
        console.log("Not your turn to roll")
        return
      }

      // Generate random dice values
      const diceValues = Array.from({ length: 2 }, () => Math.floor(Math.random() * 6) + 1)
      console.log("Rolled dice values:", diceValues)

      // Check if a 1 was rolled
      const rolledOne = diceValues.includes(1)

      if (rolledOne) {
        // If a 1 was rolled, reset accumulated score and move to next player
        const players = Object.values(room.players).filter(p => p.status === "active")
        const currentPlayerIndex = players.findIndex((p) => p.id === room.gameState.currentPlayerId)
        const nextPlayerIndex = (currentPlayerIndex + 1) % players.length
        const nextPlayerId = players[nextPlayerIndex].id

        console.log("Rolled a 1! Moving from player", room.gameState.currentPlayerId, "to", nextPlayerId)

        // Update game state - reset score and change player
        await updateData(`rooms/${room.id}/gameState`, {
          diceValues: [],
          accumulatedScore: 0, // Reset accumulated score when a 1 is rolled
          lastRollTime: Date.now(),
          currentPlayerId: nextPlayerId, // Change to next player
        })
      } else {
        // If no 1 was rolled, add to accumulated score but keep the same player
        const newAccumulatedScore = room.gameState.accumulatedScore + diceValues.reduce((a, b) => a + b, 0)
        console.log("Good roll! Adding to score:", newAccumulatedScore)

        // Update game state - add to score but keep same player
        await updateData(`rooms/${room.id}/gameState`, {
          diceValues,
          accumulatedScore: newAccumulatedScore,
          lastRollTime: Date.now(),
          // No change to currentPlayerId - same player continues
        })
      }
    } catch (error) {
      console.error("Roll dice error:", error)
      setError("Failed to roll dice")
    }
  }

  // Take score
  const takeScore = async (): Promise<void> => {
    if (!room || !user) return

    try {
      // Get current player
      const currentPlayerId = room.gameState.currentPlayerId
      if (currentPlayerId !== user.id) return // Safety check

      // Update player's score
      const currentPlayer = room.players[currentPlayerId]
      const newScore = currentPlayer.score + room.gameState.accumulatedScore
      await updateData(`rooms/${room.id}/players/${currentPlayerId}`, {score: newScore })

      // Check if player reached target score (win condition)
      if (newScore >= (room.settings.targetScore || 100)) {
        // Player won the game
        await updateData(`rooms/${room.id}/gameState`, {
          winner: currentPlayerId,
          phase: "ended",
        })
        
        console.log("Game ended! Winner:", currentPlayerId)
        return
      }

      // Move to next player (only active players)
      const activePlayers = Object.values(room.players).filter(p => p.status === "active")
      const currentPlayerIndex = activePlayers.findIndex((p) => p.id === currentPlayerId)
      const nextPlayerIndex = (currentPlayerIndex + 1) % activePlayers.length
      const nextPlayerId = activePlayers[nextPlayerIndex].id

      // Update game state for next player
      await updateData(`rooms/${room.id}/gameState`, {
        currentPlayerId: nextPlayerId,
        accumulatedScore: 0,
        diceValues: [], // Reset dice values for next player
        lastRollTime: Date.now(),
      })
      
      console.log("Turn passed to next player:", nextPlayerId)
    } catch (error) {
      console.error("Take score error:", error)
      setError("Failed to take score")
    }
  }

  // Check if current player
  const isCurrentPlayer = () => room?.gameState.currentPlayerId === user?.id

  return (
    <GameContext.Provider
      value={{
        user,
        room,
        loading,
        error,
        createRoom,
        joinRoom,
        leaveRoom,
        rollDice,
        takeScore,
        isCurrentPlayer,
        startGame,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}
