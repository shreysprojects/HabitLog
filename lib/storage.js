import { openDatabaseSync } from 'expo-sqlite'

// Meal functions keep LifeLayer's (userId, ...) signatures so the ported
// meals screen and pickers work unchanged; this single-user app ignores userId.

const db = openDatabaseSync('habitlog.db')

function migrate() {
  const row = db.getFirstSync('PRAGMA user_version')
  const version = row?.user_version ?? 0
  if (version < 1) {
    db.execSync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS meals (
        date TEXT PRIMARY KEY,
        meals TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS saved_meals (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        meals TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS checkins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        habit_id TEXT NOT NULL,
        date TEXT NOT NULL,
        slot INTEGER NOT NULL,
        done INTEGER NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(habit_id, date, slot)
      );
      CREATE INDEX IF NOT EXISTS idx_checkins_date ON checkins(date);
      PRAGMA user_version = 1;
    `)
  }
}
migrate()

function _localDate(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

export function today() {
  return _localDate()
}

// ── Meals ──────────────────────────────────────────────────────────────────

export async function getMeals(userId, date) {
  const row = await db.getFirstAsync('SELECT meals FROM meals WHERE date = ?', [date])
  return row ? JSON.parse(row.meals) : []
}

export async function saveMeal(userId, date, meal) {
  const meals = await getMeals(userId, date)
  const idx = meals.findIndex(m => m.id === meal.id)
  if (idx >= 0) meals[idx] = meal
  else meals.push(meal)
  await db.runAsync(
    'INSERT INTO meals (date, meals) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET meals = excluded.meals',
    [date, JSON.stringify(meals)]
  )
  return meals
}

export async function deleteMeal(userId, date, mealId) {
  const meals = await getMeals(userId, date)
  const next = meals.filter(m => m.id !== mealId)
  await db.runAsync(
    'INSERT INTO meals (date, meals) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET meals = excluded.meals',
    [date, JSON.stringify(next)]
  )
  return next
}

export async function getRecentMealHistory(userId, days = 14) {
  const sd = new Date()
  sd.setDate(sd.getDate() - days)
  const rows = await db.getAllAsync(
    'SELECT date, meals FROM meals WHERE date >= ? ORDER BY date DESC',
    [_localDate(sd)]
  )
  const all = rows.flatMap(row =>
    JSON.parse(row.meals).map(m => ({ ...m, lastEaten: row.date }))
  )
  const seen = new Set()
  return all.filter(m => {
    const key = m.name.toLowerCase().trim()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Saved meal templates ───────────────────────────────────────────────────

export async function getSavedMeals(userId) {
  const row = await db.getFirstAsync('SELECT meals FROM saved_meals WHERE id = 1')
  return row ? JSON.parse(row.meals) : []
}

export async function upsertSavedMeal(userId, meal) {
  const meals = await getSavedMeals(userId)
  const idx = meals.findIndex(m => m.id === meal.id)
  if (idx >= 0) meals[idx] = meal
  else meals.push(meal)
  await db.runAsync(
    'INSERT INTO saved_meals (id, meals) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET meals = excluded.meals',
    [JSON.stringify(meals)]
  )
}

export async function deleteSavedMeal(userId, id) {
  const meals = await getSavedMeals(userId)
  await db.runAsync(
    'INSERT INTO saved_meals (id, meals) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET meals = excluded.meals',
    [JSON.stringify(meals.filter(m => m.id !== id))]
  )
}

// ── Habit check-ins ────────────────────────────────────────────────────────
// One row per (habit, day, slot). done = 1 for "yes", 0 for "not yet".

export async function getCheckinsForDate(date) {
  return db.getAllAsync('SELECT habit_id, slot, done FROM checkins WHERE date = ?', [date])
}

export async function setCheckin(habitId, date, slot, done) {
  await db.runAsync(
    `INSERT INTO checkins (habit_id, date, slot, done) VALUES (?, ?, ?, ?)
     ON CONFLICT(habit_id, date, slot) DO UPDATE SET done = excluded.done`,
    [habitId, date, slot, done ? 1 : 0]
  )
}

export async function getCheckinRates(days = 7) {
  const sd = new Date()
  sd.setDate(sd.getDate() - (days - 1))
  const rows = await db.getAllAsync(
    `SELECT habit_id, SUM(done) AS yes, COUNT(*) AS answered
     FROM checkins WHERE date >= ? GROUP BY habit_id`,
    [_localDate(sd)]
  )
  const out = {}
  for (const r of rows) out[r.habit_id] = { yes: r.yes, answered: r.answered }
  return out
}
