import { useState, useCallback } from 'react'
import type { UserProfile, UserSummary, SessionSummary, KeyStat } from '../types'

const API = 'http://localhost:3001/api'

export function useProfile() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null)
  const [users, setUsers] = useState<UserSummary[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/users`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setUsers(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const selectUser = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/users/${id}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setCurrentUser(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载失败')
    } finally {
      setLoading(false)
    }
  }, [])

  const createUser = useCallback(async (name: string, color: string): Promise<UserProfile | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`${API}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, color }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const user: UserProfile = await res.json()
      setCurrentUser(user)
      return user
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建失败')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const saveSession = useCallback(async (
    session: SessionSummary,
    updatedKeyStats: Record<string, KeyStat>,
  ) => {
    if (!currentUser) return
    try {
      await fetch(`${API}/users/${currentUser.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session, keyStats: updatedKeyStats }),
      })
      // Update local state optimistically
      setCurrentUser(prev => {
        if (!prev) return prev
        return {
          ...prev,
          sessions: [...prev.sessions, session],
          keyStats: { ...prev.keyStats, ...updatedKeyStats },
        }
      })
    } catch (e) {
      console.error('Failed to save session:', e)
    }
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
    saveSession,
    logout,
  }
}
