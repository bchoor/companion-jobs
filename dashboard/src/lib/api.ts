import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8787',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Extract nested data from API responses: { success, data } → data
api.interceptors.response.use((response) => {
  if (response.data?.success !== undefined && response.data?.data !== undefined) {
    response.data = response.data.data;
  }
  return response;
});
