import React, { useState } from 'react';
import {
  User,
  Lock,
  Palette,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Check,
  AlertCircle,
  Loader2,
  X,
  Eye,
  EyeOff,
  Download,
  Upload,
  Trash2,
  HelpCircle,
  Database,
  Zap,
  Github,
  Mail,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '../types';
import { AuthService, PreferencesStorage } from '../services/authService';

interface SettingsProps {
  onClose: () => void;
  user?: any;
}

export const Settings = ({ onClose, user }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'notifications' | 'security' | 'data' | 'help' | 'advanced' | 'about'>('profile');
  const [preferences, setPreferences] = useState<UserPreferences>(
    PreferencesStorage.getPreferences() || DEFAULT_USER_PREFERENCES
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSavePreferences = async () => {
    try {
      setLoading(true);
      PreferencesStorage.setPreferences(preferences);
      if (user) {
        await AuthService.updatePreferences(preferences);
      }
      showNotification('success', 'Preferences saved successfully!');
    } catch (error) {
      showNotification('error', 'Failed to save preferences');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      showNotification('error', 'Display name cannot be empty');
      return;
    }

    try {
      setLoading(true);
      if (user) {
        await AuthService.updateProfile({ displayName });
      }
      showNotification('success', 'Profile updated successfully!');
    } catch (error) {
      showNotification('error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showNotification('error', 'All fields are required');
      return;
    }

    if (newPassword !== confirmPassword) {
      showNotification('error', 'New passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      showNotification('error', 'Password must be at least 8 characters');
      return;
    }

    try {
      setLoading(true);
      await AuthService.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      showNotification('success', 'Password changed successfully!');
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (confirm('Are you sure you want to logout?')) {
      try {
        await AuthService.logout();
        window.location.href = '/';
      } catch (error) {
        showNotification('error', 'Failed to logout');
      }
    }
  };

  const handleExportChats = () => {
    try {
      const chatsData = localStorage.getItem('potso_chats');
      if (!chatsData) {
        showNotification('error', 'No chats to export');
        return;
      }

      const dataStr = JSON.stringify(JSON.parse(chatsData), null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `potso-chats-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showNotification('success', 'Chats exported successfully!');
    } catch (error) {
      showNotification('error', 'Failed to export chats');
    }
  };

  const handleImportChats = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const chats = JSON.parse(content);
        if (!Array.isArray(chats)) {
          showNotification('error', 'Invalid chat file format');
          return;
        }
        localStorage.setItem('potso_chats', JSON.stringify(chats));
        showNotification('success', 'Chats imported successfully!');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        showNotification('error', 'Failed to import chats');
      }
    };
    reader.readAsText(file);
  };

  const handleClearChatHistory = () => {
    if (confirm('Are you sure you want to clear all chats? This action cannot be undone.')) {
      try {
        localStorage.removeItem('potso_chats');
        showNotification('success', 'Chat history cleared!');
        setTimeout(() => window.location.reload(), 1500);
      } catch (error) {
        showNotification('error', 'Failed to clear history');
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        setLoading(true);
        if (!currentPassword) {
          showNotification('error', 'Please enter your password to delete account');
          setLoading(false);
          return;
        }
        await AuthService.deleteAccount(currentPassword);
        showNotification('success', 'Account deleted successfully');
        setTimeout(() => window.location.href = '/', 2000);
      } catch (error: any) {
        showNotification('error', error.message || 'Failed to delete account');
      } finally {
        setLoading(false);
        setShowDeleteConfirm(false);
      }
    }
  };

  const getStorageUsage = () => {
    let total = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length;
      }
    }
    return (total / 1024).toFixed(2);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        className="bg-dark-bg border border-white/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-2xl font-bold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-all"
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Notification */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`mx-6 mt-4 p-3 rounded-lg flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {message.type === 'success' ? (
                <Check size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span className="text-sm">{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-48 border-r border-white/10 bg-gradient-to-b from-white/5 to-transparent p-4 space-y-2 overflow-y-auto">
            {[
              { id: 'profile', label: 'Profile', icon: User },
              { id: 'preferences', label: 'Preferences', icon: Palette },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'security', label: 'Security', icon: Lock },
              { id: 'data', label: 'Data & Privacy', icon: Database },
              { id: 'help', label: 'Help & Support', icon: HelpCircle },
              { id: 'advanced', label: 'Advanced', icon: Zap },
              { id: 'about', label: 'About', icon: Shield },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  activeTab === id
                    ? 'bg-primary/20 text-primary border border-primary/30'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={18} />
                <span className="text-sm font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Email Address</label>
                  <input
                    type="email"
                    value={user?.email || 'demo@potso.ai'}
                    disabled
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-gray-400"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your display name"
                    className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-dark-bg font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  Save Profile
                </button>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Theme</label>
                    <select
                      value={preferences.theme}
                      onChange={(e) => setPreferences({ ...preferences, theme: e.target.value as any })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="auto">Auto</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Font Size</label>
                    <select
                      value={preferences.fontSize}
                      onChange={(e) => setPreferences({ ...preferences, fontSize: e.target.value as any })}
                      className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none"
                    >
                      <option value="small">Small</option>
                      <option value="medium">Medium</option>
                      <option value="large">Large</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'notificationsEnabled', label: 'Enable Notifications' },
                    { key: 'soundEnabled', label: 'Sound Effects' },
                    { key: 'vibrationEnabled', label: 'Vibration' },
                    { key: 'messageGrouping', label: 'Group Messages' },
                    { key: 'codeHighlighting', label: 'Code Highlighting' },
                    { key: 'autoSave', label: 'Auto-Save Chats' },
                    { key: 'showTimestamps', label: 'Show Message Timestamps' },
                    { key: 'compactMode', label: 'Compact Mode' },
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(preferences as any)[key]}
                        onChange={(e) =>
                          setPreferences({ ...preferences, [key]: e.target.checked })
                        }
                        className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-primary"
                      />
                      <span className="text-sm text-gray-300">{label}</span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleSavePreferences}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-dark-bg font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  Save Preferences
                </button>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-bold mb-4">Notification Preferences</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.notificationsEnabled}
                        onChange={(e) =>
                          setPreferences({ ...preferences, notificationsEnabled: e.target.checked })
                        }
                        className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-primary"
                      />
                      <div>
                        <span className="text-sm text-white font-medium">Enable All Notifications</span>
                        <p className="text-xs text-gray-500">Master toggle for all notifications</p>
                      </div>
                    </label>

                    <div className="border-t border-white/10 pt-3 space-y-2">
                      {[
                        { label: 'Message Notifications', desc: 'When you receive new messages' },
                        { label: 'Agent Updates', desc: 'When agents complete reasoning' },
                        { label: 'System Alerts', desc: 'Important system notifications' },
                      ].map(({ label, desc }) => (
                        <label key={label} className="flex items-center gap-3 cursor-pointer opacity-70">
                          <input
                            type="checkbox"
                            disabled={!preferences.notificationsEnabled}
                            defaultChecked
                            className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-primary"
                          />
                          <div>
                            <span className="text-sm text-white font-medium">{label}</span>
                            <p className="text-xs text-gray-500">{desc}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Sound Volume</label>
                  <input type="range" min="0" max="100" defaultValue="70" className="w-full" />
                </div>

                <button
                  onClick={handleSavePreferences}
                  disabled={loading}
                  className="w-full bg-primary hover:bg-primary/90 disabled:opacity-50 text-dark-bg font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  Save Notification Settings
                </button>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {!showPasswordForm ? (
                  <button
                    onClick={() => setShowPasswordForm(true)}
                    className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-all"
                  >
                    <span className="text-white font-medium">Change Password</span>
                    <ChevronRight size={20} className="text-gray-400" />
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary pr-10"
                        />
                        <button
                          onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                          className="absolute right-3 top-3 text-gray-400 hover:text-white"
                        >
                          {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary pr-10"
                        />
                        <button
                          onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                          className="absolute right-3 top-3 text-gray-400 hover:text-white"
                        >
                          {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary pr-10"
                        />
                        <button
                          onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                          className="absolute right-3 top-3 text-gray-400 hover:text-white"
                        >
                          {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setShowPasswordForm(false);
                          setCurrentPassword('');
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-2 rounded-lg transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleChangePassword}
                        disabled={loading}
                        className="flex-1 bg-primary hover:bg-primary/90 disabled:opacity-50 text-dark-bg font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2"
                      >
                        {loading && <Loader2 size={18} className="animate-spin" />}
                        Update Password
                      </button>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-medium py-2 rounded-lg transition-all"
                >
                  <LogOut size={18} />
                  Logout
                </button>
              </div>
            )}

            {/* Data & Privacy Tab */}
            {activeTab === 'data' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-bold mb-4">Data Management</h3>
                  <div className="space-y-3">
                    <button
                      onClick={handleExportChats}
                      className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Download size={18} className="text-primary" />
                        <div className="text-left">
                          <span className="text-white font-medium block">Export Chats</span>
                          <p className="text-xs text-gray-500">Download all conversations as JSON</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </button>

                    <button
                      onClick={() => document.getElementById('import-input')?.click()}
                      className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Upload size={18} className="text-primary" />
                        <div className="text-left">
                          <span className="text-white font-medium block">Import Chats</span>
                          <p className="text-xs text-gray-500">Restore chats from a backup file</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </button>
                    <input id="import-input" type="file" accept=".json" onChange={handleImportChats} className="hidden" />

                    <button
                      onClick={handleClearChatHistory}
                      className="w-full flex items-center justify-between bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg p-4 transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 size={18} className="text-red-400" />
                        <div className="text-left">
                          <span className="text-red-300 font-medium block">Clear Chat History</span>
                          <p className="text-xs text-red-500/70">Delete all conversations</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-red-400" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-white font-bold mb-4">Privacy Settings</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-primary" />
                      <div>
                        <span className="text-sm text-white font-medium">Send Usage Analytics</span>
                        <p className="text-xs text-gray-500">Share anonymous usage data</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-primary" />
                      <div>
                        <span className="text-sm text-white font-medium">Marketing Communications</span>
                        <p className="text-xs text-gray-500">Receive product updates and news</p>
                      </div>
                    </label>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-white font-bold mb-4 text-red-300">Danger Zone</h3>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-300 font-medium py-2 rounded-lg transition-all"
                  >
                    <Trash2 size={18} />
                    Delete Account
                  </button>
                  {showDeleteConfirm && (
                    <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
                      <p className="text-red-200 text-sm mb-3">This action cannot be undone. All your data will be permanently deleted.</p>
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-white mb-2">Enter your password to confirm</label>
                        <div className="relative">
                          <input
                            type={showPasswords.current ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Your password"
                            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-primary pr-10"
                          />
                          <button
                            onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                            className="absolute right-3 top-3 text-gray-400 hover:text-white"
                          >
                            {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-2 rounded-lg transition-all">Cancel</button>
                        <button onClick={handleDeleteAccount} disabled={loading || !currentPassword} className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-2">
                          {loading && <Loader2 size={18} className="animate-spin" />}
                          Delete Permanently
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Help & Support Tab */}
            {activeTab === 'help' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-bold mb-4">Help & Support</h3>
                  <div className="space-y-3">
                    <a href="https://github.com/MichaelMatsobe/Potso-AI" target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-all group">
                      <div className="flex items-center gap-3">
                        <Github size={18} className="text-primary" />
                        <div className="text-left">
                          <span className="text-white font-medium block">GitHub Repository</span>
                          <p className="text-xs text-gray-500">View source code</p>
                        </div>
                      </div>
                      <ExternalLink size={18} className="text-gray-400 group-hover:text-primary" />
                    </a>

                    <a href="mailto:support@potso.ai" className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-all group">
                      <div className="flex items-center gap-3">
                        <Mail size={18} className="text-primary" />
                        <div className="text-left">
                          <span className="text-white font-medium block">Contact Support</span>
                          <p className="text-xs text-gray-500">Email us for help</p>
                        </div>
                      </div>
                      <ExternalLink size={18} className="text-gray-400 group-hover:text-primary" />
                    </a>

                    <button onClick={(e) => { e.preventDefault(); alert('Documentation coming soon!'); }} className="w-full flex items-center justify-between bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-4 transition-all">
                      <div className="flex items-center gap-3">
                        <BookOpen size={18} className="text-primary" />
                        <div className="text-left">
                          <span className="text-white font-medium block">Documentation</span>
                          <p className="text-xs text-gray-500">User guides and tutorials</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-gray-400" />
                    </button>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-white font-bold mb-4">FAQ</h3>
                  <div className="space-y-4 text-sm">
                    <div>
                      <p className="text-white font-medium mb-1">How do I export my chats?</p>
                      <p className="text-gray-400 text-xs">Go to Data & Privacy tab and click "Export Chats".</p>
                    </div>
                    <div>
                      <p className="text-white font-medium mb-1">Is my data secure?</p>
                      <p className="text-gray-400 text-xs">Chats are stored locally. Sync data is encrypted.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Tab */}
            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-bold mb-4">Advanced Settings</h3>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={debugMode} onChange={(e) => setDebugMode(e.target.checked)} className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-primary" />
                    <div>
                      <span className="text-sm text-white font-medium">Debug Mode</span>
                      <p className="text-xs text-gray-500">Enable detailed logging</p>
                    </div>
                  </label>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-white font-bold mb-4">System Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between bg-white/5 p-3 rounded-lg">
                      <span className="text-gray-400">OS</span>
                      <span className="text-white">{navigator.platform}</span>
                    </div>
                    <div className="flex justify-between bg-white/5 p-3 rounded-lg">
                      <span className="text-gray-400">Storage Used</span>
                      <span className="text-white">{getStorageUsage()} KB</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-6">
                  <h3 className="text-white font-bold mb-4">Performance</h3>
                  <label className="flex items-center gap-3 cursor-pointer mb-3">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-primary" />
                    <div>
                      <span className="text-sm text-white font-medium">Enable Animations</span>
                      <p className="text-xs text-gray-500">Smooth transitions</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 rounded bg-white/10 border border-white/20 accent-primary" />
                    <div>
                      <span className="text-sm text-white font-medium">Hardware Acceleration</span>
                      <p className="text-xs text-gray-500">Use GPU when available</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* About Tab */}
            {activeTab === 'about' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-white font-bold mb-2">Potso AI</h3>
                  <p className="text-gray-400 text-sm">Multi-agent reasoning powered by Google Gemini. Market-ready AI conversation system.</p>
                </div>

                <div className="space-y-2 bg-white/5 border border-white/10 rounded-lg p-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Version</span>
                    <span className="text-white font-medium">1.0.0</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                    <span className="text-gray-400">API Version</span>
                    <span className="text-white font-medium">v1</span>
                  </div>
                  <div className="flex justify-between border-t border-white/10 pt-2 mt-2">
                    <span className="text-gray-400">Created by</span>
                    <span className="text-white font-medium">Michael Aaron Matsobe</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <p className="text-xs text-gray-500 text-center">© 2026 Potso AI. All rights reserved. In partnership with Google.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
