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
  userTokenEndpoint?: string; // defaults to /api/video/token (server origin)
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
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
          body: JSON.stringify({ appointmentId }),
        });
        const json: TokenResponse = await resp.json();
        if (!resp.ok) {
          throw new Error(json.message || "Failed to fetch video token");
        }
        if (!json.data) throw new Error("Malformed token response");

        const { apiKey, token: userToken, user, call: callInfo } = json.data;
        const videoClient = new StreamVideoClient({
          apiKey,
          user,
          token: userToken,
        });
        const c = videoClient.call(
          callInfo.type as "default" | string,
          callInfo.id
        );
        await c.join({ create: true });
        setClient(videoClient);
        setCall(c);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
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

  if (loading) return <div className="p-4 text-sm">Connecting to call...</div>;
  if (error) return <div className="p-4 text-red-600 text-sm">{error}</div>;
  if (!client || !call) return null;

  return (
    <StreamVideo client={client}>
      <StreamTheme>
        <StreamCall call={call}>
          <div className="border rounded-md overflow-hidden">
            <div className="h-[480px] bg-black/5">
              <SpeakerLayout />
              <div className="border-t">
                <CallControls />
              </div>
            </div>
          </div>
        </StreamCall>
      </StreamTheme>
    </StreamVideo>
  );
};

export default VideoCall;
