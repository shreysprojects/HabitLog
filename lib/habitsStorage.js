import AsyncStorage from '@react-native-async-storage/async-storage'
import { loadStoredSettings } from './settings'
import { syncCheckinReminders } from './notifications'

// Same API as LifeLayer's habitsStorage; the screen passes userId 'local'.

const key = (uid) => `@habits_${uid}`

export async function loadHabits(userId) {
  const raw = await AsyncStorage.getItem(key(userId))
  if (!raw) return { breaking: [], building: [], tips: '' }
  const p = JSON.parse(raw)
  return { breaking: p.breaking ?? [], building: p.building ?? [], tips: p.tips ?? '' }
}

export async function saveHabits(userId, data) {
  await AsyncStorage.setItem(key(userId), JSON.stringify(data))
  // Keep the scheduled check-ins in step with the building list
  loadStoredSettings()
    .then(s => syncCheckinReminders(s, data.building.map(h => h.name)))
    .catch(() => {})
}
