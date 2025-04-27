"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { auth, database } from "@/lib/firebase"
import { signInAnonymously, onAuthStateChanged } from "firebase/auth"
import { ref, onValue, set, update, get, onDisconnect } from "firebase/database"
import type { Room } from "@/types/game"
import { generateRoomCode, generateGuestName } from "@/lib/utils"

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
})

export const useGame = () => useContext(GameContext)

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<{ id: string; name: string } | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [firebaseInitialized, setFirebaseInitialized] = useState(false)

  // Check if Firebase is properly initialized
  useEffect(() => {
    if (!auth || !database) {
      setError("Firebase initialization failed. Check your environment variables.")
      setLoading(false)
      return
    }

    setFirebaseInitialized(true)
  }, [])

  // Handle authentication
  useEffect(() => {
    if (!firebaseInitialized) return

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const guestName = generateGuestName()
        setUser({ id: user.uid, name: guestName })
      } else {
        try {
          await signInAnonymously(auth)
        } catch (error: any) {
          console.error("Auth error:", error)

          // Provide a more specific error message
          if (error.code === "auth/configuration-not-found") {
            setError("Firebase authentication configuration not found. Please check your environment variables.")
          } else {
            setError(`Authentication failed: ${error.message}`)
          }

          // Create a fallback user for development/testing
          if (process.env.NODE_ENV === "development") {
            const fallbackId = `fallback-${Math.random().toString(36).substring(2, 9)}`
            setUser({ id: fallbackId, name: `Guest${Math.floor(1000 + Math.random() * 9000)}` })
          }
        }
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [firebaseInitialized])

  // Create a new room
  const createRoom = async (): Promise<string> => {
    if (!user || !firebaseInitialized) return ""

    try {
      const roomCode = generateRoomCode()
      const roomRef = ref(database, `rooms/${roomCode}`)

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
          phase: "waiting",
          lastRollTime: Date.now(),
        },
        settings: {
          maxPlayers: 6,
          targetScore: 100,
        },
      }

      await set(roomRef, newRoom)
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
    if (!user || !firebaseInitialized) return false

    try {
      const roomRef = ref(database, `rooms/${roomId}`)
      const snapshot = await get(roomRef)

      if (!snapshot.exists()) {
        setError("Room not found")
        return false
      }

      const roomData = snapshot.val() as Room

      // Check if game is in progress
      const status = roomData.gameState.phase === "playing" ? "waiting" : "active"

      // Find the next available turn order
      const players = Object.values(roomData.players || {})
      const maxTurnOrder = players.length > 0 ? Math.max(...players.map((p) => p.turnOrder)) : 0

      // Add player to room
      await update(ref(database, `rooms/${roomId}/players/${user.id}`), {
        id: user.id,
        name: user.name,
        score: 0,
        status,
        turnOrder: maxTurnOrder + 1,
      })

      // Set up disconnect handler
      const playerRef = ref(database, `rooms/${roomId}/players/${user.id}`)
      onDisconnect(playerRef).update({ status: "disconnected" })

      // Subscribe to room updates
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

  // Leave the current room
  const leaveRoom = async (): Promise<void> => {
    if (!user || !room) return

    try {
      const playerRef = ref(database, `rooms/${room.id}/players/${user.id}`)
      await set(playerRef, null)
      setRoom(null)
    } catch (error) {
      console.error("Leave room error:", error)
      setError("Failed to leave room")
    }
  }

  // Roll the dice
  const rollDice = async (): Promise<void> => {
    if (!user || !room || !isCurrentPlayer()) return

    try {
      // Generate random dice values (2 dice)
      const diceValues = [Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]

      // Check if any 1 was rolled
      const hasOne = diceValues.includes(1)

      // Calculate score for this roll
      const rollScore = hasOne ? 0 : diceValues.reduce((sum, val) => sum + val, 0)

      // Update game state
      const updates: any = {
        [`rooms/${room.id}/gameState/diceValues`]: diceValues,
        [`rooms/${room.id}/gameState/lastRollTime`]: Date.now(),
      }

      if (hasOne) {
        // If rolled a 1, reset accumulated score and move to next player
        updates[`rooms/${room.id}/gameState/accumulatedScore`] = 0
        updates[`rooms/${room.id}/gameState/currentPlayerId`] = getNextPlayerId()
      } else {
        // Add to accumulated score
        updates[`rooms/${room.id}/gameState/accumulatedScore`] = room.gameState.accumulatedScore + rollScore
      }

      await update(ref(database), updates)
    } catch (error) {
      console.error("Roll dice error:", error)
      setError("Failed to roll dice")
    }
  }

  // Take the accumulated score
  const takeScore = async (): Promise<void> => {
    if (!user || !room || !isCurrentPlayer()) return

    try {
      const currentScore = room.players[user.id].score
      const newScore = currentScore + room.gameState.accumulatedScore

      const updates: any = {
        [`rooms/${room.id}/players/${user.id}/score`]: newScore,
        [`rooms/${room.id}/gameState/accumulatedScore`]: 0,
        [`rooms/${room.id}/gameState/currentPlayerId`]: getNextPlayerId(),
      }

      // Check if player has won
      if (newScore >= room.settings.targetScore) {
        updates[`rooms/${room.id}/gameState/phase`] = "ended"
      }

      await update(ref(database), updates)

      // If game ended, start a new game after a delay
      if (newScore >= room.settings.targetScore) {
        setTimeout(() => startNewGame(), 5000)
      }
    } catch (error) {
      console.error("Take score error:", error)
      setError("Failed to take score")
    }
  }

  // Start a new game
  const startNewGame = async (): Promise<void> => {
    if (!room) return

    try {
      // Reset all player scores and activate waiting players
      const updatedPlayers: Record<string, any> = {}

      Object.entries(room.players).forEach(([playerId, player]) => {
        updatedPlayers[`rooms/${room.id}/players/${playerId}/score`] = 0

        if (player.status === "waiting") {
          updatedPlayers[`rooms/${room.id}/players/${playerId}/status`] = "active"
        }
      })

      // Find the first active player
      const activePlayers = Object.values(room.players)
        .filter((p) => p.status === "active" || p.status === "waiting")
        .sort((a, b) => a.turnOrder - b.turnOrder)

      const firstPlayerId = activePlayers.length > 0 ? activePlayers[0].id : user?.id

      // Reset game state
      const updates = {
        ...updatedPlayers,
        [`rooms/${room.id}/gameState/phase`]: "playing",
        [`rooms/${room.id}/gameState/currentPlayerId`]: firstPlayerId,
        [`rooms/${room.id}/gameState/accumulatedScore`]: 0,
        [`rooms/${room.id}/gameState/diceValues`]: [],
        [`rooms/${room.id}/gameState/lastRollTime`]: Date.now(),
      }

      await update(ref(database), updates)
    } catch (error) {
      console.error("Start new game error:", error)
      setError("Failed to start new game")
    }
  }

  // Check if current user is the active player
  const isCurrentPlayer = (): boolean => {
    if (!user || !room) return false
    return room.gameState.currentPlayerId === user.id
  }

  // Get the ID of the next player in turn
  const getNextPlayerId = (): string => {
    if (!room) return ""

    const activePlayers = Object.values(room.players)
      .filter((p) => p.status === "active")
      .sort((a, b) => a.turnOrder - b.turnOrder)

    if (activePlayers.length === 0) return ""

    const currentIndex = activePlayers.findIndex((p) => p.id === room.gameState.currentPlayerId)
    const nextIndex = (currentIndex + 1) % activePlayers.length

    return activePlayers[nextIndex].id
  }

  // Auto-take score if player is inactive for too long
  useEffect(() => {
    if (!room || !isCurrentPlayer()) return

    const inactivityTimeout = 20000 // 20 seconds
    const currentTime = Date.now()
    const lastActionTime = room.gameState.lastRollTime

    if (currentTime - lastActionTime > inactivityTimeout) {
      takeScore()
    }

    const timer = setTimeout(
      () => {
        if (isCurrentPlayer()) {
          takeScore()
        }
      },
      inactivityTimeout - (currentTime - lastActionTime),
    )

    return () => clearTimeout(timer)
  }, [room, room?.gameState.lastRollTime])

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
      }}
    >
      {children}
    </GameContext.Provider>
  )
}
