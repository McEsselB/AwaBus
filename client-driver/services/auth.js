import * as SecureStore from 'expo-secure-store'
import api from './api'

export async function login(phone, password) {
  const { data } = await api.post('/auth/login', { phone, password })
  await SecureStore.setItemAsync('awa_token', data.token)
  await SecureStore.setItemAsync('awa_user', JSON.stringify(data.user))
  return data.user
}

export async function logout() {
  await SecureStore.deleteItemAsync('awa_token')
  await SecureStore.deleteItemAsync('awa_user')
}

export async function getStoredUser() {
  try {
    const raw = await SecureStore.getItemAsync('awa_user')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export async function getToken() {
  return SecureStore.getItemAsync('awa_token')
}