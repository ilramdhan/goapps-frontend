"use client"

import { create } from "zustand"

interface PresenceState {
  onlineUsers: Set<string>
  setOnline: (userId: string) => void
  setOffline: (userId: string) => void
  setOnlineUsers: (userIds: string[]) => void
  isOnline: (userId: string) => boolean
}

export const usePresenceStore = create<PresenceState>((set, get) => ({
  onlineUsers: new Set(),
  setOnline: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers)
      next.add(userId)
      return { onlineUsers: next }
    }),
  setOffline: (userId) =>
    set((s) => {
      const next = new Set(s.onlineUsers)
      next.delete(userId)
      return { onlineUsers: next }
    }),
  setOnlineUsers: (userIds) => set({ onlineUsers: new Set(userIds) }),
  isOnline: (userId) => get().onlineUsers.has(userId),
}))
