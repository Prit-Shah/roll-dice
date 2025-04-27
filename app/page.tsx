"use client"

import { useState, useEffect } from "react"
import { useGame } from "@/context/GameContext"
import PokerTable from "@/components/PokerTable"

export default function Home() {
  const { user, room, loading, error, createRoom, joinRoom, leaveRoom } = useGame()
  const [roomCode, setRoomCode] = useState("")
  const [envVarsPresent, setEnvVarsPresent] = useState(true)

  // Check if required environment variables are present
  useEffect(() => {
    const requiredVars = [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_FIREBASE_DATABASE_URL",
    ]

    const missingVars = requiredVars.filter((varName) => !process.env[varName] || process.env[varName] === "")

    if (missingVars.length > 0) {
      setEnvVarsPresent(false)
    }
  }, [])

  if (!envVarsPresent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Configuration Error</h1>
          <div className="text-red-400 mb-4">
            Missing required Firebase environment variables. Please check your Vercel project configuration.
          </div>
          <div className="text-gray-300 text-sm">
            <p className="mb-2">Required variables:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
              <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
              <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
              <li>NEXT_PUBLIC_FIREBASE_DATABASE_URL</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Error</h1>
          <div className="text-red-400 mb-4">{error}</div>
          <div className="text-gray-300 text-sm">
            <p>Please check your Firebase configuration and try again.</p>
          </div>
        </div>
      </div>
    )
  }

  // If not in a room, show join/create options
  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-md w-full">
          <h1 className="text-3xl font-bold text-white text-center mb-8">Greedy Dice Game</h1>

          <div className="space-y-6">
            {/* Join room */}
            <div>
              <label htmlFor="roomCode" className="block text-sm font-medium text-gray-300 mb-2">
                Join with Room Code
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  id="roomCode"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  placeholder="ABCD"
                  className="bg-gray-700 text-white px-4 py-2 rounded-lg flex-1 uppercase"
                  maxLength={4}
                />
                <button
                  onClick={() => joinRoom(roomCode)}
                  disabled={roomCode.length !== 4}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  Join
                </button>
              </div>
            </div>

            {/* Create room */}
            <div>
              <div className="text-center">
                <span className="text-gray-400">or</span>
              </div>
              <button
                onClick={async () => {
                  const code = await createRoom()
                  if (code) setRoomCode(code)
                }}
                className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium mt-2"
              >
                Create New Room
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // In a room, show the game
  return (
    <div className="min-h-screen bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-white">Room: {room.id}</h1>

          <button
            onClick={leaveRoom}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
          >
            Leave Room
          </button>
        </div>

        {/* Game table */}
        <PokerTable />

        {/* Scoreboard */}
        <div className="mt-8 bg-gray-800 rounded-lg p-4">
          <h2 className="text-xl font-bold text-white mb-4">Scoreboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(room.players)
              .sort((a, b) => b.score - a.score)
              .map((player) => (
                <div key={player.id} className="bg-gray-700 p-3 rounded-lg flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold">
                      {player.name.substring(0, 1).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{player.name}</span>
                  </div>
                  <span className="text-white font-bold">{player.score} pts</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
