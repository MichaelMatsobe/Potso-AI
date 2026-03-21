import { User, DEFAULT_USER_PREFERENCES } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

// ==================== GOOGLE OAUTH SETUP ====================
let googleAuthInitialized = false;

const initializeGoogleAuth = () => {
  if (googleAuthInitialized) return;
  
  // Load Google Script if not already loaded
  if (!(window as any).google) {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
  
  googleAuthInitialized = true;
};

// Get Google Client ID from environment
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

// ==================== AUTH SERVICE ====================
export class AuthService {
  // Store token in localStorage
  static setToken(token: string) {
    localStorage.setItem('authToken', token);
  }

  static getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  static clearToken() {
    localStorage.removeItem('authToken');
  }

  static isAuthenticated(): boolean {
    return !!this.getToken();
  }

  // ==================== ASYNC OPERATIONS ====================
  static async signup(
    email: string,
    password: string,
    displayName: string
  ): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Signup failed');
      }

      const data = await response.json();
      this.setToken(data.token);
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  }

  static async login(email: string, password: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      this.setToken(data.token);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  static async logout(): Promise<void> {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
        },
      });
    } finally {
      this.clearToken();
    }
  }

  // ==================== GOOGLE OAUTH ====================
  static async signInWithGoogle(idToken: string): Promise<void> {
    try {
      const response = await fetch(`${API_URL}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Google sign-in failed');
      }

      const data = await response.json();
      this.setToken(data.token);
    } catch (error) {
      console.error('Google sign-in error:', error);
      throw error;
    }
  }

  static initializeGoogle() {
    initializeGoogleAuth();
  }

  static getGoogleClientId(): string {
    return GOOGLE_CLIENT_ID;
  }

  static async getProfile(): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/auth/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch profile');
    }

    return response.json();
  }

  static async updateProfile(updates: Partial<User>): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      throw new Error('Failed to update profile');
    }

    return response.json();
  }

  static async updatePreferences(preferences: any): Promise<User> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/auth/preferences`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ preferences }),
    });

    if (!response.ok) {
      throw new Error('Failed to update preferences');
    }

    return response.json();
  }

  static async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword: oldPassword, newPassword }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to change password');
    }
  }

  static async resetPassword(email: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/reset-password-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error('Failed to request password reset');
    }
  }

  static async verifyEmail(token: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/verify-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error('Failed to verify email');
    }
  }

  static async deleteAccount(password: string): Promise<void> {
    const token = this.getToken();
    if (!token) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_URL}/auth/delete-account`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ password }),
    });

    if (!response.ok) {
      throw new Error('Failed to delete account');
    }

    this.clearToken();
  }
}

// ==================== LOCAL STORAGE ====================
export const PreferencesStorage = {
  getPreferences: () => {
    const stored = localStorage.getItem('userPreferences');
    return stored ? JSON.parse(stored) : DEFAULT_USER_PREFERENCES;
  },

  setPreferences: (prefs: any) => {
    localStorage.setItem('userPreferences', JSON.stringify(prefs));
  },

  clearPreferences: () => {
    localStorage.removeItem('userPreferences');
  },
};
