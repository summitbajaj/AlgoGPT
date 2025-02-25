import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Send, RotateCcw } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatProps {
  problemId: string;
}

export function AIChat({ problemId }: AIChatProps) {
  // Add a dummy user ID (you can replace this with actual user auth)
  const dummyUserId = "user123";
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [input]);

  const scrollToBottom = () => {
    // Find the scroll container and scroll to bottom
    const scrollContainer = document.querySelector('.scroll-area-viewport');
    if (scrollContainer) {
      scrollContainer.scrollTop = scrollContainer.scrollHeight;
    }
  };

  useEffect(() => {
    // Use setTimeout to ensure the DOM has updated
    setTimeout(scrollToBottom, 0);
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    const newUserMessage = {
      role: 'user' as const,
      content: userMessage,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          user_id: dummyUserId,
          problem_id: problemId,
          user_message: userMessage 
        }),
      });

      if (!response.ok) throw new Error('Failed to get response');
      
      const data = await response.json();
      // Make sure we're properly extracting the AI message from the response
      const aiMessage = data.answer || "Sorry, I couldn't generate a response.";
  
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: aiMessage,
        timestamp: new Date()
      }]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
      console.error('Chat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (messages.length > 0) {
      setMessages([]);
      toast({
        title: "Chat cleared",
        description: "All messages have been removed.",
      });
    }
  };

  // Enhanced markdown components with better paragraph handling
  const MarkdownComponents = {
    code({ node, inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={tomorrow}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    // Add specific styling for paragraphs to fix inconsistent spacing
    p({ node, children, ...props }: any) {
      return (
        <p className="mb-4 last:mb-0" {...props}>
          {children}
        </p>
      );
    },
    // Ensure proper styling for other elements that might cause issues
    ul({ node, children, ...props }: any) {
      return (
        <ul className="list-disc pl-6 mb-4 last:mb-0" {...props}>
          {children}
        </ul>
      );
    },
    ol({ node, children, ...props }: any) {
      return (
        <ol className="list-decimal pl-6 mb-4 last:mb-0" {...props}>
          {children}
        </ol>
      );
    },
    li({ node, children, ...props }: any) {
      return (
        <li className="mb-1" {...props}>
          {children}
        </li>
      );
    }
  };

  // Function to render message content based on role
  const renderMessageContent = (message: Message) => {
    if (message.role === 'user') {
      return <div className="whitespace-pre-wrap">{message.content}</div>;
    } else {
      // Check if content is valid for Markdown
      try {
        return (
          <div className="markdown-message">
            <ReactMarkdown
              components={MarkdownComponents}
              className="prose prose-sm dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3"
            >
              {message.content}
            </ReactMarkdown>
          </div>
        );
      } catch (error) {
        console.error("Failed to render markdown:", error);
        // Fallback to plain text if markdown rendering fails
        return <div className="whitespace-pre-wrap">{message.content}</div>;
      }
    }
  };

  return (
    <div className="flex flex-col h-full border rounded-lg">
      <div className="flex justify-between items-center p-3 border-b">
        <h2 className="text-lg font-semibold">AI Assistant</h2>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={clearChat}
          disabled={messages.length === 0 || isLoading}
        >
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
              <div
                key={index}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[85%] rounded-lg p-4 ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  {renderMessageContent(message)}
                  <div className={`text-xs mt-1 ${
                    message.role === 'user' 
                      ? 'text-primary-foreground/80' 
                      : 'text-muted-foreground'
                  }`}>
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
          <Button 
            type="submit" 
            size="icon"
            disabled={isLoading || !input.trim()}
            className="h-auto aspect-square"
          >
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