"use client";
import React, { useEffect, useState } from "react";
import {
  StreamVideoClient,
  StreamVideo,
  StreamTheme,
  StreamCall,
  CallControls,
  SpeakerLayout,
  Call as StreamCallType,
} from "@stream-io/video-react-sdk";
import { StreamChat } from "stream-chat";
import {
  Chat,
  Channel,
  Window,
  MessageList,
  MessageInput,
  Thread,
  ChannelHeader,
  Message as DefaultMessageComponent,
} from "stream-chat-react";
import config from "@/lib/config";
import { LiveTranscription } from "@/components/video/LiveTranscription";
import "stream-chat-react/dist/css/v2/index.css";
import "@stream-io/video-react-sdk/dist/css/styles.css";

interface StreamConsultationProps {
  appointmentId: string;
  onClose: () => void;
}

interface StreamTokenResponse {
  status: string;
  data?: {
    apiKey: string;
    token: string;
    user: { id: string; name?: string; image?: string };
    chat: { channelType: string; channelId: string; members: string[] };
    call: { type: string; id: string };
  };
  message?: string;
}

export const StreamConsultation: React.FC<StreamConsultationProps> = ({
  appointmentId,
  onClose,
}) => {
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(
    null
  );
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [call, setCall] = useState<StreamCallType | null>(null);
  const [channel, setChannel] = useState<ReturnType<
    StreamChat["channel"]
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Ensure component only runs on client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return; // Don't run on server
    
    const init = async () => {
      setLoading(true);
      try {
        const endpoint = `${config.api.baseUrl.replace(/\/api$/, "")}/api/video/token`;
        const token = localStorage.getItem("authToken");
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ appointmentId }),
        });
        const json: StreamTokenResponse = await resp.json();
        if (!resp.ok) {
          throw new Error(json.message || "Failed to fetch Stream tokens");
        }
        if (!json.data) throw new Error("Malformed token response");

        const {
          apiKey,
          token: userToken,
          user,
          chat: chatInfo,
          call: callInfo,
        } = json.data;

        // Initialize Stream Chat
        const chatClientInstance = StreamChat.getInstance(apiKey);

        // Only disconnect if a different user is connected
        if (
          chatClientInstance.userID &&
          chatClientInstance.userID !== user.id
        ) {
          await chatClientInstance.disconnectUser();
        }

        // Connect user if not already connected
        if (
          !chatClientInstance.userID ||
          chatClientInstance.userID !== user.id
        ) {
          await chatClientInstance.connectUser(
            {
              id: user.id,
              name: user.name,
              image: user.image,
            },
            userToken
          );
        }

        const channelInstance = chatClientInstance.channel(
          chatInfo.channelType,
          chatInfo.channelId,
          {
            name: `Appointment Consultation`,
            members: chatInfo.members,
          }
        );
        await channelInstance.watch();

        setChatClient(chatClientInstance);
        setChannel(channelInstance);

        // Store current user info for transcription
        setCurrentUser({
          id: user.id,
          name: user.name || "User",
        });

        // Initialize Stream Video
        const videoClientInstance = new StreamVideoClient({
          apiKey,
          user: {
            id: user.id,
            name: user.name,
            image: user.image,
          },
          token: userToken,
        });

        const callInstance = videoClientInstance.call(
          callInfo.type as "default" | string,
          callInfo.id
        );
        await callInstance.join({ create: true });

        setVideoClient(videoClientInstance);
        setCall(callInstance);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg || "Stream initialization failed");
      } finally {
        setLoading(false);
      }
    };
    init();

    return () => {
      setCall((prev) => {
        prev?.leave();
        return null;
      });
      setVideoClient((prev) => {
        prev?.disconnectUser?.();
        return null;
      });
      setChatClient((prev) => {
        prev?.disconnectUser();
        return null;
      });
    };
  }, [appointmentId, isMounted]);

  // Don't render anything on server
  if (!isMounted) {
    return null;
  }

  if (loading)
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-sm">Connecting to consultation...</p>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    );

  if (!chatClient || !channel || !videoClient || !call) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Consultation Room</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowVideo(!showVideo)}
            className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition"
          >
            {showVideo ? "Hide Video" : "Show Video"}
          </button>
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="px-4 py-2 bg-green-600 rounded hover:bg-green-700 transition"
          >
            {showTranscript ? "Hide Transcript" : "Show Transcript"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-red-600 rounded hover:bg-red-700 transition"
          >
            End Consultation
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Section */}
        <div
          className={`${
            showVideo && showTranscript
              ? "w-1/4"
              : showVideo || showTranscript
                ? "w-1/3"
                : "w-full"
          } bg-white border-r flex flex-col`}
        >
          <Chat client={chatClient} theme="messaging light">
            <Channel 
              channel={channel}
            >
              <Window>
                <ChannelHeader />
                <MessageList
                  messageRenderer={(messageProps) => {
                    const msg: any = messageProps.message;
                    
                    // Debug: log the FULL message object to see all fields
                    if (msg) {
                      console.log('[ChatDebug] FULL MESSAGE OBJECT:', JSON.stringify(msg, null, 2));
                      console.log('[ChatDebug] Message keys:', Object.keys(msg));
                    }
                    
                    // Normalize custom type fields (some SDKs use custom_type)
                    const customType = msg?.customType || msg?.custom_type || msg?.type;

                    // Debugging: log message id and customType when transcriptions still appear
                    // Also hide transcription messages originating from the current user (safety)
                    if (customType === "transcription" || (msg?.user?.id && currentUser?.id && msg.user.id === currentUser.id && customType)) {
                      console.log('[ChatDebug] FILTERING OUT transcription:', { id: msg?.id, text: msg?.text, customType, user: msg?.user });
                      return null;
                    }

                    // If no message present (system UI), let Stream render it
                    if (!msg) return undefined;

                    // Debug: log other messages that will be rendered
                    console.log('[ChatDebug] RENDERING message:', { id: msg?.id, text: msg?.text, customType, user: msg?.user });
                    return undefined; // Use default renderer for normal messages
                  }}
                />
                <MessageInput />
              </Window>
              <Thread />
            </Channel>
          </Chat>
        </div>

        {/* Video Section */}
        {showVideo && (
          <div
            className={`${showTranscript ? "flex-1" : "flex-1"} bg-black`}
          >
            <StreamVideo client={videoClient}>
              <StreamTheme>
                <StreamCall call={call}>
                  <div className="h-full flex flex-col">
                    <div className="flex-1">
                      <SpeakerLayout />
                    </div>
                    <div className="p-4 bg-gray-900">
                      <CallControls />
                    </div>
                  </div>
                </StreamCall>
              </StreamTheme>
            </StreamVideo>
          </div>
        )}

        {/* Live Transcription Section */}
        {showTranscript && currentUser && channel && (
          <div
            className={`${
              showVideo ? "w-1/4" : "flex-1"
            } border-l bg-white flex flex-col`}
          >
            <LiveTranscription
              userId={currentUser.id}
              userName={currentUser.name}
              language="en-US"
              channel={channel}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamConsultation;
