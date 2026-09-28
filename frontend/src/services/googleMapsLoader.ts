/**
 * Google Maps JavaScript API Dynamic Loader
 * Handles API key resolution from localStorage or environment variables,
 * asynchronous script injection, authentication error interceptors, and reactive key updates.
 */

import { GOOGLE_MAPS_API_KEY } from '../config/mapsKey';

const STORAGE_KEY = 'medicus_google_maps_api_key';
const KEY_CHANGE_EVENT = 'medicus_google_maps_key_changed';

declare global {
  interface Window {
    google?: any;
    gm_authFailure?: () => void;
  }
}

let loadPromise: Promise<any> | null = null;
let currentLoadedKey: string | null = null;

export const getGoogleMapsApiKey = (): string => {
  if (typeof window === 'undefined') return '';
  // 1. In-code configuration file (strictly excluded by .gitignore)
  if (GOOGLE_MAPS_API_KEY && GOOGLE_MAPS_API_KEY.trim()) {
    return GOOGLE_MAPS_API_KEY.trim();
  }
  // 2. Vite environment variable from .env (strictly excluded by .gitignore)
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  if (envKey && typeof envKey === 'string' && envKey.trim()) {
    return envKey.trim();
  }
  // 3. Local browser cache fallback
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored.trim()) return stored.trim();
  return '';
};

export const setGoogleMapsApiKey = (apiKey: string) => {
  if (typeof window === 'undefined') return;
  const trimmed = apiKey.trim();
  if (trimmed) {
    localStorage.setItem(STORAGE_KEY, trimmed);
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
  // Clear cached promise if key changed
  if (currentLoadedKey !== trimmed) {
    loadPromise = null;
    currentLoadedKey = null;
  }
  window.dispatchEvent(new CustomEvent(KEY_CHANGE_EVENT, { detail: { apiKey: trimmed } }));
};

export const subscribeToKeyChanges = (callback: (apiKey: string) => void): (() => void) => {
  const handler = (e: Event) => {
    const custom = e as CustomEvent;
    callback(custom.detail?.apiKey || '');
  };
  window.addEventListener(KEY_CHANGE_EVENT, handler);
  return () => window.removeEventListener(KEY_CHANGE_EVENT, handler);
};

export interface GoogleMapsLoadResult {
  google: any;
  error?: string;
}

export const loadGoogleMaps = async (customKey?: string): Promise<any> => {
  if (typeof window === 'undefined') {
    throw new Error('Google Maps can only be loaded in a browser environment');
  }

  const apiKey = (customKey !== undefined ? customKey : getGoogleMapsApiKey()).trim();

  if (!apiKey) {
    throw new Error('MISSING_API_KEY');
  }

  if (window.google?.maps && currentLoadedKey === apiKey) {
    return window.google.maps;
  }

  if (loadPromise && currentLoadedKey === apiKey) {
    return loadPromise;
  }

  currentLoadedKey = apiKey;

  loadPromise = new Promise((resolve, reject) => {
    // Intercept Google Maps Auth Failure callback
    (window as any).gm_authFailure = () => {
      const authErr = new Error('GOOGLE_MAPS_AUTH_FAILURE');
      console.warn('Google Maps API authentication failed: verify your API key and enabled APIs.');
      reject(authErr);
    };

    // Check if script element already exists
    const existingScript = document.getElementById('google-maps-script') as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.type = 'text/javascript';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places,geometry,marker&loading=async`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      const startedAt = Date.now();
      const resolveWhenReady = () => {
        if (window.google?.maps) {
          resolve(window.google.maps);
          return;
        }

        if (Date.now() - startedAt >= 10000) {
          reject(new Error('Google Maps SDK object not found after script execution'));
          return;
        }

        window.setTimeout(resolveWhenReady, 50);
      };

      resolveWhenReady();
    };

    script.onerror = () => {
      reject(new Error('NETWORK_LOAD_ERROR'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
};
