
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// Add API key to requests
// In a real app, this might come from a login response/context
const API_KEY = 'test-secret-key';

api.interceptors.request.use((config) => {
  config.headers['x-api-key'] = API_KEY;
  return config;
});

export default api;
