
import React, { useState, useRef, useEffect } from 'react';
import { Send, PanelRight, Sparkles, Menu, Trash2, Key, X } from 'lucide-react';
import { Message, Sender, ToolStatus, ChatSession } from './types';
import { generateAgentResponse } from './services/geminiService';
import { MessageBubble } from './components/MessageBubble';
import { Sidebar } from './components/Sidebar';

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: Sender.AI,
  content: "I am Nexus, your advanced AI agent powered by OpenRouter. I have access to real-time tools including Pika Image Generation, Calculator, Memory Bank, Clock, and Web Search. How can I assist you today?",
  timestamp: Date.now()
};

export default function App() {
  // State for Sessions
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => Date.now().toString());
  
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [tempKey, setTempKey] = useState('');

  const [toolStatus, setToolStatus] = useState<ToolStatus>({
    isCalculating: false,
    isSearching: false,
    isAccessingMemory: false,
    isGeneratingImage: false
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load API Key on Mount
  useEffect(() => {
    let key = '';
    // Check ENV
    try {
      if (process.env.API_KEY && process.env.API_KEY.startsWith('sk-or-')) {
        key = process.env.API_KEY;
      }
    } catch (e) {}

    // Check LocalStorage
    if (!key) {
      key = localStorage.getItem('nexus_openrouter_key') || '';
    }

    if (key) {
      setApiKey(key);
    } else {
      setShowKeyModal(true);
    }
  }, []);

  const handleSaveKey = () => {
    if (tempKey.trim().length > 0) {
      const cleanKey = tempKey.trim();
      setApiKey(cleanKey);
      localStorage.setItem('nexus_openrouter_key', cleanKey);
      setShowKeyModal(false);
      setTempKey('');
    }
  };

  // Load Sessions from LocalStorage on Mount
  useEffect(() => {
    const savedSessions = localStorage.getItem('nexus_chat_history');
    if (savedSessions) {
      try {
        const parsed = JSON.parse(savedSessions);
        setSessions(parsed);
        // If there are sessions, load the most recent one, otherwise keep the default new one
        if (parsed.length > 0) {
           const mostRecent = parsed.sort((a: ChatSession, b: ChatSession) => b.updatedAt - a.updatedAt)[0];
           setMessages(mostRecent.messages);
           setCurrentSessionId(mostRecent.id);
        }
      } catch (e) {
        console.error("Failed to load chat history", e);
      }
    }
  }, []);

  // Save Sessions to LocalStorage whenever messages change
  useEffect(() => {
    // Don't save if it's just the welcome message and we haven't typed anything
    if (messages.length === 1 && messages[0].id === 'welcome') return;

    setSessions(prevSessions => {
      const existingIndex = prevSessions.findIndex(s => s.id === currentSessionId);
      const firstUserMsg = messages.find(m => m.role === Sender.USER);
      const title = firstUserMsg ? firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '') : 'New Chat';

      const updatedSession: ChatSession = {
        id: currentSessionId,
        title: title,
        messages: messages,
        updatedAt: Date.now()
      };

      let newSessions;
      if (existingIndex >= 0) {
        newSessions = [...prevSessions];
        newSessions[existingIndex] = updatedSession;
      } else {
        newSessions = [updatedSession, ...prevSessions];
      }
      
      localStorage.setItem('nexus_chat_history', JSON.stringify(newSessions));
      return newSessions;
    });
  }, [messages, currentSessionId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- Session Management Handlers ---

  const handleNewChat = () => {
    const newId = Date.now().toString();
    setCurrentSessionId(newId);
    setMessages([WELCOME_MESSAGE]);
    setIsSidebarOpen(false); // Optional: close sidebar on mobile
  };

  const handleSelectSession = (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
      setCurrentSessionId(session.id);
      setMessages(session.messages);
    }
  };

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    localStorage.setItem('nexus_chat_history', JSON.stringify(newSessions));

    // If we deleted the current session, switch to another or create new
    if (currentSessionId === id) {
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions[0].id);
        setMessages(newSessions[0].messages);
      } else {
        handleNewChat();
      }
    }
  };

  const handleClearCurrentChat = () => {
    if (window.confirm("Are you sure you want to clear the current chat?")) {
       setMessages([WELCOME_MESSAGE]);
    }
  };

  // --- Chat Logic ---

  const handleToolStart = (toolName: string) => {
    setToolStatus(prev => ({
      ...prev,
      isCalculating: toolName.includes('calculate'),
      isAccessingMemory: toolName.includes('memory'),
      isSearching: toolName.includes('search'),
      isGeneratingImage: toolName.includes('pika') || toolName.includes('image')
    }));
  };

  const handleToolEnd = () => {
    setToolStatus({
      isCalculating: false,
      isSearching: false,
      isAccessingMemory: false,
      isGeneratingImage: false
    });
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    // If no API Key, open modal instead of sending
    if (!apiKey) {
      setShowKeyModal(true);
      return;
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: Sender.USER,
      content: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      if (input.toLowerCase().includes('search') || input.toLowerCase().includes('find')) {
        setToolStatus(prev => ({ ...prev, isSearching: true }));
      }

      const response = await generateAgentResponse(
        [...messages, userMsg], 
        input,
        apiKey,
        handleToolStart,
        handleToolEnd
      );
      
      setToolStatus(prev => ({ ...prev, isSearching: false }));

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: Sender.AI,
        content: response.text,
        toolCalls: response.toolCalls,
        groundingSources: response.groundingSources,
        timestamp: Date.now(),
        image: response.generatedImages?.[0] // Attach the first generated image if available
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error: any) {
      console.error("Agent Error Details:", error);
      
      if (error.message === "AUTH_ERROR") {
        // Handle Auth Error specifically
        setApiKey(''); // Clear invalid key
        localStorage.removeItem('nexus_openrouter_key');
        setShowKeyModal(true); // Show modal
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: Sender.AI,
          content: "Error: Invalid API Key. Please enter a valid OpenRouter API Key.",
          isError: true,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
      } else {
        let errorText = "I encountered an error connecting to OpenRouter.";
        if (error.message) {
          errorText += ` (${error.message})`;
        }
        const errorMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: Sender.AI,
          content: errorText,
          isError: true,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
      }
    } finally {
      setIsLoading(false);
      handleToolEnd();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen bg-nexus-bg text-gray-100 overflow-hidden font-sans selection:bg-nexus-accent selection:text-nexus-bg relative">
      
      {/* API Key Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-nexus-card border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3 text-nexus-accent">
                <Key className="w-6 h-6" />
                <h2 className="text-xl font-bold">Authentication Required</h2>
              </div>
              {apiKey && (
                <button onClick={() => setShowKeyModal(false)} className="text-gray-500 hover:text-white">
                  <X size={20} />
                </button>
              )}
            </div>
            
            <p className="text-gray-400 mb-4 text-sm leading-relaxed">
              To use Nexus, you need an <strong>OpenRouter API Key</strong>. 
              Your key is stored locally on your device and never shared with us.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-gray-500 mb-1">API Key</label>
                <input 
                  type="password" 
                  value={tempKey}
                  onChange={(e) => setTempKey(e.target.value)}
                  placeholder="sk-or-..."
                  className="w-full bg-nexus-bg border border-gray-700 rounded-lg p-3 text-white focus:border-nexus-accent focus:outline-none font-mono text-sm"
                  autoFocus
                />
              </div>

              <button 
                onClick={handleSaveKey}
                disabled={!tempKey.trim()}
                className="w-full bg-nexus-accent text-nexus-bg font-bold py-3 rounded-lg hover:bg-nexus-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect Nexus Agent
              </button>

              <div className="text-center mt-4">
                <a 
                  href="https://openrouter.ai/keys" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-nexus-accent/80 hover:text-nexus-accent hover:underline"
                >
                  Get a free key at OpenRouter.ai
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isSidebarOpen ? 'mr-80 hidden md:flex' : 'mr-0'}`}>
        
        {/* Top Bar */}
        <div className="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-nexus-bg/80 backdrop-blur z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-nexus-accent to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-nexus-accent/20">
              <Sparkles className="text-white w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">Nexus Agent</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : (apiKey ? 'bg-nexus-success' : 'bg-nexus-error')}`}></div>
                <span className="text-[10px] uppercase tracking-wider text-gray-500 font-mono">
                  {isLoading ? 'Processing...' : (apiKey ? 'OpenRouter Active' : 'No Connection')}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={handleClearCurrentChat}
              className="p-2 rounded-lg text-gray-400 hover:bg-nexus-error/10 hover:text-nexus-error transition-colors"
              title="Clear Current Chat"
            >
              <Trash2 size={20} />
            </button>
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`p-2 rounded-lg hover:bg-gray-800 transition-colors ${isSidebarOpen ? 'text-nexus-accent' : 'text-gray-400'}`}
            >
              {isSidebarOpen ? <PanelRight size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">
          <div className="max-w-3xl mx-auto">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
             {isLoading && (
              <div className="flex items-center gap-2 text-gray-500 text-sm ml-14 animate-pulse">
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                 <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 border-t border-gray-800 bg-nexus-bg/90 backdrop-blur">
          <div className="max-w-3xl mx-auto relative">
            <div className={`absolute inset-0 -m-[1px] rounded-xl bg-gradient-to-r from-nexus-accent/50 to-purple-600/50 opacity-0 transition-opacity duration-300 pointer-events-none ${isLoading ? 'opacity-100' : ''}`} />
            <div className="relative flex items-end gap-2 bg-nexus-card rounded-xl border border-gray-700 p-2 focus-within:border-nexus-accent/50 transition-colors shadow-xl">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything..."
                className="w-full bg-transparent text-gray-100 placeholder-gray-500 p-3 max-h-32 min-h-[50px] resize-none focus:outline-none font-medium text-sm md:text-base"
                rows={1}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="p-3 rounded-lg bg-nexus-accent text-nexus-bg hover:bg-nexus-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
              >
                <Send size={18} strokeWidth={2.5} />
              </button>
            </div>
            <div className="text-center mt-2">
              <p className="text-[10px] text-gray-600 font-mono">
                Powered by OpenRouter (Gemini 2.0) • Memory • Search • Pika Gen
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* Sidebar Component */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
        toolStatus={toolStatus}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        onOpenSettings={() => { setShowKeyModal(true); setIsSidebarOpen(false); }}
      />

    </div>
  );
}
