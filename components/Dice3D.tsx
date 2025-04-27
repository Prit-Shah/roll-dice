"use client"

import { useRef, useEffect, useState } from "react"
import * as THREE from "three"
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber"
import { Physics, usePlane, useBox } from "@react-three/cannon"
import { useGame } from "@/context/GameContext"

// Floor component
function Floor(props: ThreeElements["mesh"]) {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], ...props }))
  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <shadowMaterial color="#003300" transparent opacity={0.4} />
    </mesh>
  )
}

// Die face textures
const createDieTextures = () => {
  const loader = new THREE.TextureLoader()
  const textures = []

  for (let i = 1; i <= 6; i++) {
    // In a real app, you'd use actual die face textures
    const canvas = document.createElement("canvas")
    canvas.width = 128
    canvas.height = 128
    const context = canvas.getContext("2d")
    if (context) {
      context.fillStyle = "#ffffff"
      context.fillRect(0, 0, 128, 128)
      context.fillStyle = "#000000"
      context.font = "80px Arial"
      context.textAlign = "center"
      context.textBaseline = "middle"
      context.fillText(String(i), 64, 64)
    }
    const texture = new THREE.CanvasTexture(canvas)
    textures.push(texture)
  }

  return textures
}

// Die component
function Die({
  value,
  position,
  onSettled,
}: {
  value: number
  position: [number, number, number]
  onSettled: (value: number) => void
}) {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
  }))

  const textures = useRef<THREE.Texture[]>()
  const velocity = useRef([0, 0, 0])
  const [settled, setSettled] = useState(false)

  // Initialize textures
  useEffect(() => {
    textures.current = createDieTextures()
  }, [])

  // Subscribe to velocity changes
  useEffect(() => {
    const unsubscribe = api.velocity.subscribe((v) => {
      velocity.current = v
    })
    return unsubscribe
  }, [api.velocity])

  // Check if die has settled
  useFrame(() => {
    if (
      !settled &&
      Math.abs(velocity.current[0]) < 0.01 &&
      Math.abs(velocity.current[1]) < 0.01 &&
      Math.abs(velocity.current[2]) < 0.01
    ) {
      setSettled(true)

      // Determine which face is up
      if (ref.current) {
        const rotation = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromEuler(ref.current.rotation))

        // Simplified logic to determine which face is up based on rotation
        // In a real app, you'd use more precise calculations
        const x = Math.round(rotation.x / (Math.PI / 2)) % 4
        const y = Math.round(rotation.y / (Math.PI / 2)) % 4
        const z = Math.round(rotation.z / (Math.PI / 2)) % 4

        // This is a simplified mapping - a real implementation would be more accurate
        const faceValue = ((x + y + z) % 6) + 1
        onSettled(faceValue)
      }
    }
  })

  // Apply impulse to roll the die
  useEffect(() => {
    if (!settled) {
      api.applyImpulse([Math.random() * 5 - 2.5, 10 + Math.random() * 5, Math.random() * 5 - 2.5], [0, 0, 0])
    }
  }, [api, settled])

  if (!textures.current) return null

  return (
    <mesh ref={ref} castShadow receiveShadow>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial map={textures.current[0]} attachArray="material" />
      <meshStandardMaterial map={textures.current[1]} attachArray="material" />
      <meshStandardMaterial map={textures.current[2]} attachArray="material" />
      <meshStandardMaterial map={textures.current[3]} attachArray="material" />
      <meshStandardMaterial map={textures.current[4]} attachArray="material" />
      <meshStandardMaterial map={textures.current[5]} attachArray="material" />
    </mesh>
  )
}

// Main Dice3D component
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
        }, 1500)
      }
    }
  }, [room?.gameState.diceValues])

  // Handle die settling
  const handleDieSettled = (index: number, value: number) => {
    setDiceValues((prev) => {
      const newValues = [...prev]
      newValues[index] = value
      return newValues
    })
  }

  return (
    <div className="w-full h-64 relative">
      <Canvas shadows camera={{ position: [0, 5, 8], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <spotLight position={[10, 10, 10]} angle={0.3} penumbra={1} intensity={1} castShadow />
        <Physics gravity={[0, -20, 0]}>
          <Floor position={[0, -1, 0]} />
          {rolling && (
            <>
              <Die value={1} position={[-1, 4, 0]} onSettled={(v) => handleDieSettled(0, v)} />
              <Die value={1} position={[1, 4, 0]} onSettled={(v) => handleDieSettled(1, v)} />
            </>
          )}
        </Physics>
      </Canvas>

      {!rolling && diceValues.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="bg-white/80 px-4 py-2 rounded-lg text-2xl font-bold">
            {diceValues.join(" + ")} = {diceValues.reduce((sum, v) => sum + v, 0)}
          </div>
        </div>
      )}
    </div>
  )
}
