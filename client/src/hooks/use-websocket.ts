import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';
import { queryClient } from '@/lib/queryClient';

// Define message types
type WebSocketMessageType = 
  | 'authenticate'
  | 'authenticated'
  | 'attendance_marked'
  | 'attendance_timeframe_updated'
  | 'agent_added'
  | 'client_added'
  | 'user_created';

// Define message data structure
interface WebSocketMessage {
  type: WebSocketMessageType;
  data?: any;
  message?: string;
}

// Define hook return type
interface UseWebSocketReturn {
  sendMessage: (message: WebSocketMessage) => void;
  lastMessage: WebSocketMessage | null;
  connected: boolean;
  connecting: boolean;
}

export function useWebSocket(): UseWebSocketReturn {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  
  // WebSocket reference
  const ws = useRef<WebSocket | null>(null);
  
  // Function to send messages
  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  // Function to show notifications for certain message types
  const processWebSocketMessage = useCallback((message: WebSocketMessage) => {
    setLastMessage(message);
    
    // Handle different message types with notifications
    switch (message.type) {
      case 'attendance_marked':
        if (user?.role === 'manager') {
          toast({
            title: 'Attendance Marked',
            description: `${message.data?.agentName} marked attendance at ${message.data?.time}`,
          });
        }
        break;
        
      case 'attendance_timeframe_updated':
        if (user?.role === 'agent') {
          toast({
            title: 'Attendance Time Updated',
            description: `${message.data?.managerName} updated the attendance time window to ${message.data?.timeFrame?.startTime} - ${message.data?.timeFrame?.endTime}`,
          });
        }
        break;
        
      case 'agent_added':
      case 'user_created':
        if (message.data?.message) {
          toast({
            title: 'New User',
            description: message.data.message,
          });
        }
        break;
        
      case 'client_added':
        if (user?.role === 'manager') {
          toast({
            title: 'New Client Added',
            description: `${message.data?.agentName} added a new client: ${message.data?.clientName || 'Anonymous client'}`,
          });
          
          // Refresh clients data
          queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        }
        break;
    }
  }, [toast, user?.role, queryClient]);

  // Connect to WebSocket server
  useEffect(() => {
    // Only connect if user is authenticated
    if (!user) return;
    
    const connectWebSocket = () => {
      setConnecting(true);
      
      // Determine WebSocket URL
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      // Create WebSocket instance
      const socket = new WebSocket(wsUrl);
      ws.current = socket;
      
      // Setup WebSocket event handlers
      socket.onopen = () => {
        setConnected(true);
        setConnecting(false);
        
        // Authenticate the connection
        socket.send(JSON.stringify({
          type: 'authenticate',
          userId: user.id,
          role: user.role,
          managerId: user.managerId,
        }));
      };
      
      socket.onclose = () => {
        setConnected(false);
        setConnecting(false);
        
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
      
      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnecting(false);
      };
      
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WebSocketMessage;
          processWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
    };
    
    connectWebSocket();
    
    // Cleanup function
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [user, processWebSocketMessage]);

  return {
    sendMessage,
    lastMessage,
    connected,
    connecting,
  };
} 