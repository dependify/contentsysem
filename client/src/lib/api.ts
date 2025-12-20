// Enhanced API client with interceptors and error handling
import axios, { AxiosError, AxiosRequestConfig } from 'axios';

// Create axios instance with defaults
const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // For backward compatibility, also include API key
    const apiKey = localStorage.getItem('api_key') || 'test-secret-key';
    config.headers['x-api-key'] = apiKey;

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error?: string; message?: string }>) => {
    // Handle specific error cases
    if (error.response) {
      const status = error.response.status;
      const errorMessage = error.response.data?.error || error.response.data?.message || 'An error occurred';

      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
          break;
        case 403:
          console.error('Access forbidden:', errorMessage);
          break;
        case 404:
          console.error('Resource not found:', errorMessage);
          break;
        case 429:
          console.error('Rate limited:', errorMessage);
          break;
        case 500:
          console.error('Server error:', errorMessage);
          break;
      }
    } else if (error.request) {
      console.error('Network error - no response received');
    }

    return Promise.reject(error);
  }
);

// Helper methods for common operations
export const apiHelpers = {
  // GET with error handling
  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.get(url, config);
    return response.data;
  },

  // POST with error handling
  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.post(url, data, config);
    return response.data;
  },

  // PUT with error handling
  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.put(url, data, config);
    return response.data;
  },

  // DELETE with error handling
  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.delete(url, config);
    return response.data;
  },

  // PATCH with error handling
  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.patch(url, data, config);
    return response.data;
  },
};

// Export types for use in components
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export default api;
