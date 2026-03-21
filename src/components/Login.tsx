import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, Loader2, Eye, EyeOff, AlertCircle, ArrowRight } from 'lucide-react';
import { AuthService } from '../services/authService';
import { useNotification } from './NotificationContext';
import { validateLoginForm } from '../utils/validation';

interface LoginProps {
  onSwitchToSignup: () => void;
  onLoginSuccess?: () => void;
}

export const Login = ({ onSwitchToSignup, onLoginSuccess }: LoginProps) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { showNotification } = useNotification();

  // Initialize Google Sign-In
  useEffect(() => {
    AuthService.initializeGoogle();
    
    // Initialize Google Sign-In button
    const clientId = AuthService.getGoogleClientId();
    if (clientId && (window as any).google) {
      try {
        (window as any).google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleSignIn,
        });
      } catch (error) {
        console.error('Failed to initialize Google Sign-In:', error);
      }
    }
  }, []);

  const handleGoogleSignIn = async (response: any) => {
    try {
      setLoading(true);
      setErrors({});
      
      if (response.credential) {
        await AuthService.signInWithGoogle(response.credential);
        showNotification('success', 'Login Successful', 'Redirecting to chat...');
        setTimeout(() => {
          onLoginSuccess?.();
        }, 1000);
      } else {
        throw new Error('No credential received from Google');
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in with Google';
      showNotification('error', 'Sign In Failed', errorMessage);
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateLoginForm(email, password);
    if (!validation.isValid) {
      setErrors(
        validation.errors.reduce((acc, err) => {
          acc[err.field!] = err.message;
          return acc;
        }, {} as Record<string, string>)
      );
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await AuthService.login(email, password);
      showNotification('success', 'Login Successful', 'Redirecting to chat...');
      setTimeout(() => {
        onLoginSuccess?.();
      }, 1000);
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to login. Please try again.';
      showNotification('error', 'Login Failed', errorMessage);
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-primary/20 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <span className="text-2xl font-bold text-white">PA</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Potso AI</h1>
          <p className="text-gray-400">Multi-Agent AI Reasoning System</p>
        </div>

        {/* Login Form */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6">
          <h2 className="text-2xl font-bold text-white">Welcome Back</h2>

          {errors.general && (
            <div className="flex items-center gap-2 bg-red-500/20 border border-red-500/30 rounded-lg p-3">
              <AlertCircle size={18} className="text-red-400" />
              <p className="text-sm text-red-300">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors({ ...errors, email: '' });
                  }}
                  placeholder="you@example.com"
                  className={`w-full bg-white/10 border rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                    errors.email ? 'border-red-500/50 focus:border-red-500' : 'border-white/20 focus:border-primary'
                  }`}
                />
              </div>
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors({ ...errors, password: '' });
                  }}
                  placeholder="••••••••"
                  className={`w-full bg-white/10 border rounded-lg pl-10 pr-10 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                    errors.password ? 'border-red-500/50 focus:border-red-500' : 'border-white/20 focus:border-primary'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-gray-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90 disabled:opacity-50 text-dark-bg font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white/5 text-gray-400">or</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          {AuthService.getGoogleClientId() && (
            <div
              id="google-signin-button"
              className="flex justify-center"
              onClick={(e) => {
                if ((window as any).google) {
                  (window as any).google.accounts.id.renderButton(
                    document.getElementById('google-signin-button'),
                    {
                      type: 'standard',
                      size: 'large',
                      text: 'signin_with',
                      theme: 'dark'
                    }
                  );
                }
              }}
            >
              <button
                onClick={() => {
                  if ((window as any).google) {
                    (window as any).google.accounts.id.prompt((notification: any) => {
                      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                        // Fallback: user dismissed the prompt
                      }
                    });
                  }
                }}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 text-white font-medium py-3 rounded-lg transition-all flex items-center justify-center gap-3"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Sign in with Google
              </button>
            </div>
          )}

          {/* Switch to Signup */}
          <p className="text-center text-gray-400 text-sm">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToSignup}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Sign up
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-500 mt-8">
          © 2026 Potso AI. All rights reserved.
        </p>
      </motion.div>
    </motion.div>
  );
};
