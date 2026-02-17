import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8787',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth interceptor for Stack Auth tokens
api.interceptors.request.use(
  async (config) => {
    // Token will be added by Stack Auth SDK when needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
