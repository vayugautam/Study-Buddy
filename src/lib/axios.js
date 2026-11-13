import axios from 'axios'

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 60000,
})

// Guest mode: do not attach stale account tokens or redirect to removed auth routes.
axiosClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
)

// Surface API errors to the feature that made the request.
// Never redirect to /login: authentication is no longer part of the frontend.
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error Response:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default axiosClient
