let audioCtx: AudioContext | null = null

export function playNotificationSound(): void {
  if (typeof window === "undefined") return
  try {
    if (!audioCtx) audioCtx = new AudioContext()
    const oscillator = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    oscillator.connect(gain)
    gain.connect(audioCtx.destination)
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
    oscillator.type = "sine"
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3)
    oscillator.start(audioCtx.currentTime)
    oscillator.stop(audioCtx.currentTime + 0.3)
  } catch {
    // AudioContext may be blocked before user interaction
  }
}
