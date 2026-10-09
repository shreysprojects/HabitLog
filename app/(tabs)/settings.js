import { useState, useCallback } from 'react'
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Switch, Modal, Alert } from 'react-native'
import { useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../lib/ThemeContext'
import { useSettings } from '../../lib/SettingsContext'
import { SLOT_LABELS } from '../../lib/settings'
import { hasPermission, sendTestNotification } from '../../lib/notifications'
import { getUserGoals, saveUserGoals, clearUserGoals } from '../../lib/goalsStorage'
import { minsToLabel } from '../../lib/time'

const GOAL_FIELDS = [
  { key: 'calories', label: 'Calories', unit: 'kcal' },
  { key: 'protein',  label: 'Protein',  unit: 'g' },
  { key: 'carbs',    label: 'Carbs',    unit: 'g' },
  { key: 'fat',      label: 'Fat',      unit: 'g' },
]

export default function SettingsScreen() {
  const { theme, toggleDark } = useTheme()
  const { settings, update } = useSettings()
  const [granted, setGranted] = useState(true)
  const [pickingSlot, setPickingSlot] = useState(null) // 0 | 1 | 2 | null
  const [testSent, setTestSent] = useState(false)
  const [goalDrafts, setGoalDrafts] = useState({ calories: '', protein: '', carbs: '', fat: '' })

  useFocusEffect(useCallback(() => {
    hasPermission().then(setGranted).catch(() => {})
    getUserGoals('local').then(g => {
      setGoalDrafts({
        calories: g?.calories ? String(g.calories) : '',
        protein:  g?.protein  ? String(g.protein)  : '',
        carbs:    g?.carbs    ? String(g.carbs)    : '',
        fat:      g?.fat      ? String(g.fat)      : '',
      })
    }).catch(() => {})
  }, []))

  async function onTest() {
    const ok = await sendTestNotification()
    setGranted(ok)
    if (ok) {
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    }
  }

  async function saveGoals() {
    const nums = Object.fromEntries(
      Object.entries(goalDrafts).map(([k, v]) => [k, v.trim() ? Number(v) : null])
    )
    if (Object.values(nums).some(v => v !== null && !Number.isFinite(v))) {
      Alert.alert('Check your numbers', 'Goals must be plain numbers.')
      return
    }
    if (Object.values(nums).every(v => v === null)) {
      await clearUserGoals()
    } else {
      await saveUserGoals('local', { ...nums, isCustom: true, onboardingDone: true })
    }
    Alert.alert('Saved', 'Your nutrition goals are updated.')
  }

  function setCheckinTime(slot, mins) {
    const next = [...settings.checkinTimes]
    next[slot] = mins
    update({ checkinTimes: next })
    setPickingSlot(null)
  }

  const pickerOptions = Array.from({ length: 48 }, (_, i) => i * 30)

  const cardStyle = { backgroundColor: theme.card, borderColor: theme.cardBorder }
  const labelStyle = { color: theme.text, fontSize: 14, fontWeight: '600' }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={st.container}>
      <Text style={[st.sectionTitle, { color: theme.subtext }]}>HABIT CHECK-INS</Text>
      <View style={[st.card, cardStyle]}>
        <View style={st.row}>
          <Text style={labelStyle}>Check-in reminders</Text>
          <Switch
            value={settings.enabled}
            onValueChange={v => update({ enabled: v }, { prompt: v })}
            trackColor={{ true: theme.accent }}
          />
        </View>

        {settings.enabled && !granted && (
          <Pressable onPress={onTest} style={[st.warnRow, { backgroundColor: theme.danger + '18' }]}>
            <Ionicons name="alert-circle" size={16} color={theme.danger} />
            <Text style={{ color: theme.danger, fontSize: 12, fontWeight: '600', flex: 1 }}>
              Notifications aren't allowed yet — tap to enable
            </Text>
          </Pressable>
        )}

        {settings.checkinTimes.map((t, slot) => (
          <View key={slot}>
            <View style={[st.divider, { backgroundColor: theme.divider }]} />
            <Pressable style={st.row} onPress={() => setPickingSlot(slot)}>
              <Text style={labelStyle}>{SLOT_LABELS[slot] ?? `Check-in ${slot + 1}`}</Text>
              <View style={st.valueWrap}>
                <Text style={[st.value, { color: theme.subtext }]}>{minsToLabel(t)}</Text>
                <Ionicons name="chevron-forward" size={16} color={theme.muted} />
              </View>
            </Pressable>
          </View>
        ))}

        <View style={[st.divider, { backgroundColor: theme.divider }]} />
        <Pressable style={st.row} onPress={onTest}>
          <Text style={[labelStyle, { color: theme.accent }]}>
            {testSent ? 'Sent — check in 2 seconds' : 'Send a test notification'}
          </Text>
          <Ionicons name="paper-plane-outline" size={16} color={theme.accent} />
        </Pressable>

        <Text style={[st.footnote, { color: theme.muted }]}>
          Reminders only fire while you have habits you're building.
        </Text>
      </View>

      <Text style={[st.sectionTitle, { color: theme.subtext }]}>NUTRITION GOALS</Text>
      <View style={[st.card, cardStyle]}>
        {GOAL_FIELDS.map((f, i) => (
          <View key={f.key}>
            {i > 0 && <View style={[st.divider, { backgroundColor: theme.divider }]} />}
            <View style={st.row}>
              <Text style={labelStyle}>{f.label}</Text>
              <View style={st.goalInputWrap}>
                <TextInput
                  value={goalDrafts[f.key]}
                  onChangeText={v => setGoalDrafts(prev => ({ ...prev, [f.key]: v }))}
                  keyboardType="numeric"
                  placeholder="—"
                  placeholderTextColor={theme.muted}
                  style={[st.goalInput, {
                    backgroundColor: theme.input,
                    borderColor: theme.inputBorder,
                    color: theme.text,
                  }]}
                />
                <Text style={[st.goalUnit, { color: theme.muted }]}>{f.unit}</Text>
              </View>
            </View>
          </View>
        ))}
        <Pressable onPress={saveGoals} style={[st.saveGoalsBtn, { backgroundColor: theme.accent }]}>
          <Text style={st.saveGoalsText}>Save Goals</Text>
        </Pressable>
        <Text style={[st.footnote, { color: theme.muted }]}>
          Leave everything blank to track meals without targets.
        </Text>
      </View>

      <Text style={[st.sectionTitle, { color: theme.subtext }]}>APPEARANCE</Text>
      <View style={[st.card, cardStyle]}>
        <View style={st.row}>
          <Text style={labelStyle}>Dark mode</Text>
          <Switch
            value={theme.isDark}
            onValueChange={toggleDark}
            trackColor={{ true: theme.accent }}
          />
        </View>
        <View style={[st.divider, { backgroundColor: theme.divider }]} />
        <View style={st.row}>
          <Text style={labelStyle}>Show Meals tab</Text>
          <Switch
            value={settings.showMealsTab}
            onValueChange={v => update({ showMealsTab: v })}
            trackColor={{ true: theme.accent }}
          />
        </View>
        {!settings.showMealsTab && (
          <Text style={[st.footnote, { color: theme.muted }]}>
            Your meal history is kept — turn this back on anytime.
          </Text>
        )}
      </View>

      <Text style={[st.sectionTitle, { color: theme.subtext }]}>ABOUT</Text>
      <View style={[st.card, cardStyle]}>
        <View style={st.row}>
          <Text style={labelStyle}>Version</Text>
          <Text style={[st.value, { color: theme.subtext }]}>1.0.0</Text>
        </View>
      </View>

      <Modal visible={pickingSlot !== null} transparent animationType="fade" onRequestClose={() => setPickingSlot(null)}>
        <Pressable style={st.pickerBackdrop} onPress={() => setPickingSlot(null)}>
          <View style={[st.pickerCard, cardStyle]}>
            <Text style={[st.pickerTitle, { color: theme.text }]}>
              {pickingSlot !== null ? `${SLOT_LABELS[pickingSlot] ?? 'Check-in'} time` : ''}
            </Text>
            <ScrollView style={{ maxHeight: 360 }}>
              {pickerOptions.map(m => {
                const selected = pickingSlot !== null && settings.checkinTimes[pickingSlot] === m
                return (
                  <Pressable
                    key={m}
                    onPress={() => setCheckinTime(pickingSlot, m)}
                    style={[st.pickerRow, selected && { backgroundColor: theme.accent + '22' }]}
                  >
                    <Text style={{
                      color: selected ? theme.accent : theme.text,
                      fontWeight: selected ? '700' : '500',
                      fontSize: 14,
                    }}>
                      {minsToLabel(m)}
                    </Text>
                    {selected && <Ionicons name="checkmark" size={16} color={theme.accent} />}
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  )
}

const st = StyleSheet.create({
  container: { padding: 12, paddingBottom: 32 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginLeft: 6, marginBottom: 6, marginTop: 14 },
  card: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    gap: 10,
  },
  warnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  divider: { height: StyleSheet.hairlineWidth },
  valueWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  value: { fontSize: 13, fontWeight: '600' },
  footnote: { fontSize: 11, fontWeight: '500', paddingBottom: 12, paddingTop: 2 },
  goalInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  goalInput: {
    minWidth: 84,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  goalUnit: { fontSize: 12, fontWeight: '600', width: 30 },
  saveGoalsBtn: {
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  saveGoalsText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(13,27,94,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  pickerCard: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  pickerTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
})
