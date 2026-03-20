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
  Camera, 
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
  Check,
  Menu,
  Plus,
  Trash2,
  MessageSquare,
  Clock,
  Share2,
  Layers,
  Users,
  Paperclip,
  File,
  Copy
} from 'lucide-react';
import { AGENTS as DEFAULT_AGENTS, Message, AgentId, Agent, Chat, Artifact, Attachment } from './types';
import { getMultiAgentResponse } from './services/geminiService';

import { LiveVoiceModal } from './components/LiveVoiceModal';

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
  Activity
};

export default function App() {
  const [agents, setAgents] = useState<Agent[]>(DEFAULT_AGENTS);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [voiceLanguage, setVoiceLanguage] = useState('English');
  const [voiceAccent, setVoiceAccent] = useState('Zephyr');
  const [voiceSpeed, setVoiceSpeed] = useState('Normal');
  const [showLiveVoice, setShowLiveVoice] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [customPath, setCustomPath] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [debugMode, setDebugMode] = useState(false);

  const [chats, setChats] = useState<Chat[]>(() => {
    const saved = localStorage.getItem('potso_chats');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse chats", e);
      }
    }
    return [{
      id: 'default',
      title: 'Quantum Supremacy Analysis',
      createdAt: Date.now(),
      messages: [
        {
          id: '1',
          role: 'user',
          content: 'Analyze the long-term impact of quantum supremacy on blockchain encryption. Use multiple perspectives.'
        },
        {
          id: '2',
          role: 'assistant',
          content: "Based on current trajectories, quantum computers using Shor's algorithm will render current RSA and ECC encryption obsolete. However, the transition to Lattice-based cryptography is already being integrated into Layer 1 protocols...",
          reasoning: [
            { agentId: 'kgakgamatso', thought: 'Initiating cryptographic audit... ECDSA vulnerabilities at 5000+ stable qubits.' },
            { agentId: 'tshepo', thought: 'Cross-referencing latest NIST post-quantum standard papers (2024 update).' },
            { agentId: 'tlhaloganyo', thought: 'Synthesizing structural narrative for readability.' }
          ],
          tags: ['Research Hub', 'Encryption'],
          activeAgentId: 'tshepo'
        }
      ]
    }];
  });

  const [currentChatId, setCurrentChatId] = useState<string>(chats[0]?.id || 'default');

  const currentChat = chats.find(c => c.id === currentChatId) || chats[0];
  const messages = currentChat?.messages || [];

  useEffect(() => {
    try {
      localStorage.setItem('potso_chats', JSON.stringify(chats));
    } catch (e) {
      console.error("Failed to save chats to localStorage, quota exceeded", e);
      try {
        // Fallback: keep only the last 10 chats, and last 20 messages per chat, without attachments
        const truncatedChats = chats.slice(0, 10).map(chat => ({
          ...chat,
          messages: chat.messages.slice(-20).map(msg => ({
            ...msg,
            attachments: undefined
          }))
        }));
        localStorage.setItem('potso_chats', JSON.stringify(truncatedChats));
      } catch (innerError) {
        console.error("Even truncated chats failed to save", innerError);
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
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64String = (event.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, {
          name: file.name,
          mimeType: file.type || 'application/octet-stream',
          data: base64String
        }]);
      };
      reader.readAsDataURL(file);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSpeechToText = () => {
    if (isDictating) {
      recognitionRef.current?.stop();
      setIsDictating(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = voiceLanguage === 'English' ? 'en-US' : 'en-US'; // Can map languages if needed

    recognition.onstart = () => {
      setIsDictating(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }

      if (finalTranscript) {
        setInput(prev => prev + (prev ? ' ' : '') + finalTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsDictating(false);
    };

    recognition.onend = () => {
      setIsDictating(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const handleSend = async () => {
    if (!input.trim() && attachments.length === 0) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      attachments: attachments.length > 0 ? attachments : undefined
    };

    // Update title if it's the first message
    let updatedChats = chats.map(chat => {
      if (chat.id === currentChatId) {
        const newMessages = [...chat.messages, userMsg];
        const newTitle = chat.messages.length === 0 ? (input.length > 30 ? input.substring(0, 30) + '...' : input) : chat.title;
        return { ...chat, messages: newMessages, title: newTitle };
      }
      return chat;
    });
    
    setChats(updatedChats);
    
    const updatedMessages = updatedChats.find(c => c.id === currentChatId)?.messages || [];

    setInput('');
    setAttachments([]);
    setIsReasoning(true);
    setContributingAgents(['modisa', 'tshepo', 'kgakgamatso', 'tlhaloganyo']);

    const response = await getMultiAgentResponse(input, updatedMessages);
    
    if (response.reasoning) {
      const actualContributors = Array.from(new Set(response.reasoning.map(r => r.agentId as AgentId)));
      setContributingAgents(actualContributors);
    }

    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.content || '',
      reasoning: response.reasoning,
      tags: response.tags,
      activeAgentId: response.activeAgentId || 'tshepo',
      isFormulating: false,
      imageUrl: response.imageUrl,
      artifacts: response.artifacts,
      consensusReached: response.consensusReached
    };

    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return { ...chat, messages: [...chat.messages, assistantMsg] };
      }
      return chat;
    }));

    setIsReasoning(false);
    if (response.activeAgentId) setActiveAgent(response.activeAgentId);
    
    setTimeout(() => {
      setContributingAgents([]);
    }, 3000);
  };

  const clearChat = () => {
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return { ...chat, messages: [] };
      }
      return chat;
    }));
  };

  const deleteMessage = (messageId: string) => {
    setChats(prev => prev.map(chat => {
      if (chat.id === currentChatId) {
        return { ...chat, messages: chat.messages.filter(m => m.id !== messageId) };
      }
      return chat;
    }));
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: 'New Conversation',
      messages: [],
      createdAt: Date.now()
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setIsSidebarOpen(false);
  };

  const deleteChat = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newChats = chats.filter(c => c.id !== id);
    setChats(newChats);
    if (currentChatId === id) {
      if (newChats.length > 0) {
        setCurrentChatId(newChats[0].id);
      } else {
        const defaultChat: Chat = {
          id: 'default-' + Date.now(),
          title: 'New Conversation',
          messages: [],
          createdAt: Date.now()
        };
        setChats([defaultChat]);
        setCurrentChatId(defaultChat.id);
      }
    }
  };

  const handleUpdateAgentIcon = (id: AgentId, iconName: string, isPath = false) => {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, icon: iconName } : a));
  };

  const renderAgentIcon = (agent: Agent, isActive: boolean, isContributing: boolean) => {
    const isPath = agent.icon.startsWith('M') || agent.icon.includes(' ');
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
        transition={{ 
          repeat: Infinity, 
          duration: isActive ? 2 : 1.5,
          ease: "easeInOut"
        }}
        className={`w-12 h-12 rounded-custom border flex items-center justify-center transition-all relative
          ${isActive ? 'agent-active bg-primary/10 border-primary' : 
            isContributing ? 'border-primary/40 bg-primary/5 opacity-100' : 
            'border-white/10 bg-white/5 opacity-60'}`}
      >
        {IconComponent ? (
          <IconComponent className={`w-6 h-6 ${isActive || isContributing ? 'text-primary' : 'text-white'}`} strokeWidth={1.5} />
        ) : (
          <svg viewBox="0 0 24 24" className={`w-6 h-6 fill-none stroke-current ${isActive || isContributing ? 'text-primary' : 'text-white'}`} strokeWidth={1.5}>
            <path d={agent.icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        
        {/* Contribution Pulse Ring */}
        {isContributing && !isActive && (
          <motion.div 
            initial={{ scale: 0.8, opacity: 0.5 }}
            animate={{ scale: 1.2, opacity: 0 }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="absolute inset-0 border border-primary rounded-custom"
          />
        )}

        {isActive && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-dark-bg" />
        )}
      </motion.div>
    );
  };

  return (
    <div className="h-screen flex overflow-hidden bg-dark-bg text-gray-100 font-sans">
      {/* Sidebar */}
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
                  <span className="text-xs font-bold uppercase tracking-widest text-primary">Potso History</span>
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
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
                {chats.map(chat => (
                  <div 
                    key={chat.id}
                    onClick={() => {
                      setCurrentChatId(chat.id);
                      if (window.innerWidth < 1024) setIsSidebarOpen(false);
                    }}
                    className={`group flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all border
                      ${currentChatId === chat.id ? 'bg-primary/10 border-primary/30' : 'border-transparent hover:bg-white/5'}`}
                  >
                    <MessageSquare className={`w-4 h-4 ${currentChatId === chat.id ? 'text-primary' : 'text-gray-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs truncate ${currentChatId === chat.id ? 'text-white font-medium' : 'text-gray-400'}`}>
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
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-white/10">
                <div className="flex items-center gap-3 p-2 rounded-xl bg-white/5 border border-white/10">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                    MA
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold truncate">Michael Aaron</p>
                    <p className="text-[8px] text-gray-500 truncate">Pro Researcher</p>
                  </div>
                  <Settings className="w-3 h-3 text-gray-500 cursor-pointer hover:text-primary" />
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="w-full pt-12 pb-4 px-6 glass-panel border-b border-white/10 z-20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-1 text-gray-500 hover:text-primary transition-colors"
              >
                <Menu className="w-4 h-4" />
              </button>
              <h1 className="text-[10px] font-bold uppercase tracking-widest text-primary">Potso Cognition</h1>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setDebugMode(!debugMode)}
                  className={`p-1 transition-colors ${debugMode ? 'text-primary' : 'text-gray-500 hover:text-primary'}`}
                  title="Toggle Debug Mode"
                >
                  <Activity className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => setShowSettings(true)}
                  className="p-1 text-gray-500 hover:text-primary transition-colors"
                  title="Agent Customization"
                >
                  <Settings className="w-3 h-3" />
                </button>
                <button 
                  onClick={() => setShowVoiceSettings(true)}
                  className="p-1 text-gray-500 hover:text-primary transition-colors"
                  title="Voice Settings"
                >
                  <Mic className="w-3 h-3" />
                </button>
              </div>
            </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-gray-400">REASONING</span>
            <div className="relative inline-flex items-center cursor-pointer">
              <div className={`w-7 h-4 rounded-full transition-colors ${isReasoning ? 'bg-primary' : 'bg-gray-700'}`}>
                <motion.div 
                  animate={{ x: isReasoning ? 12 : 2 }}
                  className="absolute top-[2px] left-[2px] bg-white rounded-full h-3 w-3"
                />
              </div>
            </div>
          </div>
          {messages.length > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/5 border border-primary/20">
                <Database className="w-2 h-2 text-primary" />
                <span className="text-[8px] font-bold text-primary uppercase tracking-tighter">Context Active ({messages.length})</span>
              </div>
              <button 
                onClick={clearChat}
                className="p-1 text-gray-500 hover:text-red-400 transition-colors"
                title="Clear Chat"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        <div className="flex justify-between items-center gap-3">
          {agents.map((agent) => {
            const isActive = activeAgent === agent.id;
            const isContributing = contributingAgents.includes(agent.id) || (isReasoning && contributingAgents.length === 0);
            
            return (
              <div key={agent.id} className="flex flex-col items-center gap-1">
                {renderAgentIcon(agent, isActive, isContributing)}
                <span className={`text-[10px] transition-colors ${isActive ? 'text-primary font-bold' : isContributing ? 'text-primary/80' : 'text-gray-400'}`}>
                  {agent.name}
                </span>
              </div>
            );
          })}
        </div>
      </header>

      {/* Chat Area */}
      <main ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scroll-smooth">
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
                  <div className="absolute -left-24 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <button onClick={() => setInput(msg.content)} className="p-1.5 text-gray-500 hover:text-primary bg-dark-bg rounded-md border border-white/10" title="Use Prompt">
                      <PenTool className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => copyMessage(msg.content)} className="p-1.5 text-gray-500 hover:text-primary bg-dark-bg rounded-md border border-white/10" title="Copy">
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteMessage(msg.id)} className="p-1.5 text-gray-500 hover:text-red-400 bg-dark-bg rounded-md border border-white/10" title="Delete">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {msg.attachments.map((att, i) => (
                        <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-xs">
                          {att.mimeType.startsWith('image/') ? (
                            <img src={`data:${att.mimeType};base64,${att.data}`} alt={att.name} className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <File className="w-4 h-4 text-primary" />
                          )}
                          <span className="truncate max-w-[150px]">{att.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {msg.content && (
                    <div className="p-4 rounded-custom glass-panel text-sm leading-relaxed">
                      {msg.content}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4 w-full">
                  {/* Reasoning Chain */}
                  {msg.reasoning && (
                    <div className="ml-2 pl-4 border-l border-primary/30 py-2 space-y-3">
                      {msg.reasoning.map((step, idx) => (
                        <motion.div 
                          key={idx}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="flex items-start gap-2 text-[11px] text-gray-400 italic"
                        >
                          <span className="font-bold text-primary not-italic flex items-center gap-1.5">
                            {agents.find(a => a.id === step.agentId)?.name || step.agentId}
                            {step.delegatedTo && (
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-[8px] text-amber-500 font-bold uppercase tracking-tighter">
                                <Share2 className="w-2 h-2" />
                                Delegator
                              </div>
                            )}
                            :
                          </span>
                          <span>{step.thought}</span>
                          {step.delegatedTo && (
                            <div className="flex flex-col gap-1 ml-2">
                              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 text-[9px] text-primary font-bold uppercase tracking-tighter">
                                <ArrowRight className="w-2 h-2" />
                                Delegating to {agents.find(a => a.id === step.delegatedTo)?.name || step.delegatedTo}
                              </div>
                              {step.action && (
                                <div className="text-[8px] text-gray-500 font-medium pl-3 border-l border-primary/20 italic">
                                  Task: {step.action}
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Main Response */}
                  <div className="max-w-[90%] p-4 rounded-custom glass-panel glow-border border-primary/20 text-sm leading-relaxed relative group/msg">
                    <div className="absolute -right-16 top-2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-1">
                      <button onClick={() => copyMessage(msg.content)} className="p-1.5 text-gray-500 hover:text-primary bg-dark-bg rounded-md border border-white/10" title="Copy">
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMessage(msg.id)} className="p-1.5 text-gray-500 hover:text-red-400 bg-dark-bg rounded-md border border-white/10" title="Delete">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <motion.div 
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ repeat: Infinity, duration: 1.5 }}
                          className="w-2 h-2 bg-primary rounded-full" 
                        />
                        <span className="text-[10px] font-bold tracking-widest text-primary uppercase">
                          {agents.find(a => a.id === msg.activeAgentId)?.name || msg.activeAgentId || 'Tshepo'} is formulating
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {msg.consensusReached && (
                          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
                            <Users className="w-2 h-2" />
                            Consensus Reached
                          </div>
                        )}
                        {debugMode && (
                          <div className="px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/30 text-[8px] font-bold text-yellow-500 uppercase tracking-tighter">
                            Trace ID: {msg.id}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-200">{msg.content}</p>

                    {/* Debug Trace Panel */}
                    {debugMode && msg.role === 'assistant' && (
                      <div className="mt-4 p-3 rounded-lg bg-black/40 border border-yellow-500/20 font-mono text-[10px] text-yellow-500/70 overflow-x-auto">
                        <div className="flex items-center gap-2 mb-2 text-yellow-500 font-bold uppercase tracking-widest border-b border-yellow-500/10 pb-1">
                          <Activity className="w-3 h-3" />
                          Cognitive Trace
                        </div>
                        <pre className="whitespace-pre-wrap">
                          {JSON.stringify({
                            agent: msg.activeAgentId,
                            reasoningSteps: msg.reasoning?.length,
                            artifacts: msg.artifacts?.length,
                            consensus: msg.consensusReached,
                            tags: msg.tags
                          }, null, 2)}
                        </pre>
                      </div>
                    )}
                    
                    {/* Shared Workspace / Artifacts */}
                    {msg.artifacts && msg.artifacts.length > 0 && (
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          <Layers className="w-3 h-3" />
                          Shared Workspace
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {msg.artifacts.map((artifact: Artifact) => (
                            <div key={artifact.id} className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-all group cursor-pointer">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold text-primary truncate pr-2">{artifact.title}</span>
                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 uppercase">{artifact.type}</span>
                              </div>
                              <div className="text-[10px] text-gray-400 line-clamp-2 font-mono bg-black/20 p-2 rounded border border-white/5">
                                {artifact.content}
                              </div>
                              <div className="mt-2 flex items-center gap-1">
                                <div className="w-3 h-3 rounded-full bg-primary/20 flex items-center justify-center text-[6px] font-bold text-primary uppercase">
                                  {artifact.createdBy[0]}
                                </div>
                                <span className="text-[8px] text-gray-500 uppercase">Created by {artifact.createdBy}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {msg.imageUrl && (
                      <div className="mt-4 rounded-xl overflow-hidden border border-white/10 shadow-2xl">
                        <img 
                          src={msg.imageUrl} 
                          alt="Generated synthesis" 
                          className="w-full h-auto object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    {msg.tags && (
                      <div className="mt-4 flex gap-2">
                        {msg.tags.map(tag => (
                          <span key={tag} className="text-[10px] bg-white/5 border border-white/10 px-2 py-1 rounded">
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
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 text-primary text-[10px] font-bold tracking-widest uppercase ml-2"
            >
              <Loader2 className="w-3 h-3 animate-spin" />
              Cognitive synthesis in progress...
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="p-4 pb-8 bg-gradient-to-t from-dark-bg via-dark-bg/90 to-transparent">
        <div className="max-w-4xl mx-auto relative">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3 p-2 rounded-xl bg-black/40 border border-white/10">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-xs relative group">
                  {att.mimeType.startsWith('image/') ? (
                    <img src={`data:${att.mimeType};base64,${att.data}`} alt={att.name} className="w-8 h-8 object-cover rounded" />
                  ) : (
                    <File className="w-4 h-4 text-primary" />
                  )}
                  <span className="truncate max-w-[100px]">{att.name}</span>
                  <button 
                    onClick={() => removeAttachment(i)}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-3 p-1 pl-4 pr-1 rounded-full glass-panel border border-white/20 glow-border">
            <input 
              type="file"
              multiple
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
            />
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask Potso..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm py-3 text-gray-100 placeholder-gray-500"
            />
            <div className="flex items-center gap-1">
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-gray-400 hover:text-primary transition-colors"
                title="Attach file"
              >
                <Paperclip className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <button className="p-2 text-gray-400 hover:text-primary transition-colors">
                <Camera className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <button 
                onClick={handleSpeechToText}
                className={`p-2 transition-colors ${isDictating ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-primary'}`}
                title="Dictate"
              >
                <Mic className="h-5 w-5" strokeWidth={1.5} />
              </button>
              <button 
                onClick={() => setShowLiveVoice(true)}
                className="p-2 px-4 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 rounded-full transition-colors border border-primary/30"
                title="Live Voice Assistant"
              >
                Go Live
              </button>
              <button 
                onClick={handleSend}
                disabled={isReasoning || (!input.trim() && attachments.length === 0)}
                className="bg-primary text-dark-bg p-2.5 rounded-full hover:brightness-110 transition-all shadow-[0_0_10px_rgba(19,200,236,0.3)] disabled:opacity-50"
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

      {/* Voice Settings Modal */}
      <AnimatePresence>
        {showVoiceSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md glass-panel rounded-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Voice Settings</h2>
                <button onClick={() => setShowVoiceSettings(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Language</label>
                  <select 
                    value={voiceLanguage}
                    onChange={(e) => setVoiceLanguage(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-white"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="French">French</option>
                    <option value="German">German</option>
                    <option value="Italian">Italian</option>
                    <option value="Japanese">Japanese</option>
                    <option value="Korean">Korean</option>
                    <option value="Mandarin">Mandarin</option>
                    <option value="Hindi">Hindi</option>
                    <option value="Arabic">Arabic</option>
                    <option value="Portuguese">Portuguese</option>
                    <option value="Russian">Russian</option>
                    <option value="Dutch">Dutch</option>
                    <option value="Turkish">Turkish</option>
                    <option value="Swedish">Swedish</option>
                    <option value="Indonesian">Indonesian</option>
                    <option value="Filipino">Filipino</option>
                    <option value="Vietnamese">Vietnamese</option>
                    <option value="Thai">Thai</option>
                    <option value="Greek">Greek</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Accent (Voice Model)</label>
                  <select 
                    value={voiceAccent}
                    onChange={(e) => setVoiceAccent(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-white"
                  >
                    <option value="Zephyr">Zephyr</option>
                    <option value="Puck">Puck</option>
                    <option value="Charon">Charon</option>
                    <option value="Kore">Kore</option>
                    <option value="Fenrir">Fenrir</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-gray-400 uppercase font-bold">Speaking Speed</label>
                  <select 
                    value={voiceSpeed}
                    onChange={(e) => setVoiceSpeed(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary text-white"
                  >
                    <option value="Very Slow">Very Slow</option>
                    <option value="Slow">Slow</option>
                    <option value="Normal">Normal</option>
                    <option value="Fast">Fast</option>
                    <option value="Very Fast">Very Fast</option>
                  </select>
                </div>
              </div>

              <div className="p-4 border-t border-white/10">
                <button 
                  onClick={() => setShowVoiceSettings(false)}
                  className="w-full bg-primary text-dark-bg font-bold py-2 rounded-xl hover:brightness-110 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="w-full max-w-md glass-panel rounded-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Agent Customization</h2>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {agents.map(agent => (
                  <div key={agent.id} className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                        {(() => {
                          const IconComponent = (AVAILABLE_ICONS as any)[agent.icon];
                          return IconComponent ? (
                            <IconComponent className="w-5 h-5 text-primary" />
                          ) : (
                            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-primary" strokeWidth={1.5}>
                              <path d={agent.icon} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          );
                        })()}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold">{agent.name}</h3>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider">{agent.role}</p>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingAgent(agent);
                          setCustomPath(agent.icon.startsWith('M') ? agent.icon : '');
                        }}
                        className="ml-auto text-xs text-primary hover:underline"
                      >
                        Edit Icon
                      </button>
                    </div>

                    {editingAgent?.id === agent.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        className="p-3 bg-white/5 rounded-xl border border-white/10 space-y-4"
                      >
                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-400 uppercase font-bold">Preset Icons</label>
                          <div className="grid grid-cols-5 gap-2">
                            {Object.entries(AVAILABLE_ICONS).map(([name, Icon]) => (
                              <button
                                key={name}
                                onClick={() => handleUpdateAgentIcon(agent.id, name)}
                                className={`p-2 rounded-lg border transition-all flex items-center justify-center
                                  ${agent.icon === name ? 'border-primary bg-primary/10' : 'border-white/10 hover:bg-white/10'}`}
                              >
                                <Icon className={`w-4 h-4 ${agent.icon === name ? 'text-primary' : 'text-gray-400'}`} />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] text-gray-400 uppercase font-bold">Custom SVG Path (d attribute)</label>
                          <div className="flex gap-2">
                            <input 
                              type="text"
                              value={customPath}
                              onChange={(e) => setCustomPath(e.target.value)}
                              placeholder="M12 2L2 7l10 5 10-5-10-5z..."
                              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-primary"
                            />
                            <button 
                              onClick={() => {
                                if (customPath.trim()) {
                                  handleUpdateAgentIcon(agent.id, customPath.trim());
                                }
                              }}
                              className="bg-primary/20 text-primary p-2 rounded-lg hover:bg-primary/30 transition-colors"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[8px] text-gray-500 italic">Example: M12 2L2 7l10 5 10-5-10-5z (Diamond)</p>
                        </div>
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-white/10">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="w-full bg-primary text-dark-bg font-bold py-2 rounded-xl hover:brightness-110 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
