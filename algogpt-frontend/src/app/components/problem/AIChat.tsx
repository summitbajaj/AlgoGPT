import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send, RotateCcw } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'; 
import type { Components } from 'react-markdown';
import { useWebSocket } from '@/app/context/WebSocketContext';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  problemId: string;
  onSocketMessage?: (data: any) => void;
}

interface MarkdownBaseProps {
  children?: React.ReactNode;
  className?: string;
}

interface CodeBlockProps extends MarkdownBaseProps {
  inline?: boolean;
  className?: string;
}

export function AIChat({ problemId, onSocketMessage }: AIChatProps) {
  // Replace with your actual user authentication if available
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendChatMessage, isConnected } = useWebSocket();

  // Auto-resize textarea when input changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  // Scroll to bottom when messages update
  const scrollToBottom = () => {
    const scrollContainer = document.querySelector('.scroll-area-viewport');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  };

  useEffect(() => {
    setTimeout(scrollToBottom, 0);
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !isConnected) return;
  
    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };
  
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
  
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Send the message using our context
    sendChatMessage(userMessage.content);
  };

  // Process WebSocket message responses
  useEffect(() => {
    function handleWebSocketMessage(event: CustomEvent) {
      try {
        const data = event.detail;  // The data is now directly in the event.detail
        
        // Call the optional callback if provided
        if (onSocketMessage) {
          onSocketMessage(data);
        }
        
        if (data.answer) {
          const aiMessage: Message = {
            role: 'assistant',
            content: data.answer,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, aiMessage]);
          setIsLoading(false);
        } else if (data.error) {
          toast({
            title: "Error",
            description: data.error,
            variant: "destructive",
          });
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Failed to process message:", err);
        setIsLoading(false);
      }
    }

    // Use a reference to the same function for adding and removing
    const handleWebSocketMessageWrapper = (e: Event) => 
      handleWebSocketMessage(e as CustomEvent);

    // Listen for messages with the same function reference
    window.addEventListener('websocket-message', handleWebSocketMessageWrapper);

    return () => {
      // Remove the exact same function reference
      window.removeEventListener('websocket-message', handleWebSocketMessageWrapper);
    };
  }, [toast, onSocketMessage]);

  const clearChat = () => {
    if (messages.length > 0) {
      setMessages([]);
      toast({
        title: "Chat cleared",
        description: "All messages have been removed.",
      });
    }
  };

  // Markdown component enhancements
  const MarkdownComponents: Components = {
    code({ inline, className, children, ...props }: CodeBlockProps) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter style={tomorrow} language={match[1]} PreTag="div" {...props}>
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    p({ children, className, ...props }) {
      return (
        <p className={`mb-4 last:mb-0 ${className || ''}`} {...props}>
          {children}
        </p>
      );
    },
    ul({ children, className, ...props }) {
      return (
        <ul className={`list-disc pl-6 mb-4 last:mb-0 ${className || ''}`} {...props}>
          {children}
        </ul>
      );
    },
    ol({ children, className, ...props }) {
      return (
        <ol className={`list-decimal pl-6 mb-4 last:mb-0 ${className || ''}`} {...props}>
          {children}
        </ol>
      );
    },
    li({ children, className, ...props }) {
      return (
        <li className={`mb-1 ${className || ''}`} {...props}>
          {children}
        </li>
      );
    }
  };

  // Render message content based on role
  const renderMessageContent = (message: Message) => {
    if (message.role === 'user') {
      return <div className="whitespace-pre-wrap">{message.content}</div>;
    } else {
      try {
        return (
          <div className="markdown-message">
            <ReactMarkdown components={MarkdownComponents} className="prose prose-sm dark:prose-invert max-w-none">
              {message.content}
            </ReactMarkdown>
          </div>
        );
      } catch (error) {
        console.error("Failed to render markdown:", error);
        return <div className="whitespace-pre-wrap">{message.content}</div>;
      }
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg">
      <div className="flex justify-between items-center p-3 border-b">
        <h2 className="text-lg font-semibold">
          AI Assistant
          {!isConnected && <span className="ml-2 text-sm text-red-500">(Disconnected)</span>}
        </h2>
        <Button variant="outline" size="sm" onClick={clearChat} disabled={messages.length === 0 || isLoading}>
          <RotateCcw className="h-4 w-4 mr-2" />
          Clear Chat
        </Button>
      </div>
      <ScrollArea className="flex-1 p-4 scroll-area">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-4">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            <h3 className="text-lg font-medium mb-2">How can I help you today?</h3>
            <p>Ask me anything about problem #{problemId}!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-lg p-4 ${message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                  {renderMessageContent(message)}
                  <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-lg p-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </ScrollArea>
      <form onSubmit={handleSubmit} className="p-4 border-t">
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about the problem..."
            className="min-h-[60px] max-h-[200px] resize-none py-3"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()} className="h-auto aspect-square">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="text-xs text-muted-foreground mt-2 text-center">
          Press Enter to send, Shift+Enter for a new line
        </div>
      </form>
    </div>
  );
}