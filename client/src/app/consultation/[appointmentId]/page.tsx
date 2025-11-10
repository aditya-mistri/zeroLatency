"use client";

import { useParams } from "next/navigation";
import { useEffect } from "react";
import dynamic from "next/dynamic";

const ChatRoom = dynamic(() => import("@/components/appointments/ChatRoom"), { ssr: false });

export default function ConsultationPage() {
  const params = useParams();
  const appointmentId = params?.appointmentId as string;

  useEffect(() => {
    if (appointmentId) {
      document.title = `Consultation Room - ${appointmentId}`;
    }

    // Prevent accidental closure
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [appointmentId]);

  if (!appointmentId) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-900">Loading consultation room...</p>
        </div>
      </div>
    );
  }

  // Get user role from localStorage (set during login)
  const userStr = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
  const user = userStr ? JSON.parse(userStr) : null;
  const userRole = user?.role || 'PATIENT';

  return (
    <ChatRoom
      appointmentId={appointmentId}
      userRole={userRole as "PATIENT" | "DOCTOR"}
      onClose={() => {
        if (window.confirm("Are you sure you want to leave the consultation room?")) {
          window.close();
        }
      }}
    />
  );
}
