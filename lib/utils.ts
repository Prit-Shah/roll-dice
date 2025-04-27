// Generate a random 4-character room code
export function generateRoomCode(): string {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  let result = ""
  for (let i = 0; i < 4; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  return result
}

// Generate a random guest name
export function generateGuestName(): string {
  return `Guest${Math.floor(1000 + Math.random() * 9000)}`
}

// Helper to join class names
export function cn(...classes: (string | boolean | undefined)[]): string {
  return classes.filter(Boolean).join(" ")
}
