import React, { useEffect, useState, useRef } from "react";
import { appointmentApi } from "@/lib/appointment-api";
import { useSocket } from "@/lib/socket-context";
import { useAuth } from "@/lib/auth-context";
import { X, Send, Link, Paperclip, File, Image as ImageIcon, Download } from "lucide-react";
import config from "@/lib/config";
import dynamic from "next/dynamic";

const VideoCall = dynamic(() => import("../video/VideoCall"), { ssr: false });

interface Message {
  id: string;
  message: string;
  messageType: string;
  fileUrl?: string;
  metadata?: {
    fileName?: string;
    fileSize?: number;
    mimeType?: string;
  };
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
  userRole,
  onClose,
}: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [meetingLink, setMeetingLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    socket,
    joinAppointment,
    leaveAppointment,
    sendMessage,
    updateMeetingLink,
  } = useSocket();
  const { user } = useAuth();
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    try {
      // Create form data
      const formData = new FormData();
      formData.append("file", file);
      formData.append("appointmentId", appointmentId);

      // Upload file to server
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/chat/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (response.ok && data.data) {
        // Send file message via socket with fileUrl
        const metadata = {
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
        };

        // Emit message with fileUrl included
        if (socket) {
          socket.emit("send-message", {
            appointmentId,
            message: file.name,
            messageType: file.type.startsWith("image/") ? "image" : "file",
            fileUrl: data.data.fileUrl,
            metadata,
          });
        }
      } else {
        alert(data.message || "Failed to upload file");
      }
    } catch (error) {
      console.error("File upload error:", error);
      alert("Failed to upload file");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

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
            const isFileMessage = m.messageType === "file" || m.messageType === "image";

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

                  {/* File/Image Message */}
                  {isFileMessage && m.fileUrl ? (
                    <div className="space-y-2">
                      {m.messageType === "image" ? (
                        <a
                          href={m.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={m.fileUrl}
                            alt={m.metadata?.fileName || "Image"}
                            className="max-w-full h-auto rounded border border-white/20"
                            style={{ maxHeight: "200px" }}
                          />
                        </a>
                      ) : (
                        <a
                          href={m.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 p-2 rounded border ${
                            isMyMessage
                              ? "border-white/20 hover:bg-white/10"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          <File className="h-5 w-5" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">
                              {m.metadata?.fileName || m.message}
                            </div>
                            {m.metadata?.fileSize && (
                              <div className="text-xs opacity-75">
                                {(m.metadata.fileSize / 1024).toFixed(1)} KB
                              </div>
                            )}
                          </div>
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                      <div className="text-sm">{m.message}</div>
                    </div>
                  ) : (
                    /* Text Message */
                    <div className="whitespace-pre-wrap">{m.message}</div>
                  )}

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
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* File upload button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              title="Upload file or image"
            >
              <Paperclip className="h-5 w-5 text-gray-600" />
            </button>

            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !uploading) handleSendMessage();
              }}
              placeholder={uploading ? "Uploading file..." : "Type a message or upload a file..."}
              disabled={uploading}
              className="flex-1 px-3 py-2 border rounded-lg disabled:opacity-50"
            />
            <button
              onClick={handleSendMessage}
              disabled={loading || uploading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
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
