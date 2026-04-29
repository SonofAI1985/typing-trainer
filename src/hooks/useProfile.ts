import { useState, useCallback } from 'react'
import type { UserProfile, UserSummary, SessionSummary, KeyStat } from '../types'

// ── localStorage helpers ──────────────────────────────────────────────────────

const STORAGE_KEY = 'typing-trainer-users'

function loadAllProfiles(): UserProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveAllProfiles(profiles: UserProfile[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles))
}

function profileToSummary(p: UserProfile): UserSummary {
  const lastSession = p.sessions[p.sessions.length - 1] ?? null
  return {
    id: p.id,
    name: p.name,
    color: p.color,
    avatar: p.avatar,
    sessionCount: p.sessions.length,
    lastWpm: lastSession?.wpm ?? null,
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useProfile() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading] = useState(false)
  const [error] = useState<string | null>(null)

  const loadUsers = useCallback(() => {
    const profiles = loadAllProfiles()
    setUsers(profiles.map(profileToSummary))
  }, [])

  const selectUser = useCallback((id: string) => {
    const profiles = loadAllProfiles()
    const user = profiles.find(p => p.id === id) ?? null
    setCurrentUser(user)
  }, [])

  const createUser = useCallback((name: string, color: string): UserProfile | null => {
    const profiles = loadAllProfiles()
    const user: UserProfile = {
      id: crypto.randomUUID(),
      name,
      color,
      avatar: undefined,
      createdAt: new Date().toISOString(),
      keyStats: {},
      sessions: [],
    }
    profiles.push(user)
    saveAllProfiles(profiles)
    setCurrentUser(user)
    setUsers(profiles.map(profileToSummary))
    return user
  }, [])

  const saveSession = useCallback((
    session: SessionSummary,
    updatedKeyStats: Record<string, KeyStat>,
  ) => {
    if (!currentUser) return
    const profiles = loadAllProfiles()
    const idx = profiles.findIndex(p => p.id === currentUser.id)
    if (idx === -1) return
    const updated: UserProfile = {
      ...profiles[idx],
      sessions: [...profiles[idx].sessions, session],
      keyStats: { ...profiles[idx].keyStats, ...updatedKeyStats },
    }
    profiles[idx] = updated
    saveAllProfiles(profiles)
    setCurrentUser(updated)
    setUsers(profiles.map(profileToSummary))
  }, [currentUser])

  const updateUser = useCallback((
    id: string,
    patch: { name?: string; color?: string; avatar?: string },
  ): boolean => {
    const profiles = loadAllProfiles()
    const idx = profiles.findIndex(p => p.id === id)
    if (idx === -1) return false
    profiles[idx] = { ...profiles[idx], ...patch }
    saveAllProfiles(profiles)
    setUsers(profiles.map(profileToSummary))
    if (currentUser?.id === id) setCurrentUser(profiles[idx])
    return true
  }, [currentUser])

  const logout = useCallback(() => {
    setCurrentUser(null)
  }, [])

  return {
    currentUser,
    users,
    loading,
    error,
    loadUsers,
    selectUser,
    createUser,
    updateUser,
    saveSession,
    logout,
  }
}
