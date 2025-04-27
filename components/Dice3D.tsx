"use client"

import { useEffect, useState } from "react"
import { useGame } from "@/context/GameContext"

// Simplified Dice3D component that doesn't rely on Three.js
export default function Dice3D() {
  const { room } = useGame()
  const [diceValues, setDiceValues] = useState<number[]>([])
  const [rolling, setRolling] = useState(false)

  // Update from Firebase
  useEffect(() => {
    if (room?.gameState.diceValues) {
      if (room.gameState.diceValues.length > 0 && !rolling) {
        setRolling(true)

        // Simulate dice roll animation
        setTimeout(() => {
          setDiceValues(room.gameState.diceValues)
          setRolling(false)
        }, 500)
      }
    }
  }, [room?.gameState.diceValues])

  // Simplified 2D dice rendering
  return (
    <div className="w-full h-64 relative flex items-center justify-center">
      {rolling ? (
        <div className="flex gap-8 animate-bounce">
          <div className="w-16 text-black h-16 bg-white rounded-lg shadow-lg flex items-center justify-center text-4xl font-bold">
            ?
          </div>
          <div className="w-16 h-16  text-black bg-white rounded-lg shadow-lg flex items-center justify-center text-4xl font-bold">
            ?
          </div>
        </div>
      ) : diceValues.length > 0 ? (
        <div className="flex gap-8">
          {diceValues.map((value, index) => (
            <div
              key={index}
              className="w-16 h-16 text-black bg-white rounded-lg shadow-lg flex items-center justify-center text-4xl font-bold"
            >
              {value}
            </div>
          ))}
        </div>
      ) : null}

      {!rolling && diceValues.length > 0 && (
        <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 mb-4">
          <div className="bg-white/80 px-4 py-2 text-black rounded-lg text-2xl font-bold">
            {diceValues.join(" + ")} = {diceValues.reduce((sum, v) => sum + v, 0)}
          </div>
        </div>
      )}
    </div>
  )
}
