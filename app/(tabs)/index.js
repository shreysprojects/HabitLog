import { useState, useCallback } from 'react'
import { View, Text, Pressable, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../lib/ThemeContext'
import { useSettings } from '../../lib/SettingsContext'
import { loadHabits } from '../../lib/habitsStorage'
import { getCheckinsForDate, setCheckin, getCheckinRates, today } from '../../lib/storage'
import { hasPermission, syncCheckinReminders } from '../../lib/notifications'
import HabitsTab from '../../components/HabitsTab'

export default function HabitsScreen() {
  const { theme } = useTheme()
  const { settings } = useSettings()
  const [habits, setHabits] = useState({ breaking: [], building: [], tips: '' })
  const [checkins, setCheckins] = useState({})
  const [rates, setRates] = useState({})
  const [loading, setLoading] = useState(true)
  const [needsPerm, setNeedsPerm] = useState(false)

  useFocusEffect(useCallback(() => {
    let active = true
    Promise.all([loadHabits('local'), getCheckinsForDate(today()), getCheckinRates(7)])
      .then(([h, rows, r]) => {
        if (!active) return
        setHabits(h)
        const map = {}
        for (const row of rows) map[`${row.habit_id}:${row.slot}`] = row.done
        setCheckins(map)
        setRates(r)
        setLoading(false)
        if (settings.enabled && h.building.length > 0) {
          hasPermission().then(granted => { if (active) setNeedsPerm(!granted) }).catch(() => {})
        } else {
          setNeedsPerm(false)
        }
      })
      .catch(() => {})
    return () => { active = false }
  }, [settings.enabled]))

  async function onCheckin(habitId, slot, done) {
    setCheckins(prev => ({ ...prev, [`${habitId}:${slot}`]: done ? 1 : 0 }))
    await setCheckin(habitId, today(), slot, done)
    getCheckinRates(7).then(setRates).catch(() => {})
  }

  async function enableReminders() {
    const n = await syncCheckinReminders(settings, habits.building.map(h => h.name), { prompt: true })
    setNeedsPerm(n === 0)
  }

  if (loading) return <View style={[hs.page, { backgroundColor: theme.bg }]} />

  return (
    <KeyboardAvoidingView style={[hs.page, { backgroundColor: theme.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={hs.content} keyboardShouldPersistTaps="handled">
        {needsPerm && (
          <Pressable
            onPress={enableReminders}
            style={[hs.permBanner, { backgroundColor: theme.accent + '22', borderColor: theme.accent }]}
          >
            <Ionicons name="notifications-outline" size={16} color={theme.accent} />
            <Text style={[hs.permText, { color: theme.accent }]}>
              Tap to allow notifications so HabitLog can check in with you
            </Text>
          </Pressable>
        )}
        <HabitsTab
          userId="local"
          theme={theme}
          habits={habits}
          onHabitsChange={setHabits}
          checkins={checkins}
          rates={rates}
          checkinTimes={settings.checkinTimes}
          onCheckin={onCheckin}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const hs = StyleSheet.create({
  page: { flex: 1 },
  content: { padding: 16, paddingBottom: 36 },
  permBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  permText: { flex: 1, fontSize: 12, fontWeight: '600' },
})
