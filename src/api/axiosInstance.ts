import axios from 'axios';
import { getAuthToken, redirectToLogin } from '@/lib/auth';

const baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const axiosInstance = axios.create({
  baseURL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour injecter automatiquement le token JWT si disponible
axiosInstance.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config.params || '');
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Intercepteur pour la gestion globale des réponses et erreurs
axiosInstance.interceptors.response.use(
  (response) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[API RESPONSE] ${response.status} ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    const status = error.response?.status;
    console.error('[API ERROR]', status, error.response?.data || error.message);
    // Session absente, expirée ou compte non autorisé : retour à la connexion
    // (les routes de connexion OTP ne déclenchent pas de redirection)
    const url: string = error.config?.url || '';
    if ((status === 401 || status === 403) && url.startsWith('/market-intelligence')) {
      redirectToLogin(status === 403 ? 'forbidden' : 'expired');
    }
    return Promise.reject(error);
  }
);