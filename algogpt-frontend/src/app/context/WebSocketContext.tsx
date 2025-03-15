import React, { createContext, useContext, useRef, useEffect, useState } from 'react';
import { useToast } from "@/components/ui/use-toast";

export interface WebSocketContextType {
  sendChatMessage: (message: string) => void;
  sendCodeUpdate: (code: string) => void;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider: React.FC<{
  children: React.ReactNode;
  userId: string;
  problemId: string;
}> = ({ children, userId, problemId }) => {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    const connectWebSocket = () => {
      const ws = new WebSocket(`ws://localhost:8000/ws/chat/${userId}/${problemId}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        // Clear any reconnection timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
      };

      ws.onclose = () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
        
        // Attempt to reconnect after a delay
        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, 3000);
      };

      ws.onerror = (err) => {
        console.error("WebSocket encountered error:", err);
        setIsConnected(false);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          // Dispatch a custom event with the PARSED DATA (not the event)
          const customEvent = new CustomEvent('websocket-message', {
            detail: data  // Pass the parsed data, not the raw event
          });
          window.dispatchEvent(customEvent);
        } catch (err) {
          console.error("Failed to parse WebSocket message", err);
        }
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [userId, problemId]);

  // Send a chat message to the WebSocket server
  const sendChatMessage = (message: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "chat",
        user_message: message,
        messageId: `msg-${Date.now()}`
      }));
    } else {
      toast({
        title: "Connection Error",
        description: "WebSocket is not connected. Please try again later.",
        variant: "destructive",
      });
    }
  };

  // Send a code update to the WebSocket server
  const sendCodeUpdate = (code: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log("Sending code update:", code);
      wsRef.current.send(JSON.stringify({
        type: "code_update",
        code: code
      }));
    } else {
      console.warn("WebSocket is not open. Cannot send code update.");
    }
  };
  

  return (
    <WebSocketContext.Provider value={{ sendChatMessage, sendCodeUpdate, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
};