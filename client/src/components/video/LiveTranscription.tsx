"use client";
import React, { useEffect, useState, useRef } from "react";
import { Mic, MicOff, Languages, Download, Trash2 } from "lucide-react";
import type { Channel } from "stream-chat";

interface TranscriptEntry {
  id: string;
  speaker: string;
  speakerId: string;
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

interface LiveTranscriptionProps {
  userId: string;
  userName: string;
  language?: string;
  channel: Channel; // Stream Chat channel for sharing transcripts
}

export const LiveTranscription: React.FC<LiveTranscriptionProps> = ({
  userId,
  userName,
  language = "en-US",
  channel,
}) => {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(language);
  const [isSupported, setIsSupported] = useState(true);
  const [interimTranscript, setInterimTranscript] = useState("");

  const recognitionRef = useRef<any>(null);
  const transcriptEndRef = useRef<HTMLDivElement>(null);
  const isListeningRef = useRef(false); // Track listening state with ref
  const lastSentRef = useRef<number>(0);
  const pendingSendRef = useRef<number | null>(null);
  const channelRef = useRef<null | { cid?: string; sendMessage?: (...args: any[]) => Promise<any> }>(null);

  // keep a ref to the latest channel to avoid closing over stale channel in callbacks
  useEffect(() => {
    channelRef.current = channel as any;
  }, [channel]);

  // Helper to send transcription with simple throttling and channel readiness checks
  const sendTranscription = React.useCallback(async (text: string) => {
    const ch = channelRef.current;
    if (!ch || !ch.cid) {
      console.warn("[LiveTranscription] Channel not ready, skipping transcription send");
      return;
    }

    // Avoid sending empty/whitespace messages
    if (!text || !text.trim()) return;

    const now = Date.now();
    const minInterval = 800; // ms

    const doSend = async () => {
      try {
        // Send transcription WITHOUT any customType markers - this is a separate channel
        const payload = { text };
        // use ch.sendMessage if available
        if (typeof ch.sendMessage === "function") {
          await ch.sendMessage(payload);
        } else {
          // fallback to channel variable if shape differs
          await channel?.sendMessage(payload as any);
        }
        lastSentRef.current = Date.now();
      } catch (err) {
        console.error("[LiveTranscription] sendMessage error:", err);
      }
    };

    // If last send was recent, schedule a delayed send to avoid spam
    if (now - lastSentRef.current < minInterval) {
      const wait = minInterval - (now - lastSentRef.current);
      if (pendingSendRef.current) {
        clearTimeout(pendingSendRef.current);
      }
      // schedule a single consolidated send
      pendingSendRef.current = window.setTimeout(() => {
        doSend();
        pendingSendRef.current = null;
      }, wait);
    } else {
      await doSend();
    }
  }, []);

  // Debug: Log component mount
  useEffect(() => {
    console.log("[LiveTranscription] Component mounted");
  }, [userId, userName, channel]);

  // Listen for incoming transcription messages from other participants
  useEffect(() => {
    if (!channel) return;

    const handleNewMessage = (event: any) => {
      const message = event.message;
      
      // Process ALL messages from OTHER users in this transcript-only channel
      if (message?.user?.id !== userId) {
        const newEntry: TranscriptEntry = {
          id: message.id,
          speaker: message.user?.name || "Other User",
          speakerId: message.user?.id || "unknown",
          text: message.text || "",
          timestamp: new Date(message.created_at),
          isFinal: true,
        };
        
        setTranscripts((prev) => {
          // Avoid duplicates
          if (prev.some((t) => t.id === newEntry.id)) return prev;
          return [...prev, newEntry];
        });
      }
    };

    channel.on("message.new", handleNewMessage);

    return () => {
      channel.off("message.new", handleNewMessage);
    };
  }, [channel, userId]);

  // Check browser support
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
    }
  }, []);

  // Initialize speech recognition
  useEffect(() => {
    if (!isSupported) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = selectedLanguage;
    recognition.maxAlternatives = 1;

    recognition.onresult = async (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          final += transcript;
        } else {
          interim += transcript;
        }
      }

      if (final) {
        // Send transcription to other participants via Stream Chat
        try {
          await sendTranscription(final);
        } catch (error) {
          console.error("[LiveTranscription] Failed to schedule transcription send:", error);
        }

        setInterimTranscript("");
      } else if (interim) {
        setInterimTranscript(interim);
      }
    };

    recognition.onstart = () => {
      console.log("[LiveTranscription] Microphone active");
    };

    recognition.onerror = (event: any) => {
      console.error("[LiveTranscription] Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        // Restart if no speech detected
        if (isListeningRef.current) {
          recognition.start();
        }
      } else if (event.error === "not-allowed") {
        console.error("[LiveTranscription] Microphone permission denied!");
        setIsListening(false);
        isListeningRef.current = false;
      }
    };

    recognition.onend = () => {
      // Check if we should be listening using the ref
      if (isListeningRef.current) {
        try {
          setTimeout(() => {
            try {
              if (recognitionRef.current && isListeningRef.current) {
                recognitionRef.current.start();
              }
            } catch (e) {
              console.error("[LiveTranscription] Failed to restart:", e);
            }
          }, 100); // Small delay before restarting
        } catch (e) {
          console.error("[LiveTranscription] Failed to restart:", e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }
      // Clear any pending send timer on cleanup
      if (pendingSendRef.current) {
        clearTimeout(pendingSendRef.current);
        pendingSendRef.current = null;
      }
    };
  }, [isSupported, selectedLanguage, userName, channel, userId]); // Removed isListening from dependencies!

  

  // Auto-scroll to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts, interimTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      isListeningRef.current = false; // Update ref first
      recognitionRef.current.stop();
      setIsListening(false);
      setInterimTranscript("");
    } else {
      try {
        isListeningRef.current = true; // Update ref first
        setIsListening(true);
        recognitionRef.current.start();
      } catch (e) {
        console.error("[LiveTranscription] Failed to start:", e);
        isListeningRef.current = false;
        setIsListening(false);
      }
    }
  };

  const clearTranscripts = () => {
    setTranscripts([]);
    setInterimTranscript("");
  };

  const downloadTranscript = () => {
    const content = transcripts
      .map((t) => {
        const time = t.timestamp.toLocaleTimeString();
        return `[${time}] ${t.speaker}: ${t.text}`;
      })
      .join("\n\n");

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consultation-transcript-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const changeLanguage = (lang: string) => {
    const wasListening = isListening;
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }
    setSelectedLanguage(lang);
    
    // Restart with new language if was listening
    setTimeout(() => {
      if (wasListening && recognitionRef.current) {
        try {
          recognitionRef.current.lang = lang;
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.error("Failed to restart with new language:", e);
        }
      }
    }, 500);
  };

  if (!isSupported) {
    return (
      <div className="h-full flex items-center justify-center p-4 bg-gray-50">
        <div className="text-center">
          <MicOff className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-sm text-gray-600">
            Speech recognition is not supported in this browser.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Please use Chrome, Edge, or Safari for live transcription.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-gray-600" />
          <h3 className="font-semibold text-sm">Live Transcription</h3>
          <span className="text-xs text-gray-500">(Other participant&apos;s speech)</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => changeLanguage(e.target.value)}
            className="text-xs px-2 py-1 border rounded bg-white"
            disabled={isListening}
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK)</option>
            <option value="en-IN">English (India)</option>
            <option value="hi-IN">Hindi (हिन्दी)</option>
          </select>

          {/* Download Button */}
          <button
            onClick={downloadTranscript}
            disabled={transcripts.length === 0}
            className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-50"
            title="Download transcript"
          >
            <Download className="w-4 h-4" />
          </button>

          {/* Clear Button */}
          <button
            onClick={clearTranscripts}
            disabled={transcripts.length === 0}
            className="p-1.5 hover:bg-gray-200 rounded disabled:opacity-50"
            title="Clear transcripts"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {/* Toggle Listening */}
          <button
            onClick={toggleListening}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${
              isListening
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-3 h-3 inline mr-1" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-3 h-3 inline mr-1" />
                Start
              </>
            )}
          </button>
        </div>
      </div>

      {/* Transcripts List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {transcripts.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <Languages className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Waiting for other participant to speak...</p>
            <p className="text-xs mt-1">
              Click &quot;Start&quot; to enable your microphone and send transcription
            </p>
            <p className="text-xs mt-1 text-gray-500">
              You will see what the other person is saying here
            </p>
          </div>
        )}

        {transcripts.map((entry) => (
          <div key={entry.id} className="flex gap-3">
            <div className="text-xs text-gray-500 whitespace-nowrap">
              {entry.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-700">
                {entry.speaker}
              </div>
              <div className="text-sm text-gray-900 mt-0.5">{entry.text}</div>
            </div>
          </div>
        ))}

        <div ref={transcriptEndRef} />
      </div>

      {/* Status Footer */}
      <div className="p-2 border-t bg-gray-50 text-xs text-gray-600 flex items-center justify-between">
        <span>
          {isListening ? (
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Microphone active - Sending your speech to other participant
            </span>
          ) : (
            "Microphone off - Click Start to share your speech"
          )}
        </span>
        <span>{transcripts.length} received</span>
      </div>
    </div>
  );
};

export default LiveTranscription;
