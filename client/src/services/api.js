import axios from 'axios';

// Dynamically resolve API baseURL:
// 1. If explicit REACT_APP_API_URL is configured, use it.
// 2. In browser environments outside localhost, use relative '/api' so it works natively on any domain or Vercel preview URL.
// 3. In local development on localhost, default to 'http://localhost:5000/api'.
const resolveBaseUrl = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (
    typeof window !== 'undefined' &&
    window.location &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return '/api';
  }
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: resolveBaseUrl(),
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('talkpilot_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
