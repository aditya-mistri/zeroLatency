import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import ClientProviders from "./client-providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZeroLatency Connect - Healthcare at Your Fingertips",
  description:
    "Connect with verified doctors for secure online consultations. Book appointments, video calls, and manage your health remotely.",
  keywords: [
    "telehealth",
    "online consultation",
    "doctors",
    "healthcare",
    "appointments",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} antialiased bg-gray-50`}>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
