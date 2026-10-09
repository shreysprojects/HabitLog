import * as Notifications from 'expo-notifications'
import { Platform } from 'react-native'
import { minsToLabel } from './time'
import { SLOT_LABELS } from './settings'

const CHANNEL_ID = 'habit-checkins'

const SLOT_BODIES = [
  habits => `Have you started on ${habits} today? If not, no stress — now is a great time.`,
  habits => `Quick check: how is ${habits} going? Haven’t started yet? That’s okay, just begin.`,
  habits => `Last check of the day — did ${habits} happen? If not, tomorrow is a fresh start.`,
]

export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  })
}

export async function ensurePermissions() {
  if (Platform.OS === 'android') {
    // On Android 13+ the channel must exist before the permission prompt
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Habit check-ins',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    })
  }
  const current = await Notifications.getPermissionsAsync()
  if (current.granted) return true
  const req = await Notifications.requestPermissionsAsync()
  return req.granted
}

export async function hasPermission() {
  const p = await Notifications.getPermissionsAsync()
  return p.granted
}

// Three daily check-in notifications for building habits. Pass prompt: true
// only from user-initiated toggles so background saves never trigger the
// system permission dialog.
export async function syncCheckinReminders(settings, buildingNames, { prompt = false } = {}) {
  await Notifications.cancelAllScheduledNotificationsAsync()
  if (!settings.enabled || buildingNames.length === 0) return 0

  const granted = prompt ? await ensurePermissions() : await hasPermission()
  if (!granted) return 0

  const habitsText = buildingNames.length <= 3
    ? buildingNames.join(', ')
    : `your ${buildingNames.length} habits`

  for (let slot = 0; slot < settings.checkinTimes.length; slot++) {
    const t = settings.checkinTimes[slot] % (24 * 60)
    const body = (SLOT_BODIES[slot] ?? SLOT_BODIES[1])(habitsText)
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${SLOT_LABELS[slot] ?? minsToLabel(t)} check-in 🌱`,
        body,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: Math.floor(t / 60),
        minute: t % 60,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    })
  }
  return settings.checkinTimes.length
}

export async function sendTestNotification() {
  const ok = await ensurePermissions()
  if (!ok) return false
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Check-in 🌱',
      body: 'This is what a habit check-in will look like.',
      sound: true,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
    },
  })
  return true
}
