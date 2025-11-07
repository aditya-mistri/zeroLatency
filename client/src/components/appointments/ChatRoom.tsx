import React, { useEffect, useState, useRef } from "react";
import { appointmentApi } from "@/lib/appointment-api";
import { useSocket } from "@/lib/socket-context";
import { useAuth } from "@/lib/auth-context";
import { X, Send, Link } from "lucide-react";
import config from "@/lib/config";
import dynamic from "next/dynamic";

const VideoCall = dynamic(() => import("../video/VideoCall"), { ssr: false });

interface Message {
  id: string;
  message: string;
  messageType: string;
  sentAt: string;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface ChatRoomProps {
  appointmentId: string;
  userRole: "PATIENT" | "DOCTOR";
  onClose?: () => void;
}

export default function ChatRoom({
  appointmentId,
  userRole, // reserved for future role-based UI logic
  onClose,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [meetingLink, setMeetingLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const {
    socket,
    joinAppointment,
    leaveAppointment,
    sendMessage,
    updateMeetingLink,
  } = useSocket();
  const { user } = useAuth();

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      type LinkRes = { status: string; data?: { meetingLink?: string } };
      const linkRes: LinkRes = (await appointmentApi.getMeetingLink(
        appointmentId
      )) as LinkRes;
      if (linkRes?.status === "success") {
        setMeetingLink(linkRes.data?.meetingLink || null);
      }
    } catch (err) {
      console.error("Failed to load meeting link", err);
    }
  };

  useEffect(() => {
    if (socket) {
      // Join appointment room
      joinAppointment(appointmentId);

      // Fetch initial data
      fetchInitialData();

      // Socket event listeners
      const handleNewMessage = (data: { message: Message }) => {
        setMessages((prev) => [...prev, data.message]);
      };

      const handleMessagesHistory = (data: { messages: Message[] }) => {
        setMessages(data.messages || []);
      };

      const handleMeetingLinkUpdated = (data: {
        appointmentId: string;
        meetingLink: string;
      }) => {
        if (data.appointmentId === appointmentId) {
          setMeetingLink(data.meetingLink);
        }
      };

      const handleJoinedAppointment = (data: {
        appointmentId: string;
        status: string;
      }) => {
        console.log("Joined appointment room:", data);
      };

      const handleError = (error: { message: string }) => {
        console.error("Socket error:", error);
      };

      socket.on("new-message", handleNewMessage);
      socket.on("messages-history", handleMessagesHistory);
      socket.on("meeting-link-updated", handleMeetingLinkUpdated);
      socket.on("joined-appointment", handleJoinedAppointment);
      socket.on("error", handleError);

      return () => {
        socket.off("new-message", handleNewMessage);
        socket.off("messages-history", handleMessagesHistory);
        socket.off("meeting-link-updated", handleMeetingLinkUpdated);
        socket.off("joined-appointment", handleJoinedAppointment);
        socket.off("error", handleError);
        leaveAppointment(appointmentId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, appointmentId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (!newMessage.trim() || !socket) return;

    setLoading(true);
    try {
      sendMessage(appointmentId, newMessage.trim());
      setNewMessage("");
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setLoading(false);
    }
  };

  const shareMeetingLink = async () => {
    if (!meetingLink) {
      const link = window.prompt(
        "Enter meeting/video link (e.g., Zoom/Meet link)"
      );
      if (!link || !socket) return;

      try {
        setLoading(true);
        // Set meeting link via Socket.IO
        updateMeetingLink(appointmentId, link);
        // Also post as chat message
        sendMessage(appointmentId, `Join the video call: ${link}`, "link");
      } catch (err) {
        console.error("Failed to set meeting link", err);
      } finally {
        setLoading(false);
      }
    } else {
      // already exists: copy to clipboard
      navigator.clipboard
        .writeText(meetingLink)
        .then(() => alert("Meeting link copied to clipboard"));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold">Consultation Chat</h3>
          <div className="flex items-center gap-2">
            {config.features.enableVideoCall && (
              <button
                onClick={() => setShowVideo((s) => !s)}
                className="px-3 py-1 bg-emerald-600 text-white rounded text-sm"
              >
                {showVideo ? "Hide Video" : "Join Video"}
              </button>
            )}
            <button
              onClick={shareMeetingLink}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center gap-2"
            >
              <Link className="h-4 w-4" />
              {meetingLink ? "Copy Link" : "Share Link"}
            </button>
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-3">
          {messages.map((m) => {
            const isMyMessage = user && m.senderId === user.id;
            return (
              <div
                key={m.id}
                className={`flex ${isMyMessage ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] p-3 rounded-lg ${isMyMessage ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"}`}
                >
                  <div className="text-xs font-medium mb-1">
                    {m.sender.firstName} {m.sender.lastName}
                  </div>
                  <div className="whitespace-pre-wrap">{m.message}</div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(m.sentAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {config.features.enableVideoCall && showVideo && (
          <div className="border-t">
            {/* Inline video call UI */}
            <VideoCall appointmentId={appointmentId} />
          </div>
        )}

        <div className="p-4 border-t">
          <div className="flex gap-2">
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
              placeholder="Type a message..."
              className="flex-1 px-3 py-2 border rounded-lg"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
