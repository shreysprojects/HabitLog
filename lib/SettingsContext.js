import { createContext, useContext, useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SETTINGS_KEY, DEFAULT_SETTINGS, loadStoredSettings } from './settings'
import { syncCheckinReminders, hasPermission } from './notifications'
import { loadHabits } from './habitsStorage'

const SettingsContext = createContext(null)

function resync(settings, { prompt = false } = {}) {
  loadHabits('local')
    .then(h => syncCheckinReminders(settings, h.building.map(x => x.name), { prompt }))
    .catch(() => {})
}

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    loadStoredSettings().then(next => {
      setSettings(next)
      setLoaded(true)
      // Re-sync silently on launch; the permission prompt only ever comes
      // from a user action in Settings or the Habits screen.
      hasPermission().then(granted => {
        if (granted) resync(next)
      })
    })
  }, [])

  function update(patch, { prompt = false } = {}) {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).catch(() => {})
      resync(next, { prompt })
      return next
    })
  }

  return (
    <SettingsContext.Provider value={{ settings, update, loaded }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
