import React, { useEffect, useState, useRef } from "react";
import { appointmentApi } from "@/lib/appointment-api";
import { useSocket } from "@/lib/socket-context";
import { useAuth } from "@/lib/auth-context";
import { 
  X, 
  Send, 
  Link, 
  Paperclip, 
  File, 
  Download, 
  FileText, 
  Video as VideoIcon,
  MessageSquare,
  Clock,
  User
} from "lucide-react";
import config from "@/lib/config";
import dynamic from "next/dynamic";

const VideoCall = dynamic(() => import("../video/VideoCall"), { ssr: false });
const PrescriptionModal = dynamic(() => import("../prescriptions/PrescriptionModal"), { ssr: false });
const TranscriptionPanel = dynamic(() => import("../video/TranscriptionPanel"), { ssr: false });

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

interface Prescription {
  id: string;
  diagnosis: string;
  medications: string | Record<string, unknown>;
  instructions: string;
  status?: string;
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
  const [prescriptionNotification, setPrescriptionNotification] = useState<Prescription | null>(null);
  const [showPrescription, setShowPrescription] = useState(false);
  const [appointmentData, setAppointmentData] = useState<{
    doctor?: { firstName: string; lastName: string };
    patient?: { firstName: string; lastName: string };
  } | null>(null);
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
      // Fetch appointment details for display
      const appointmentRes = await appointmentApi.getAppointmentById(appointmentId);
      if (appointmentRes?.data?.appointment) {
        setAppointmentData({
          doctor: appointmentRes.data.appointment.doctor,
          patient: appointmentRes.data.appointment.patient,
        });
      }
      
      type LinkRes = { status: string; data?: { meetingLink?: string } };
      const linkRes: LinkRes = (await appointmentApi.getMeetingLink(
        appointmentId
      )) as LinkRes;
      if (linkRes?.status === "success") {
        setMeetingLink(linkRes.data?.meetingLink || null);
      }
    } catch (err) {
      console.error("Failed to load initial data", err);
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

      const handlePrescriptionUpdated = (data: { appointmentId: string; prescription: Prescription }) => {
        console.log("Prescription updated:", data);
        if (data.appointmentId === appointmentId) {
          setPrescriptionNotification(data.prescription);
          // Auto-dismiss notification after 10 seconds
          setTimeout(() => {
            setPrescriptionNotification(null);
          }, 10000);
        }
      };

      socket.on("new-message", handleNewMessage);
      socket.on("messages-history", handleMessagesHistory);
      socket.on("meeting-link-updated", handleMeetingLinkUpdated);
      socket.on("joined-appointment", handleJoinedAppointment);
      socket.on("error", handleError);
      socket.on("prescription-updated", handlePrescriptionUpdated);

      return () => {
        socket.off("new-message", handleNewMessage);
        socket.off("messages-history", handleMessagesHistory);
        socket.off("meeting-link-updated", handleMeetingLinkUpdated);
        socket.off("joined-appointment", handleJoinedAppointment);
        socket.off("error", handleError);
        socket.off("prescription-updated", handlePrescriptionUpdated);
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
    <div className="h-screen w-screen bg-gradient-to-br from-gray-50 to-gray-100 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
        <div className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold shadow-md">
              {userRole === "DOCTOR" ? "Dr" : "Pt"}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Consultation Room</h3>
              <p className="text-sm text-gray-500">
                {appointmentData?.doctor && appointmentData?.patient
                  ? `Dr. ${appointmentData.doctor.firstName} ${appointmentData.doctor.lastName} & ${appointmentData.patient.firstName} ${appointmentData.patient.lastName}`
                  : "Loading..."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {config.features.enableVideoCall && (
              <button
                onClick={() => setShowVideo((s) => !s)}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  showVideo
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-md"
                    : "bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white shadow-md"
                }`}
              >
                <VideoIcon className="h-4 w-4" />
                {showVideo ? "Leave Video" : "Join Video"}
              </button>
            )}
            <button
              onClick={shareMeetingLink}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md"
            >
              <Link className="h-4 w-4" />
              {meetingLink ? "Copy Link" : "Share Link"}
            </button>
            {onClose && (
              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to leave the consultation room?")) {
                    onClose();
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all duration-200 flex items-center gap-2 shadow-md"
              >
                <X className="h-4 w-4" />
                Leave Room
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Video Left, Right Sidebar (Transcription + Chat) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Video Section */}
        <div className="flex-1 bg-gray-900 relative overflow-hidden">
          {config.features.enableVideoCall && showVideo ? (
            <VideoCall appointmentId={appointmentId} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <VideoIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <p className="text-white text-lg font-medium">Click &quot;Join Video&quot; button above to start video consultation</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Transcription (Top) + Chat (Bottom) */}
        <div className="w-96 flex flex-col bg-white border-l border-gray-200 overflow-hidden">
          {/* Transcription Section - Top Half */}
          <div className="h-1/2 flex flex-col border-b border-gray-200">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <FileText className="h-5 w-5 text-purple-600" />
              <h4 className="font-semibold text-gray-900">Live Transcription</h4>
            </div>
            <div className="flex-1 overflow-hidden bg-gradient-to-br from-purple-50 to-white">
              {showVideo ? (
                <TranscriptionPanel />
              ) : (
                <div className="p-3">
                  <div className="bg-purple-100 border border-purple-200 rounded-lg p-3 mb-3">
                    <p className="text-sm text-purple-900 font-medium mb-1">
                      Join Video Call First
                    </p>
                    <p className="text-xs text-purple-700">
                      Transcription will be available once you join the video call
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Chat Section - Bottom Half */}
          <div className="h-1/2 flex flex-col">
            <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 border-b border-gray-200 flex-shrink-0">
              <MessageSquare className="h-5 w-5 text-emerald-600" />
              <h4 className="font-semibold text-gray-900">Messages</h4>
              <span className="ml-auto text-xs text-gray-500">{messages.length}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gradient-to-br from-emerald-50 to-white">
              {messages.map((m) => {
                const isMyMessage = user && m.senderId === user.id;
                const isFileMessage = m.messageType === "file" || m.messageType === "image";

                return (
                  <div
                    key={m.id}
                    className={`flex ${isMyMessage ? "justify-end" : "justify-start"} animate-fade-in`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg shadow-sm text-xs ${
                        isMyMessage
                          ? "bg-gradient-to-br from-emerald-600 to-emerald-700 text-white"
                          : "bg-white border border-gray-200 text-gray-900"
                      }`}
                    >
                      <div className="px-3 py-2">
                        <div className={`text-[10px] font-medium mb-1 flex items-center gap-1 ${isMyMessage ? "text-emerald-100" : "text-gray-600"}`}>
                          <User className="h-2.5 w-2.5" />
                          {m.sender.firstName}
                          <span className={`ml-auto ${isMyMessage ? "text-emerald-200" : "text-gray-400"}`}>
                            {m.sender.role === "DOCTOR" ? "Dr" : "Pt"}
                          </span>
                        </div>

                        {/* File/Image Message */}
                        {isFileMessage && m.fileUrl ? (
                          <div className="space-y-1">
                            {m.messageType === "image" ? (
                              <a
                                href={m.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block rounded overflow-hidden"
                              >
                                <img
                                  src={m.fileUrl}
                                  alt={m.metadata?.fileName || "Image"}
                                  className="max-w-full h-auto"
                                  style={{ maxHeight: "120px" }}
                                />
                              </a>
                            ) : (
                              <a
                                href={m.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`flex items-center gap-2 p-2 rounded border transition-colors ${
                                  isMyMessage
                                    ? "border-emerald-400/30 bg-emerald-500/20 hover:bg-emerald-500/30"
                                    : "border-gray-300 bg-gray-50 hover:bg-gray-100"
                                }`}
                              >
                                <File className="h-3 w-3 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <div className="text-[11px] font-medium truncate">
                                    {m.metadata?.fileName || m.message}
                                  </div>
                                  {m.metadata?.fileSize && (
                                    <div className={`text-[10px] ${isMyMessage ? "text-emerald-200" : "text-gray-500"}`}>
                                      {(m.metadata.fileSize / 1024).toFixed(1)} KB
                                    </div>
                                  )}
                                </div>
                                <Download className="h-3 w-3 flex-shrink-0" />
                              </a>
                            )}
                            {m.message && m.message !== m.metadata?.fileName && (
                              <div className="text-[11px] mt-1">{m.message}</div>
                            )}
                          </div>
                        ) : (
                          /* Text Message */
                          <div className="whitespace-pre-wrap text-[11px] leading-relaxed">{m.message}</div>
                        )}

                        <div className={`flex items-center gap-1 text-[10px] mt-1 ${isMyMessage ? "text-emerald-200" : "text-gray-400"}`}>
                          <Clock className="h-2.5 w-2.5" />
                          {new Date(m.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {/* Message Input */}
            <div className="p-2 bg-white border-t border-gray-200 flex-shrink-0">
              <div className="flex gap-1.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-2 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  title="Upload file or image"
                >
                  <Paperclip className="h-4 w-4 text-gray-600" />
                </button>

                <input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && !uploading) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={uploading ? "Uploading..." : "Type..."}
                  disabled={uploading}
                  className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 text-gray-900 placeholder-gray-400 text-sm"
                />
                
                <button
                  onClick={handleSendMessage}
                  disabled={loading || uploading || !newMessage.trim()}
                  className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white rounded-lg font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md text-sm"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prescription Notification */}
      {prescriptionNotification && (
        <div className="fixed top-4 right-4 bg-white border-2 border-emerald-500 rounded-xl shadow-2xl p-4 max-w-sm z-50 animate-slide-in">
          <div className="flex items-start gap-3">
            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full p-2">
              <FileText className="h-5 w-5 text-white" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-1">
                Prescription {prescriptionNotification.status === "SENT" ? "Received" : "Updated"}!
              </h4>
              <p className="text-sm text-gray-600 mb-3">
                {userRole === "PATIENT" 
                  ? "Your doctor has sent you a prescription."
                  : "Prescription has been saved successfully."}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPrescription(true);
                    setPrescriptionNotification(null);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-sm rounded-lg transition-all duration-200 shadow-md"
                >
                  View Prescription
                </button>
                <button
                  onClick={() => setPrescriptionNotification(null)}
                  className="px-3 py-1.5 bg-white border-2 border-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-50 transition-all duration-200"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <button
              onClick={() => setPrescriptionNotification(null)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Prescription View Modal */}
      {showPrescription && (
        <PrescriptionModal
          appointmentId={appointmentId}
          onClose={() => setShowPrescription(false)}
        />
      )}
    </div>
  );
}
