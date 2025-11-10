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
import config from "../../lib/config";

interface VideoCallProps {
  appointmentId: string;
  userTokenEndpoint?: string;
}

interface TokenResponse {
  status: string;
  data?: {
    apiKey: string;
    token: string;
    user: { id: string; name?: string; image?: string };
    call: { type: string; id: string };
  };
  message?: string;
}

export const VideoCall: React.FC<VideoCallProps> = ({
  appointmentId,
  userTokenEndpoint,
}) => {
  const [client, setClient] = useState<StreamVideoClient | null>(null);
  const [call, setCall] = useState<StreamCallType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      try {
        const endpoint =
          userTokenEndpoint ||
          `${config.api.baseUrl.replace(/\/api$/, "")}/api/video/token`;
        const token = localStorage.getItem("authToken");
        
        if (!token) {
          throw new Error("Authentication required. Please log in again.");
        }
        
        console.log("Fetching video token from:", endpoint);
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ appointmentId }),
        });
        
        const json: TokenResponse = await resp.json();
        console.log("Video token response status:", resp.status);
        
        if (!resp.ok) {
          throw new Error(json.message || `Failed to fetch video token (${resp.status})`);
        }
        if (!json.data) throw new Error("Malformed token response");

        const { apiKey, token: userToken, user, call: callInfo } = json.data;
        console.log("Initializing Stream Video Client for user:", user.id);
        
        const videoClient = new StreamVideoClient({
          apiKey,
          user,
          token: userToken,
        });
        const c = videoClient.call(
          callInfo.type as "default" | string,
          callInfo.id
        );
        
        console.log("Joining call:", callInfo.id);
        await c.join({ create: true });
        
        // Enable transcription automatically
        try {
          await c.startTranscription();
          console.log("✓ Transcription started successfully");
        } catch (transcriptionError) {
          console.warn("Could not start transcription:", transcriptionError);
        }
        
        setClient(videoClient);
        setCall(c);
        console.log("✓ Video call connected successfully");
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("Video init error:", msg);
        setError(msg || "Video init failed");
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
      setClient((prev) => {
        prev?.disconnectUser?.();
        return null;
      });
    };
  }, [appointmentId, userTokenEndpoint]);

  if (loading) return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
        <p className="text-lg font-medium">Connecting to call...</p>
        <p className="text-sm text-gray-400 mt-2">Setting up video and audio</p>
      </div>
    </div>
  );
  
  if (error) return (
    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-red-400">
      <div className="text-center max-w-md p-6 bg-red-900/20 rounded-lg border border-red-500/30">
        <p className="text-lg font-semibold mb-2">Connection Error</p>
        <p className="text-sm mb-4">{error}</p>
        <div className="text-xs text-gray-400 mt-4 text-left bg-black/20 rounded p-3">
          <p className="font-semibold mb-2">Troubleshooting:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Make sure you are logged in</li>
            <li>Check your internet connection</li>
            <li>Try refreshing the page</li>
            <li>Check browser console for more details</li>
          </ul>
        </div>
      </div>
    </div>
  );
  
  if (!client || !call) return null;

  return (
    <StreamVideo client={client}>
      <StreamTheme>
        <StreamCall call={call}>
          <div className="h-full w-full flex flex-col bg-gradient-to-br from-gray-900 to-gray-800">
            <div className="flex-1 overflow-hidden relative">
              <SpeakerLayout />
              {/* Transcription will be shown by Stream SDK when enabled */}
            </div>
            <div className="bg-gray-900/50 backdrop-blur-sm border-t border-gray-700/50">
              <CallControls />
            </div>
          </div>
        </StreamCall>
      </StreamTheme>
    </StreamVideo>
  );
};

export default VideoCall;
