"use client";

import { AuthProvider } from "@/lib/auth-context";
import { SocketProvider } from "@/lib/socket-context";

interface ClientProvidersProps {
  children: React.ReactNode;
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <AuthProvider>
      <SocketProvider>{children}</SocketProvider>
    </AuthProvider>
  );
}
