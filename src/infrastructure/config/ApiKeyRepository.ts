const STORAGE_KEY = 'perspective_lens_gemini_api_key';

export class ApiKeyRepository {
  public static getApiKey(): string {
    // 1. First check Vite environment variable (.env / .env.local)
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
      const envKey = import.meta.env.VITE_GEMINI_API_KEY.trim();
      if (envKey) return envKey;
    }

    // 2. Check browser localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedKey = localStorage.getItem(STORAGE_KEY);
      if (savedKey && savedKey.trim()) {
        return savedKey.trim();
      }
    }

    return '';
  }

  public static saveApiKey(apiKey: string): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (apiKey.trim()) {
        localStorage.setItem(STORAGE_KEY, apiKey.trim());
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }
}
