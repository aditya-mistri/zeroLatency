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
} from "stream-chat-react";
import config from "@/lib/config";
import { LiveTranscription } from "@/components/video/LiveTranscription";
import "stream-chat-react/dist/css/v2/index.css";
import "@stream-io/video-react-sdk/dist/css/styles.css";

// Custom styles for video layout
const customVideoStyles = `
  .str-video__speaker-layout__wrapper {
    display: flex !important;
    flex-direction: column !important;
    height: 100% !important;
  }
  
  .str-video__speaker-layout__spotlight {
    flex: 1 !important;
    min-height: 0 !important;
  }
  
  .str-video__participant-view {
    border-radius: 8px !important;
  }
  
  .str-video__participants-bar {
    padding: 12px !important;
    gap: 12px !important;
    background: rgba(0, 0, 0, 0.5) !important;
  }
  
  .str-video__participants-bar .str-video__participant-view {
    width: 120px !important;
    height: 90px !important;
    border: 2px solid rgba(255, 255, 255, 0.3) !important;
  }
  
  .str-video__call-controls {
    gap: 12px !important;
  }
  
  .str-video__call-controls button {
    width: 48px !important;
    height: 48px !important;
    border-radius: 50% !important;
    transition: all 0.2s !important;
  }
  
  .str-video__call-controls button:hover {
    transform: scale(1.1) !important;
  }
`;

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
  const [transcriptChannel, setTranscriptChannel] = useState<ReturnType<
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

        // Create a separate channel for transcriptions only
        const transcriptChannelInstance = chatClientInstance.channel(
          chatInfo.channelType,
          `${chatInfo.channelId}-transcripts`,
          {
            name: `Transcripts`,
            members: chatInfo.members,
          }
        );
        await transcriptChannelInstance.watch();

        setChatClient(chatClientInstance);
        setChannel(channelInstance);
        setTranscriptChannel(transcriptChannelInstance);

        // Store current user info for transcription
        setCurrentUser({
          id: user.id,
          name: user.name || "User",
        });
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

  if (!chatClient || !channel || !transcriptChannel || !videoClient || !call)
    return null;

  return (
    <>
      <style>{customVideoStyles}</style>
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
              <Channel channel={channel}>
                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <MessageInput />
                </Window>
                <Thread />
              </Channel>
            </Chat>
          </div>

          {/* Video Section */}
          {showVideo && (
            <div
              className={`${showTranscript ? "flex-1" : "flex-1"} bg-black relative`}
            >
              <StreamVideo client={videoClient}>
                <StreamTheme>
                  <StreamCall call={call}>
                    <div className="h-full flex flex-col">
                      {/* Main video area with custom layout */}
                      <div className="flex-1 relative">
                        <SpeakerLayout participantsBarPosition="bottom" />
                      </div>
                      {/* Call controls at bottom */}
                      <div className="p-4 bg-gray-900 flex justify-center">
                        <CallControls onLeave={onClose} />
                      </div>
                    </div>
                  </StreamCall>
                </StreamTheme>
              </StreamVideo>
            </div>
          )}

          {/* Live Transcription Section */}
          {showTranscript && currentUser && transcriptChannel && (
            <div
              className={`${
                showVideo ? "w-1/4" : "flex-1"
              } border-l bg-white flex flex-col`}
            >
              <LiveTranscription
                userId={currentUser.id}
                userName={currentUser.name}
                language="en-US"
                channel={transcriptChannel}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default StreamConsultation;
