import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const apiURL = process.env.EXPO_PUBLIC_API_URL;

if (!apiURL) {
  throw new Error('[API] EXPO_PUBLIC_API_URL is not defined in environment variables.');
}

const api = axios.create({
  baseURL: apiURL,
  timeout: 30000,
});

/** Timeout dedicado a multipart / IA (Terra Voz). */
export const MULTIPART_AI_TIMEOUT_MS = 120_000;

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (e) {
    console.error('[API Request] Error reading token from SecureStore:', e);
  }

  // Amplía timeout automáticamente en multipart (audio/IA)
  const contentType = String(config.headers?.['Content-Type'] ?? '');
  if (
    contentType.includes('multipart/form-data') ||
    config.data instanceof FormData
  ) {
    config.timeout = config.timeout && config.timeout > MULTIPART_AI_TIMEOUT_MS
      ? config.timeout
      : MULTIPART_AI_TIMEOUT_MS;
  }

  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
  return config;
}, (error) => {
  console.error('[API Request Error]', error);
  return Promise.reject(error);
});

api.interceptors.response.use(
  (response) => {
    console.log(`[API Response] ${response.status} from ${response.config.url}`);
    return response;
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error(`[API Timeout] The server at ${error.config?.url} took too long to respond.`);
    } else if (!error.response) {
      console.error(`[API Network Error] Could not connect to ${error.config?.url}. Check if the server is running and accessible at ${error.config?.baseURL}`);
    } else {
      console.error(`[API Error] ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    return Promise.reject(error);
  }
);

export default api;
