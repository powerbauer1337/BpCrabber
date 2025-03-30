import axios, { AxiosInstance } from 'axios';
import { AppConfig } from '../config/app.config';

export const createHttpClient = (baseURL: string): AxiosInstance => {
  const client = axios.create({
    baseURL,
    timeout: AppConfig.api.timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  client.interceptors.request.use(
    config => {
      // Add auth token if available
      const token = localStorage.getItem(AppConfig.auth.tokenStorageKey);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => Promise.reject(error)
  );

  return client;
};
