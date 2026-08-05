import axios from 'axios'
import * as SecureStore from 'expo-secure-store'

// ← Change this to your backend URL
export const BASE_URL = 'http://192.168.196.2:5000/api'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
})

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('awa_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    if (err.response?.status === 401) {
      await SecureStore.deleteItemAsync('awa_token')
      await SecureStore.deleteItemAsync('awa_user')
    }
    return Promise.reject(err)
  }
)

export default api