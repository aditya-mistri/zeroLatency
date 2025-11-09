import React, { createContext, useContext, useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { config } from "./config";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinAppointment: (appointmentId: string) => void;
  leaveAppointment: (appointmentId: string) => void;
  sendMessage: (
    appointmentId: string,
    message: string,
    messageType?: string,
    metadata?: Record<string, unknown>
  ) => void;
  updateMeetingLink: (appointmentId: string, meetingLink: string) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinAppointment: () => {},
  leaveAppointment: () => {},
  sendMessage: () => {},
  updateMeetingLink: () => {},
});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
};

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      return;
    }

    const socketInstance = io(config.api.baseUrl.replace("/api", ""), {
      auth: {
        token,
      },
      transports: ["websocket", "polling"],
    });

    socketInstance.on("connect", () => {
      console.log("Socket.IO connected");
      setIsConnected(true);
      setSocket(socketInstance);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket.IO disconnected");
      setIsConnected(false);
    });

    socketInstance.on("error", (error) => {
      console.error("Socket.IO error:", error);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinAppointment = (appointmentId: string) => {
    if (socket) {
      socket.emit("join-appointment", appointmentId);
    }
  };

  const leaveAppointment = (appointmentId: string) => {
    if (socket) {
      socket.emit("leave-appointment", appointmentId);
    }
  };

  const sendMessage = (
    appointmentId: string,
    message: string,
    messageType = "text",
    metadata?: Record<string, unknown>
  ) => {
    if (socket) {
      socket.emit("send-message", { appointmentId, message, messageType, metadata });
    }
  };

  const updateMeetingLink = (appointmentId: string, meetingLink: string) => {
    if (socket) {
      socket.emit("update-meeting-link", { appointmentId, meetingLink });
    }
  };

  const contextValue: SocketContextType = {
    socket,
    isConnected,
    joinAppointment,
    leaveAppointment,
    sendMessage,
    updateMeetingLink,
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
};
