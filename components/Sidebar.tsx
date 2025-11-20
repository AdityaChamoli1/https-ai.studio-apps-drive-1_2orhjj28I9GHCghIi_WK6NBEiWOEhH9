
import React, { useEffect, useState } from 'react';
import { MemoryItem, ToolStatus, ChatSession } from '../types';
import { Brain, Clock, Database, Trash2, Activity, Globe, Calculator, MessageSquare, Plus, X, Image as ImageIcon, Key } from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  toolStatus: ToolStatus;
  sessions: ChatSession[];
  currentSessionId: string;
  onNewChat: () => void;
  onSelectSession: (id: string) => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  toggleSidebar, 
  toolStatus,
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onOpenSettings
}) => {
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [currentTime, setCurrentTime] = useState(new Date());

  const loadMemory = () => {
    const mem = localStorage.getItem('nexus_agent_memory');
    if (mem) {
      const parsed = JSON.parse(mem);
      const items = Object.entries(parsed).map(([key, value]) => ({
        key,
        value: value as string,
        updatedAt: Date.now()
      }));
      setMemory(items);
    } else {
      setMemory([]);
    }
  };

  useEffect(() => {
    loadMemory();
    const interval = setInterval(loadMemory, 2000);
    const timeInterval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      clearInterval(interval);
      clearInterval(timeInterval);
    };
  }, []);

  const clearMemory = () => {
    if (window.confirm('Are you sure you want to wipe the agent\'s memory?')) {
      localStorage.removeItem('nexus_agent_memory');
      loadMemory();
    }
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      <div className={`fixed top-0 right-0 h-full w-80 bg-nexus-card border-l border-gray-700 transform transition-transform duration-300 ease-in-out z-30 ${isOpen ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
        
        {/* Header / New Chat */}
        <div className="p-4 border-b border-gray-700 flex items-center gap-2">
           <button 
            onClick={() => { onNewChat(); if(window.innerWidth < 768) toggleSidebar(); }}
            className="flex-1 bg-nexus-accent text-nexus-bg font-semibold py-2 px-4 rounded-lg flex items-center justify-center gap-2 hover:bg-nexus-accent/90 transition-colors"
          >
            <Plus size={18} />
            New Chat
          </button>
          <button onClick={toggleSidebar} className="p-2 text-gray-400 hover:text-white md:hidden">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          
          {/* Chat History Section */}
          <div>
            <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MessageSquare className="w-3 h-3" />
              Recent Chats
            </h3>
            <div className="space-y-2">
              {sessions.length === 0 ? (
                <div className="text-sm text-gray-600 italic px-2">No history yet.</div>
              ) : (
                sessions.sort((a,b) => b.updatedAt - a.updatedAt).map((session) => (
                  <div 
                    key={session.id}
                    onClick={() => { onSelectSession(session.id); if(window.innerWidth < 768) toggleSidebar(); }}
                    className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer border transition-all ${
                      session.id === currentSessionId 
                        ? 'bg-nexus-bg border-nexus-accent/50 text-white' 
                        : 'hover:bg-gray-800 border-transparent text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="truncate text-sm flex-1 pr-2">
                      {session.title}
                    </div>
                    <button 
                      onClick={(e) => onDeleteSession(session.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-nexus-error transition-opacity"
                      title="Delete Chat"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="h-px bg-gray-700/50 my-4" />

          {/* System Status Section */}
          <div>
             <h2 className="text-xs font-mono text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Activity className="w-3 h-3" />
              System Status
            </h2>

            {/* Live Clock */}
            <div className="mb-4 bg-nexus-bg p-3 rounded-lg border border-gray-700/50">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Clock className="w-3 h-3" />
                <span className="text-[10px] font-mono uppercase">System Time</span>
              </div>
              <div className="text-lg font-mono text-white">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="text-xs text-gray-500">
                {currentTime.toLocaleDateString()}
              </div>
            </div>

            {/* Active Tools */}
            <div className="space-y-2 mb-6">
              <div className={`flex items-center gap-3 p-2 rounded text-xs ${toolStatus.isCalculating ? 'bg-nexus-accent/20 text-nexus-accent' : 'text-gray-600'}`}>
                <Calculator className="w-3 h-3" />
                <span>Calculator</span>
                {toolStatus.isCalculating && <span className="ml-auto animate-pulse">●</span>}
              </div>
              <div className={`flex items-center gap-3 p-2 rounded text-xs ${toolStatus.isSearching ? 'bg-green-500/20 text-green-400' : 'text-gray-600'}`}>
                <Globe className="w-3 h-3" />
                <span>Web Search</span>
                {toolStatus.isSearching && <span className="ml-auto animate-pulse">●</span>}
              </div>
              <div className={`flex items-center gap-3 p-2 rounded text-xs ${toolStatus.isAccessingMemory ? 'bg-purple-500/20 text-purple-400' : 'text-gray-600'}`}>
                <Brain className="w-3 h-3" />
                <span>Memory</span>
                {toolStatus.isAccessingMemory && <span className="ml-auto animate-pulse">●</span>}
              </div>
              <div className={`flex items-center gap-3 p-2 rounded text-xs ${toolStatus.isGeneratingImage ? 'bg-pink-500/20 text-pink-400' : 'text-gray-600'}`}>
                <ImageIcon className="w-3 h-3" />
                <span>Pika Generation</span>
                {toolStatus.isGeneratingImage && <span className="ml-auto animate-pulse">●</span>}
              </div>
            </div>

            {/* Memory Bank */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-mono text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Database className="w-3 h-3" />
                  Memory Bank
                </h3>
                <button onClick={clearMemory} className="text-gray-600 hover:text-nexus-error transition-colors" title="Wipe Memory">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              
              <div className="space-y-2">
                {memory.length === 0 ? (
                  <div className="text-xs text-gray-700 italic">Empty</div>
                ) : (
                  memory.map((item) => (
                    <div key={item.key} className="bg-nexus-bg p-2 rounded border border-gray-800/50 group hover:border-nexus-accent/30 transition-colors">
                      <div className="text-[10px] text-nexus-accent mb-0.5 font-mono">{item.key}</div>
                      <div className="text-xs text-gray-400 truncate">{item.value}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Settings Footer */}
        <div className="p-4 border-t border-gray-700 bg-nexus-card z-10">
          <button 
            onClick={onOpenSettings}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-lg border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-all text-sm"
          >
            <Key size={16} />
            API Key Settings
          </button>
        </div>

      </div>
    </>
  );
};
