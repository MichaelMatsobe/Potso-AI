/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_ACCESS_KEY?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Google Sign-In types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, any>) => void;
          renderButton: (element: HTMLElement, config: Record<string, any>) => void;
          prompt: (callback: (notification: any) => void) => void;
        };
      };
    };
  }
}

export {};
