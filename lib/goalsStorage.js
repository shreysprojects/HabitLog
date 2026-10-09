import AsyncStorage from '@react-native-async-storage/async-storage'

// Same API as LifeLayer's goalsStorage, minus Supabase. Goals shape:
// { calories, protein, carbs, fat, isCustom, onboardingDone }

const KEY = '@user_goals'

export async function getUserGoals(userId) {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export async function saveUserGoals(userId, goals) {
  await AsyncStorage.setItem(KEY, JSON.stringify(goals)).catch(() => {})
}

export async function clearUserGoals() {
  await AsyncStorage.removeItem(KEY).catch(() => {})
}
