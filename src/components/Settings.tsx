import React, { useState } from 'react';
import {
  User, Lock, Palette, Bell, Shield, LogOut, ChevronRight, Check, AlertCircle,
  Loader2, X, Eye, EyeOff, Download, Upload, Trash2, HelpCircle, Database, Zap,
  Github, Mail, ExternalLink, BookOpen,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPreferences, DEFAULT_USER_PREFERENCES } from '../types';
import { AuthService, PreferencesStorage } from '../services/authService';

interface SettingsProps {
  onClose: () => void;
  user?: any;
}

export const Settings = ({ onClose, user }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'data' | 'about' | 'help'>('about');
  const [preferences, setPreferences] = useState<UserPreferences>(
    PreferencesStorage.getPreferences() || DEFAULT_USER_PREFERENCES
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [displayName, setDisplayName] = useState(user?.displayName || 'Guest');

  const showNotification = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExportChats = () => {
    try {
      const chatsData = localStorage.getItem('potso_chats');
      if (!chatsData) {
        showNotification('error', 'No chats to export');
        return;
      }
      const dataBlob = new Blob([JSON.stringify(JSON.parse(chatsData), null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `potso-chats-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showNotification('success', 'Chats exported');
    } catch {
      showNotification('error', 'Export failed');
    }
  };

  const handleClearChatHistory = () => {
    if (!confirm('Clear all local chats?')) return;
    localStorage.removeItem('potso_chats');
    Object.keys(localStorage)
      .filter((k) => k.startsWith('potso'))
      .forEach((k) => localStorage.removeItem(k));
    showNotification('success', 'Local data cleared');
    setTimeout(() => window.location.reload(), 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <motion.div
        className="bg-dark-bg border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X size={20} className="text-white" />
          </button>
        </div>

        {message && (
          <div
            className={`mx-4 mt-3 p-2 rounded-lg text-sm ${
              message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'
            }`}
          >
            {message.text}
          </div>
        )}

        <div className="flex gap-2 p-3 border-b border-white/10 flex-wrap">
          {(['about', 'data', 'profile', 'help'] as const).map((id) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize ${
                activeTab === id ? 'bg-primary/20 text-primary' : 'text-gray-400 hover:text-white'
              }`}
            >
              {id}
            </button>
          ))}
        </div>

        <div className="p-4 overflow-y-auto space-y-4 text-sm">
          {activeTab === 'about' && (
            <>
              <h3 className="text-white font-bold">Potso AI</h3>
              <p className="text-gray-400">
                Multi-agent reasoning on open-source models (Ollama by default). Free stack — no paid AI
                APIs required.
              </p>
              <div className="bg-white/5 border border-white/10 rounded-lg p-3 space-y-2">
                <div className="flex justify-between"><span className="text-gray-400">Version</span><span className="text-white">1.3.1</span></div>
                <div className="flex justify-between"><span className="text-gray-400">Author</span><span className="text-white">Michael Aaron Matsobe</span></div>
                <div className="flex justify-between"><span className="text-gray-400">License</span><span className="text-white">Apache-2.0</span></div>
              </div>
              <div className="flex flex-col gap-2">
                <a href="/privacy.html" className="text-primary hover:underline">Privacy</a>
                <a href="/terms.html" className="text-primary hover:underline">Terms</a>
                <a href="/dsar.html" className="text-primary hover:underline">Data request (DSAR)</a>
              </div>
            </>
          )}

          {activeTab === 'data' && (
            <>
              <h3 className="text-white font-bold">Data & privacy</h3>
              <button onClick={handleExportChats} className="w-full flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-3 text-left text-white">
                <Download size={16} className="text-primary" /> Export local chats
              </button>
              <button onClick={handleClearChatHistory} className="w-full flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-left text-red-300">
                <Trash2 size={16} /> Clear local guest data
              </button>
              <a href="/dsar.html" className="block text-primary hover:underline">Submit server DSAR</a>
              <a href="/privacy.html" className="block text-primary hover:underline">Privacy notice</a>
            </>
          )}

          {activeTab === 'profile' && (
            <>
              <label className="block text-gray-400 text-xs mb-1">Display name (local)</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white"
              />
              <p className="text-xs text-gray-500">Guest mode — Firebase login optional when configured.</p>
              <p className="text-xs text-gray-500">Email: {user?.email || 'guest@local'}</p>
            </>
          )}

          {activeTab === 'help' && (
            <>
              <a href="https://github.com/MichaelMatsobe/Potso-AI" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary">
                <Github size={16} /> GitHub repository
              </a>
              <p className="text-gray-400 text-xs">Docs: README, docs/PROCEDURES.md, docs/IDE_SETUP.md</p>
              <p className="text-gray-400 text-xs">Admin: /admin.html (API key required)</p>
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
