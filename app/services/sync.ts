import * as FileSystem from 'expo-file-system/legacy'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as BackgroundTask from 'expo-background-task'
import * as TaskManager from 'expo-task-manager'
import { Platform } from 'react-native'
import { MANIFEST_URL, DB_URL, DB_NAME, SYNC_TASK_NAME, SYNC_INTERVAL_SECONDS } from '../constants'
import type { Manifest } from './db'

const LAST_SYNC_KEY = 'last_sync_generated_at'

const dbDir = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}SQLite/`
  : null

export async function getDbPath(): Promise<string | null> {
  if (!dbDir) return null
  return `${dbDir}${DB_NAME}`
}

// ---------------------------------------------------------------------------
// Check remote manifest and download the DB if it's newer than what we have.
// Returns true if a new DB was downloaded.
// ---------------------------------------------------------------------------
export async function syncIfNeeded(): Promise<boolean> {
  if (Platform.OS === 'web') return false

  let manifest: Manifest
  try {
    const res = await fetch(MANIFEST_URL)
    if (!res.ok) throw new Error(`Manifest fetch failed: ${res.status}`)
    manifest = await res.json() as Manifest
  } catch {
    // Offline or server unavailable — silently use cached DB
    return false
  }

  const stored = await AsyncStorage.getItem(LAST_SYNC_KEY)
  if (stored === manifest.generatedAt) return false

  await FileSystem.makeDirectoryAsync(dbDir!, { intermediates: true })
  const dest = `${dbDir}${DB_NAME}`

  const { status } = await FileSystem.downloadAsync(DB_URL, dest)
  if (status !== 200) throw new Error(`DB download failed with status ${status}`)

  await AsyncStorage.setItem(LAST_SYNC_KEY, manifest.generatedAt)
  return true
}

// ---------------------------------------------------------------------------
// Check whether a local DB file exists (first-launch detection).
// ---------------------------------------------------------------------------
export async function hasLocalDb(): Promise<boolean> {
  if (Platform.OS === 'web') return false
  const path = await getDbPath()
  if (!path) return false
  const info = await FileSystem.getInfoAsync(path)
  return info.exists
}

// ---------------------------------------------------------------------------
// Background sync task (native only).
// ---------------------------------------------------------------------------
TaskManager.defineTask(SYNC_TASK_NAME, async () => {
  try {
    await syncIfNeeded()
    return BackgroundTask.BackgroundTaskResult.Success
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed
  }
})

export async function registerBackgroundSync(): Promise<void> {
  if (Platform.OS === 'web') return
  try {
    await BackgroundTask.registerTaskAsync(SYNC_TASK_NAME, {
      minimumInterval: SYNC_INTERVAL_SECONDS,
    })
  } catch (err) {
    // Fails in Expo Go and when UIBackgroundModes is not configured.
    // Not critical — the app syncs on open instead.
    console.info('Background sync not registered:', err)
  }
}
