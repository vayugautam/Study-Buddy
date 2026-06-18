import axios from 'axios'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 60000, // 60 seconds (AI generation takes time)
})

// Request interceptor — attach JWT
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('study_buddy_token') || sessionStorage.getItem('study_buddy_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor — handle 401
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if the user is already on the login page or trying to log in
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('study_buddy_token')
        sessionStorage.removeItem('study_buddy_token')
        window.location.href = '/login'
      }
    }
    console.error('API Error Response:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default axiosClient
