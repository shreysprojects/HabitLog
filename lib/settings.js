import AsyncStorage from '@react-native-async-storage/async-storage'

export const SETTINGS_KEY = '@habitlog_settings'

export const DEFAULT_SETTINGS = {
  enabled: true,
  // Three daily check-ins for building habits, minutes from midnight
  checkinTimes: [540, 840, 1200], // 9:00 AM, 2:00 PM, 8:00 PM
  showMealsTab: true,
}

export const SLOT_LABELS = ['Morning', 'Midday', 'Evening']

export async function loadStoredSettings() {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}
