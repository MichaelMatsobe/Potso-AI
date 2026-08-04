/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  BookOpen,
  Code,
  PenTool,
  Mic,
  ArrowUp,
  ArrowRight,
  Loader2,
  Settings,
  X,
  Cpu,
  Globe,
  Zap,
  Shield,
  Database,
  Activity,
  Menu,
  Plus,
  Trash2,
  MessageSquare,
  Clock,
  Layers,
  Users,
  Paperclip,
  File,
} from 'lucide-react';
import { AGENTS as DEFAULT_AGENTS, Message, AgentId, Agent, Chat, Artifact, Attachment } from './types';
import { getMultiAgentResponse, fetchHealth, type HealthStatus } from './services/aiClient';
import { LiveVoiceModal } from './components/LiveVoiceModal';
import { Settings as SettingsPanel } from './components/Settings';

const AVAILABLE_ICONS = {
  Search,
  BookOpen,
  Code,
  PenTool,
  Cpu,
  Globe,
  Zap,
  Shield,
  Database,
  Activity,
};

const GUEST_USER = {
  displayName: 'Guest',
  email: 'guest@local',
};

export default function App() {
  const [agents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('English');
  const [voiceAccent, setVoiceAccent] = useState('Zephyr');
  const [voiceSpeed, setVoiceSpeed] = useState('Normal');
  const [showLiveVoice, setShowLiveVoice] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      const h = await fetchHealth();
      if (!cancelled) setHealth(h);
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const aiOffline = health === null || health.aiOnline === false;

  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem('potso_chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse chats', e);
      }
    }
    return [
      {
        id: 'default',
        title: 'New Conversation',
        createdAt: Date.now(),
        messages: [] as Message[],
      },
    ];
  });

  const [currentChatId, setCurrentChatId] = useState<string>(chats[0]?.id || 'default');
  const currentChat = chats.find((c) => c.id === currentChatId) || chats[0];
  const messages = currentChat?.messages || [];

  useEffect(() => {
    try {
      localStorage.setItem('potso_chats', JSON.stringify(chats));
    } catch {
      try {
        const truncated = chats.slice(0, 10).map((chat) => ({
          ...chat,
          messages: chat.messages.slice(-20).map((msg) => ({ ...msg, attachments: undefined })),
        }));
        localStorage.setItem('potso_chats', JSON.stringify(truncated));
      } catch {
        /* ignore */
      }
    }
  }, [chats]);

  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isReasoning, setIsReasoning] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AgentId>('tshepo');
  const [contributingAgents, setContributingAgents] = useState<AgentId[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDictating, setIsDictating] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        setAttachments((prev) => [
          ...prev,
          { name: file.name, mimeType: file.type || 'application/octet-stream', data: base64String },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSpeechToText = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.onstart = () => setIsDictating(true);
    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
      }
      if (finalTranscript) setInput((prev) => prev + (prev ? ' ' : '') + finalTranscript);
    };
    recognition.onerror = () => setIsDictating(false);
    recognition.onend = () => setIsDictating(false);
    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isReasoning) return;
    const promptText = input;
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: promptText,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const updatedChats = chats.map((chat) => {
      if (chat.id === currentChatId) {
        const newMessages = [...chat.messages, userMsg];
        const newTitle =
          chat.messages.length === 0
            ? promptText.length > 30
              ? promptText.substring(0, 30) + '...'
              : promptText || 'Attachment'
            : chat.title;
        return { ...chat, messages: newMessages, title: newTitle || chat.title };
      }
      return chat;
    });

    setChats(updatedChats);
    const updatedMessages = updatedChats.find((c) => c.id === currentChatId)?.messages || [];
    setInput('');
    setAttachments([]);
    setIsReasoning(true);
    setContributingAgents(['modisa', 'tshepo', 'kgakgamatso', 'tlhaloganyo']);

    try {
      const response = await getMultiAgentResponse(promptText, updatedMessages);
      if (response.reasoning) {
        setContributingAgents(
          Array.from(new Set(response.reasoning.map((r) => r.agentId as AgentId)))
        );
      }
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.content || '',
        reasoning: response.reasoning,
        tags: response.tags,
        activeAgentId: response.activeAgentId || 'tshepo',
        imageUrl: response.imageUrl,
        artifacts: response.artifacts,
        consensusReached: response.consensusReached,
      };
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? { ...chat, messages: [...chat.messages, assistantMsg] }
            : chat
        )
      );
      if (response.activeAgentId) setActiveAgent(response.activeAgentId);
    } catch (err) {
      console.error(err);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    id: (Date.now() + 2).toString(),
                    role: 'assistant' as const,
                    content:
                      'Something went wrong talking to the AI backend. Is the API on :8080 and Ollama running?',
                    activeAgentId: 'tshepo' as AgentId,
                  },
                ],
              }
            : chat
        )
      );
    } finally {
      setIsReasoning(false);
      setTimeout(() => setContributingAgents([]), 3000);
    }
  };

  const clearChat = () => {
    setChats((prev) =>
      prev.map((chat) => (chat.id === currentChatId ? { ...chat, messages: [] } : chat))
    );
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now(),
    };
    setChats((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setIsSidebarOpen(false);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newChats = chats.filter((c) => c.id !== id);
    setChats(newChats);
    if (currentChatId === id) {
      if (newChats.length > 0) setCurrentChatId(newChats[0].id);
      else {
        const defaultChat: Chat = {
          id: 'default-' + Date.now(),
          title: 'New Conversation',
          messages: [],
          createdAt: Date.now(),
        };
        setChats([defaultChat]);
        setCurrentChatId(defaultChat.id);
      }
    }
  };

  const renderAgentIcon = (agent: Agent, isActive: boolean, isContributing: boolean) => {
    const IconComponent = (AVAILABLE_ICONS as any)[agent.icon];
    return (
      <motion.div
        animate={
          isActive
            ? { scale: [1, 1.05, 1], borderColor: ['#13c8ec', '#0a0a0a', '#13c8ec'] }
            : isContributing
              ? { opacity: [0.6, 1, 0.6], scale: [1, 1.02, 1] }
              : {}
        }
        transition={{ repeat: Infinity, duration: isActive ? 2 : 1.5, ease: 'easeInOut' }}
        className={`w-12 h-12 rounded-custom border flex items-center justify-center transition-all relative
          ${isActive ? 'agent-active bg-primary/10 border-primary' : isContributing ? 'border-primary/40 bg-primary/5 opacity-100' : 'border-white/10 bg-white/5 opacity-60'}`}
      >
        {IconComponent ? (
          <IconComponent
            className={`w-6 h-6 ${isActive || isContributing ? 'text-primary' : 'text-white'}`}
            strokeWidth={1.5}
          />
        ) : (
          <svg
            viewBox="0 0 24 24"
            className={`w-6 h-6 fill-none stroke-current ${isActive || isContributing ? 'text-primary' : 'text-white'}`}
            strokeWidth={1.5}
          >
            <path d={agent.icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-dark-bg" />
        )}
      </motion.div>
    );
  };

  return (
    <div className="h-screen flex overflow-hidden bg-dark-bg text-gray-100 font-sans">
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="fixed lg:relative inset-y-0 left-0 w-72 glass-panel border-r border-white/10 z-50 flex flex-col"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-primary rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-dark-bg" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">
                    Potso History
                  </span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="lg:hidden text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4">
                <button
                  onClick={createNewChat}
                  className="w-full flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/10 transition-all py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-primary"
                >
                  <Plus className="w-4 h-4" />
                  New Session
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    onClick={() => {
                      setCurrentChatId(chat.id);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                      ${currentChatId === chat.id ? 'bg-primary/10 border-primary/30' : 'border-transparent hover:bg-white/5'}`}
                  >
                    <MessageSquare
                      className={`w-4 h-4 ${currentChatId === chat.id ? 'text-primary' : 'text-gray-500'}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-xs truncate ${currentChatId === chat.id ? 'text-white font-medium' : 'text-gray-400'}`}
                      >
                        {chat.title}
                      </p>
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-2 h-2 text-gray-600" />
                        <span className="text-[8px] text-gray-600 uppercase">
                          {new Date(chat.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => deleteChat(e, chat.id)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    G
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold truncate">Guest</p>
                    <p className="text-[8px] text-gray-500 truncate">Local session</p>
                  </div>
                  <button type="button" onClick={() => setShowSettings(true)}>
                    <Settings className="w-3 h-3 text-gray-500 hover:text-primary" />
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="w-full pt-12 pb-4 px-6 glass-panel border-b border-white/10 z-20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-1 text-gray-500 hover:text-primary"
              >
                <Menu className="w-4 h-4" />
              </button>
              <h1 className="text-[10px] font-bold uppercase tracking-widest text-primary">
                Potso Cognition
              </h1>
              <div
                className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-wider ${
                  aiOffline
                    ? 'border-red-500/40 text-red-400 bg-red-500/10'
                    : 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10'
                }`}
                title={health?.aiProvider || 'checking...'}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${aiOffline ? 'bg-red-400' : 'bg-emerald-400'}`}
                />
                {aiOffline ? 'AI Offline' : `AI Online · ${health?.aiProvider || 'ollama'}`}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setDebugMode(!debugMode)}
                  className={`p-1 ${debugMode ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
                >
                  <Activity className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-1 text-gray-500 hover:text-primary"
                >
                  <Settings className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setShowVoiceSettings(true)}
                  className="p-1 text-gray-500 hover:text-primary"
                >
                  <Mic className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-400">REASONING</span>
              <div className="relative inline-flex items-center">
                <div
                  className={`w-7 h-4 rounded-full ${isReasoning ? 'bg-primary' : 'bg-gray-700'}`}
                >
                  <motion.div
                    animate={{ x: isReasoning ? 12 : 2 }}
                    className="absolute top-[2px] left-[2px] bg-white rounded-full h-3 w-3"
                  />
                </div>
              </div>
              {messages.length > 0 && (
                <>
                  <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/5 border border-primary/20">
                    <Database className="w-2 h-2 text-primary" />
                    <span className="text-[8px] font-bold text-primary uppercase">
                      Context ({messages.length})
                    </span>
                  </div>
                  <button onClick={clearChat} className="p-1 text-gray-500 hover:text-red-400">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-between items-center gap-3">
            {agents.map((agent) => {
              const isActive = activeAgent === agent.id;
              const isContributing =
                contributingAgents.includes(agent.id) ||
                (isReasoning && contributingAgents.length === 0);
              return (
                <div key={agent.id} className="flex flex-col items-center gap-1">
                  {renderAgentIcon(agent, isActive, isContributing)}
                  <span
                    className={`text-[10px] ${isActive ? 'text-primary font-bold' : isContributing ? 'text-primary/80' : 'text-gray-400'}`}
                  >
                    {agent.name}
                  </span>
                </div>
              );
            })}
          </div>
        </header>

        <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth">
          {messages.length === 0 && !isReasoning && (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-70 px-6">
              <Zap className="w-10 h-10 text-primary mb-4" />
              <p className="text-sm font-bold text-primary uppercase tracking-widest mb-2">
                Potso AI
              </p>
              <p className="text-xs text-gray-400 max-w-md">
                Multi-agent reasoning on open-source models. Ask anything — Modisa, Tshepo,
                Kgakgamatso and Tlhaloganyo collaborate on the answer.
              </p>
              {aiOffline && (
                <p className="text-xs text-red-400 mt-4 max-w-sm">
                  AI backend appears offline. Run <code className="text-primary">ollama serve</code>{' '}
                  and ensure the API is on port 8080.
                </p>
              )}
            </div>
          )}
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} group`}
              >
                {msg.role === 'user' ? (
                  <div className="max-w-[85%] flex flex-col items-end gap-2 relative">
                    {msg.content && (
                      <div className="p-4 rounded-custom glass-panel text-sm leading-relaxed">
                        {msg.content}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 w-full">
                    {msg.reasoning && msg.reasoning.length > 0 && (
                      <div className="ml-2 pl-4 border-l border-primary/30 py-2 space-y-3">
                        {msg.reasoning.map((step, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-[11px] text-gray-400 italic"
                          >
                            <span className="font-bold text-primary not-italic">
                              {agents.find((a) => a.id === step.agentId)?.name || step.agentId}:
                            </span>
                            <span>{step.thought}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="max-w-[90%] p-4 rounded-custom glass-panel border border-primary/20 text-sm leading-relaxed relative">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
                          {agents.find((a) => a.id === msg.activeAgentId)?.name ||
                            msg.activeAgentId ||
                            'Tshepo'}
                        </span>
                        {msg.consensusReached && (
                          <span className="flex items-center gap-1 text-[9px] text-emerald-400">
                            <Users className="w-2 h-2" /> Consensus
                          </span>
                        )}
                      </div>
                      <p className="text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                      {msg.artifacts && msg.artifacts.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase">
                            <Layers className="w-3 h-3" /> Workspace
                          </div>
                          {msg.artifacts.map((artifact: Artifact) => (
                            <div
                              key={artifact.id}
                              className="p-3 rounded-xl bg-white/5 border border-white/10"
                            >
                              <span className="text-[10px] font-bold text-primary">
                                {artifact.title}
                              </span>
                              <div className="text-[10px] text-gray-400 font-mono mt-1 line-clamp-3">
                                {artifact.content}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {msg.tags && msg.tags.length > 0 && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {msg.tags.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
            {isReasoning && (
              <div className="flex items-center gap-2 text-primary text-[10px] font-bold tracking-widest uppercase ml-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Cognitive synthesis in progress...
              </div>
            )}
          </AnimatePresence>
        </main>

        <footer className="p-4 pb-8 bg-gradient-to-t from-dark-bg via-dark-bg/90 to-transparent">
          <div className="max-w-4xl mx-auto relative">
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-2 rounded-xl bg-black/40 border border-white/10">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-xs relative group"
                  >
                    {att.mimeType.startsWith('image/') ? (
                      <img
                        src={`data:${att.mimeType};base64,${att.data}`}
                        alt={att.name}
                        className="w-8 h-8 object-cover rounded"
                      />
                    ) : (
                      <File className="w-4 h-4 text-primary" />
                    )}
                    <span className="truncate max-w-[100px]">{att.name}</span>
                    <button
                      onClick={() => removeAttachment(i)}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 p-1 pl-4 pr-1 rounded-full glass-panel border border-white/20">
              <input type="file" multiple ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder={aiOffline ? 'AI offline — start Ollama + API…' : 'Ask Potso...'}
                className="flex-1 bg-transparent border-none focus:outline-none text-sm py-3 text-gray-100 placeholder-gray-500"
              />
              <div className="flex items-center gap-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-gray-400 hover:text-primary"
                  title="Attach"
                >
                  <Paperclip className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <button
                  onClick={handleSpeechToText}
                  className={`p-2 ${isDictating ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-primary'}`}
                  title="Dictate"
                >
                  <Mic className="h-5 w-5" strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => setShowLiveVoice(true)}
                  className="p-2 px-4 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-full border border-primary/30"
                  title="Free browser voice (SpeechRecognition + Ollama/Freebuff + speechSynthesis)"
                >
                  Go Live
                </button>
                <button
                  onClick={handleSend}
                  disabled={isReasoning || (!input.trim() && attachments.length === 0)}
                  className="bg-primary text-dark-bg p-2.5 rounded-full hover:brightness-110 disabled:opacity-50"
                >
                  <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>

      <AnimatePresence>
        {showLiveVoice && (
          <LiveVoiceModal
            isOpen={showLiveVoice}
            onClose={() => setShowLiveVoice(false)}
            language={voiceLanguage}
            accent={voiceAccent}
            speakingSpeed={voiceSpeed}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVoiceSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              className="w-full max-w-md glass-panel rounded-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/10 flex justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">
                  Voice Settings
                </h2>
                <button onClick={() => setShowVoiceSettings(false)}>
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                <select
                  value={voiceLanguage}
                  onChange={(e) => setVoiceLanguage(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
                <select
                  value={voiceSpeed}
                  onChange={(e) => setVoiceSpeed(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  <option value="Slow">Slow</option>
                  <option value="Normal">Normal</option>
                  <option value="Fast">Fast</option>
                </select>
                <button
                  onClick={() => setShowVoiceSettings(false)}
                  className="w-full bg-primary text-dark-bg font-bold py-2 rounded-xl"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showSettings && (
          <SettingsPanel user={GUEST_USER} onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
