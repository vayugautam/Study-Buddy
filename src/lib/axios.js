import axios from 'axios'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 60000, // 60 seconds (AI generation takes time)
})

// Guest mode: do not attach legacy authentication tokens.
axiosClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

// A 401 should be handled by the calling feature. Never redirect to /login:
// authentication routes have been removed and the wildcard route redirects
// unknown paths back to /dashboard, which otherwise creates a navigation loop.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error Response:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default axiosClient
