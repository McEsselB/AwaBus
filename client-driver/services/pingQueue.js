import * as SecureStore from 'expo-secure-store'

const QUEUE_KEY = 'awa_ping_queue'
const MAX_QUEUE = 60

export async function getPingQueue() {
  try {
    const raw = await SecureStore.getItemAsync(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function addToPingQueue(ping) {
  try {
    const queue = await getPingQueue()
    if (queue.length >= MAX_QUEUE) {
      queue.shift() // drop oldest if full
    }
    queue.push(ping)
    await SecureStore.setItemAsync(QUEUE_KEY, JSON.stringify(queue))
  } catch (err) {
    console.error('[PingQueue] Failed to add ping:', err)
  }
}

export async function clearPingQueue() {
  try {
    await SecureStore.deleteItemAsync(QUEUE_KEY)
  } catch {}
}