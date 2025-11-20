import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, Sender } from '../types';
import { Bot, User, ExternalLink, Terminal, AlertCircle } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === Sender.USER;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${isUser ? 'bg-nexus-accent text-nexus-bg' : 'bg-nexus-card text-nexus-accent border border-gray-700'}`}>
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>

        {/* Content */}
        <div className="flex flex-col gap-2 min-w-0">
          <div className={`p-4 rounded-2xl ${
            isUser 
              ? 'bg-nexus-accent text-nexus-bg rounded-tr-none' 
              : 'bg-nexus-card text-gray-100 border border-gray-700 rounded-tl-none'
          }`}>
            {message.isError ? (
               <div className="flex items-center gap-2 text-nexus-error">
                 <AlertCircle size={16} />
                 <span>{message.content}</span>
               </div>
            ) : (
              <div className={`markdown-body text-sm md:text-base ${isUser ? 'text-nexus-bg' : 'text-gray-200'}`}>
                 <ReactMarkdown>{message.content}</ReactMarkdown>
                 {message.image && (
                   <div className="mt-3">
                     <img 
                       src={message.image} 
                       alt="Generated Content" 
                       className="rounded-lg border border-white/20 max-w-full h-auto shadow-lg"
                     />
                   </div>
                 )}
              </div>
            )}
          </div>

          {/* Tool Calls & Metadata (AI Only) */}
          {!isUser && (
            <div className="space-y-2">
              {message.toolCalls && message.toolCalls.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.toolCalls.map((tool, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs bg-black/30 px-3 py-1.5 rounded border border-gray-800 text-gray-400 font-mono">
                      <Terminal size={12} />
                      <span className="text-nexus-accent">{tool.toolName}</span>
                      <span className="opacity-50">Executed</span>
                    </div>
                  ))}
                </div>
              )}

              {message.groundingSources && message.groundingSources.length > 0 && (
                <div className="bg-nexus-card/50 p-3 rounded border border-gray-800">
                  <div className="text-xs text-gray-500 mb-2 uppercase tracking-wider">Sources</div>
                  <div className="flex flex-wrap gap-2">
                    {message.groundingSources.map((source, idx) => (
                      <a 
                        key={idx} 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-nexus-accent hover:underline bg-nexus-bg px-2 py-1 rounded"
                      >
                        <ExternalLink size={10} />
                        {source.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="text-xs text-gray-600 pl-1">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};