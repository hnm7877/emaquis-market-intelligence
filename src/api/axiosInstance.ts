import axios from 'axios';
import { redirectToLogin } from '@/lib/auth';

// Toujours le domaine du site : /api-proxy est relayé vers l'API par le serveur Next
// (next.config.ts) — l'adresse de l'API n'apparaît ni dans le code ni dans les requêtes.
const baseURL = '/api-proxy';

export const axiosInstance = axios.create({
  baseURL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Le jeton est ajouté par le serveur du site (cookie httpOnly) : rien à injecter ici
axiosInstance.interceptors.request.use(
  (config) => {
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
    if (process.env.NODE_ENV !== 'production') {
      console.error('[API ERROR]', status, error.response?.data || error.message);
    }
    // Session absente, expirée ou compte non autorisé : retour à la connexion
    // (les routes de connexion OTP ne déclenchent pas de redirection)
    const url: string = error.config?.url || '';
    if ((status === 401 || status === 403) && url.startsWith('/market-intelligence')) {
      redirectToLogin(status === 403 ? 'forbidden' : 'expired');
    }
    return Promise.reject(error);
  }
);