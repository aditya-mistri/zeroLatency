"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/lib/auth-context";
import AuthForm from "@/components/AuthForm";
import {
  Heart,
  Video,
  Shield,
  Clock,
  Activity,
  Calendar,
  MessageCircle,
} from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (user) {
    return <Dashboard />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                ZeroLatency Health-Connect
              </span>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 hover:text-blue-600">
                Features
              </a>
              <a
                href="#how-it-works"
                className="text-gray-600 hover:text-blue-600"
              >
                How It Works
              </a>
              <a href="#about" className="text-gray-600 hover:text-blue-600">
                About
              </a>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between py-12 lg:py-20">
          <div className="lg:w-1/2 mb-8 lg:mb-0">
            <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
              Healthcare at Your
              <span className="text-blue-600"> Fingertips</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Connect with verified doctors instantly. Book appointments, join
              secure video consultations, and manage your health from anywhere,
              anytime.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <div className="flex items-center text-gray-600">
                <Shield className="h-5 w-5 text-green-500 mr-2" />
                Verified Doctors
              </div>
              <div className="flex items-center text-gray-600">
                <Video className="h-5 w-5 text-blue-500 mr-2" />
                Secure Video Calls
              </div>
              <div className="flex items-center text-gray-600">
                <Clock className="h-5 w-5 text-purple-500 mr-2" />
                24/7 Available
              </div>
            </div>

            <button
              onClick={() => setAuthMode("register")}
              className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Get Started Today
            </button>
          </div>

          <div className="lg:w-1/2 lg:pl-8">
            <AuthForm
              mode={authMode}
              onToggle={() =>
                setAuthMode(authMode === "login" ? "register" : "login")
              }
            />
          </div>
        </div>

        {/* Features Section */}
        <section id="features" className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              Why Choose ZeroLatency Connect?
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              We provide comprehensive ZeroLatency Health-Connect solutions for
              patients, doctors, and healthcare providers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <FeatureCard key={index} {...feature} />
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-16 bg-gray-50 rounded-2xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
              How It Works
            </h2>
            <p className="text-xl text-gray-600">
              Get started in just three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <StepCard key={index} {...step} />
            ))}
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="text-3xl lg:text-4xl font-bold text-blue-600 mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center mb-4">
            <Heart className="h-6 w-6 text-blue-400" />
            <span className="ml-2 text-lg font-semibold">
              ZeroLatency Connect
            </span>
          </div>
          <p className="text-gray-400">
            © 2024 ZeroLatency Connect. All rights reserved. Built with ❤️ for
            accessible healthcare.
          </p>
        </div>
      </footer>
    </div>
  );
}

// Dashboard component for authenticated users
function Dashboard() {
  const { user, logout, refreshUser } = useAuth();
  const [currentView, setCurrentView] = useState("dashboard");

  // Refresh user data when component mounts
  useEffect(() => {
    const refreshData = async () => {
      try {
        await refreshUser();
      } catch (error) {
        console.error("Failed to refresh user data:", error);
      }
    };

    refreshData();
  }, [refreshUser]);

  // Import moderator components dynamically
  const ModeratorDashboard = dynamic(
    () => import("@/components/moderator/ModeratorDashboard"),
    {
      loading: () => <div className="animate-pulse">Loading...</div>,
    }
  );

  const DoctorManagement = dynamic(
    () => import("@/components/moderator/DoctorManagement"),
    {
      loading: () => <div className="animate-pulse">Loading...</div>,
    }
  );

  const handleViewDoctor = (doctor: {
    user: { firstName: string; lastName: string };
  }) => {
    // Could open a modal or navigate to detail view
    alert(
      `Viewing doctor: Dr. ${doctor.user.firstName} ${doctor.user.lastName}`
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Heart className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">
                TeleHealth Connect
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {user?.firstName}!</span>
              <div className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                {user?.role}
              </div>
              <button
                onClick={logout}
                className="text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation for Moderators */}
      {user?.role === "MODERATOR" && (
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                onClick={() => setCurrentView("dashboard")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentView === "dashboard"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView("doctors")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentView === "doctors"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Doctor Management
              </button>
              <button
                onClick={() => setCurrentView("hospitals")}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentView === "hospitals"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                Hospitals
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user?.role === "MODERATOR" ? (
          // Moderator Interface
          <>
            {currentView === "dashboard" && <ModeratorDashboard />}
            {currentView === "doctors" && (
              <DoctorManagement onViewDoctor={handleViewDoctor} />
            )}
            {currentView === "hospitals" && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Hospital Management
                </h2>
                <p className="text-gray-600">
                  Hospital management interface coming soon...
                </p>
              </div>
            )}
          </>
        ) : (
          // Patient/Doctor Interface
          <div className="bg-white rounded-lg shadow p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {user?.role === "PATIENT"
                ? "Patient Dashboard"
                : "Doctor Dashboard"}
            </h1>
            <p className="text-gray-600 mb-6">
              Welcome to your dashboard! More features will be available in
              upcoming phases.
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-900">Phase 1 ✅</h3>
                <p className="text-sm text-blue-700">Authentication & Roles</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-medium text-green-900">Phase 2 ✅</h3>
                <p className="text-sm text-green-700">Doctor Verification</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-600">Phase 3 🚧</h3>
                <p className="text-sm text-gray-500">Appointment Booking</p>
              </div>
            </div>

            {user?.role === "DOCTOR" && (
              <div
                className={`mt-6 rounded-lg p-4 border ${
                  user.doctorProfile?.status === "APPROVED"
                    ? "bg-green-50 border-green-200"
                    : user.doctorProfile?.status === "REJECTED"
                      ? "bg-red-50 border-red-200"
                      : "bg-yellow-50 border-yellow-200"
                }`}
              >
                <h3
                  className={`font-medium mb-2 ${
                    user.doctorProfile?.status === "APPROVED"
                      ? "text-green-900"
                      : user.doctorProfile?.status === "REJECTED"
                        ? "text-red-900"
                        : "text-yellow-900"
                  }`}
                >
                  Account Status
                </h3>
                <p
                  className={`text-sm ${
                    user.doctorProfile?.status === "APPROVED"
                      ? "text-green-700"
                      : user.doctorProfile?.status === "REJECTED"
                        ? "text-red-700"
                        : "text-yellow-700"
                  }`}
                >
                  {user.doctorProfile?.status === "APPROVED"
                    ? "Your account has been approved! You can now start accepting appointments and conducting consultations."
                    : user.doctorProfile?.status === "REJECTED"
                      ? "Your account verification was rejected. Please contact support for more information."
                      : "Your account is pending verification by our moderation team. You&apos;ll receive an email once your credentials are reviewed."}
                </p>
                {user.doctorProfile?.status === "APPROVED" && (
                  <div className="mt-3 flex items-center space-x-4">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      ✓ Verified Doctor
                    </span>
                    {user.doctorProfile.hospital && (
                      <span className="text-xs text-green-600">
                        {user.doctorProfile.hospital.name}
                      </span>
                    )}
                  </div>
                )}
                {user.doctorProfile?.status === "PENDING" && (
                  <button
                    onClick={refreshUser}
                    className="mt-3 text-xs text-yellow-600 hover:text-yellow-800 underline"
                  >
                    Refresh Status
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

// Feature card component
interface FeatureCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <Icon className="h-10 w-10 text-blue-600 mb-4" />
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// Step card component
interface StepCardProps {
  number: number;
  title: string;
  description: string;
}

function StepCard({ number, title, description }: StepCardProps) {
  return (
    <div className="text-center">
      <div className="bg-blue-600 text-white w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
        {number}
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

// Data
const features = [
  {
    icon: Shield,
    title: "Verified Doctors",
    description:
      "All doctors are verified by our moderation team for credentials and authenticity.",
  },
  {
    icon: Video,
    title: "Secure Video Calls",
    description:
      "End-to-end encrypted video consultations with crystal clear quality.",
  },
  {
    icon: Calendar,
    title: "Easy Scheduling",
    description:
      "Book appointments at your convenience with real-time availability.",
  },
  {
    icon: MessageCircle,
    title: "Chat & Transcription",
    description:
      "In-call messaging and automatic transcription for your records.",
  },
  {
    icon: Activity,
    title: "Health Records",
    description:
      "Secure storage and management of your medical history and reports.",
  },
  {
    icon: Clock,
    title: "24/7 Support",
    description: "Round-the-clock technical support and emergency assistance.",
  },
];

const steps = [
  {
    number: 1,
    title: "Sign Up",
    description:
      "Create your account as a patient, doctor, or join our moderation team.",
  },
  {
    number: 2,
    title: "Find & Book",
    description:
      "Browse verified doctors, check availability, and book your appointment.",
  },
  {
    number: 3,
    title: "Consult & Care",
    description:
      "Join secure video consultations and receive quality healthcare.",
  },
];

const stats = [
  { value: "1000+", label: "Doctors" },
  { value: "50K+", label: "Patients" },
  { value: "100K+", label: "Consultations" },
  { value: "4.9★", label: "Rating" },
];
