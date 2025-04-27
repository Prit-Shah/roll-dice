export type PlayerStatus = "active" | "waiting" | "disconnected"
export type GamePhase = "waiting" | "playing" | "ended"

export interface Player {
  id: string
  name: string
  score: number
  status: PlayerStatus
  turnOrder: number
}

export interface GameState {
  currentPlayerId: string
  accumulatedScore: number
  diceValues: number[]
  phase: GamePhase
  lastRollTime: number
  winner: string | null
}

export interface GameSettings {
  maxPlayers: number
  targetScore: number
  turnTimeLimit?: number
}

export interface Room {
  id: string
  players: Record<string, Player>
  gameState: GameState
  settings: GameSettings
}
