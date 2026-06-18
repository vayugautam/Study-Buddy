import axiosClient from '../lib/axios'

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

// Simulate async with delay
const simulateAsync = (data, delayMs = 600, errorRate = 0) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (errorRate > 0 && Math.random() < errorRate) {
        reject(new Error('Simulated server error'))
      } else {
        resolve(JSON.parse(JSON.stringify(data))) // deep clone
      }
    }, delayMs)
  })
}

export const adapter = {
  get: (mockFn, axiosPath, delayMs = 600) => {
    if (USE_MOCK) return simulateAsync(mockFn(), delayMs)
    return axiosClient.get(axiosPath).then((r) => r.data?.data || r.data)
  },

  post: (mockFn, axiosPath, body, delayMs = 1000) => {
    if (USE_MOCK) return simulateAsync(mockFn(body), delayMs)
    return axiosClient.post(axiosPath, body).then((r) => r.data?.data || r.data)
  },

  patch: (mockFn, axiosPath, body, delayMs = 500) => {
    if (USE_MOCK) return simulateAsync(mockFn(body), delayMs)
    return axiosClient.patch(axiosPath, body).then((r) => r.data?.data || r.data)
  },

  delete: (mockFn, axiosPath, delayMs = 400) => {
    if (USE_MOCK) return simulateAsync(mockFn(), delayMs)
    return axiosClient.delete(axiosPath).then((r) => r.data?.data || r.data)
  },
}

export default adapter
