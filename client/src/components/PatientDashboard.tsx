"use client";

import React, { useState } from "react";
import { Doctor } from "@/lib/appointment-api";
import DoctorDiscovery from "./patients/DoctorDiscovery";
import AppointmentBooking from "./patients/AppointmentBooking";
import AppointmentList from "./appointments/AppointmentList";
import { CalendarCheck, User, Clock } from "lucide-react";

type ViewState = "dashboard" | "findDoctors" | "booking" | "appointments";

export default function PatientDashboard() {
  const [currentView, setCurrentView] = useState<ViewState>("dashboard");
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  const handleSelectDoctor = (doctor: Doctor) => {
    setSelectedDoctor(doctor);
    setCurrentView("booking");
  };

  const handleBackToDoctors = () => {
    setSelectedDoctor(null);
    setCurrentView("findDoctors");
  };

  const handleBookingSuccess = () => {
    setCurrentView("appointments");
    setSelectedDoctor(null);
  };

  const handleBackToDashboard = () => {
    setCurrentView("dashboard");
    setSelectedDoctor(null);
  };

  if (currentView === "findDoctors") {
    return <DoctorDiscovery onSelectDoctor={handleSelectDoctor} />;
  }

  if (currentView === "booking" && selectedDoctor) {
    return (
      <AppointmentBooking
        doctor={selectedDoctor}
        onBack={handleBackToDoctors}
        onBookingSuccess={handleBookingSuccess}
      />
    );
  }

  if (currentView === "appointments") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
          <button
            onClick={handleBackToDashboard}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </button>
        </div>

        <AppointmentList userRole="patient" />
      </div>
    );
  }

  // Main dashboard view
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Patient Dashboard
        </h1>
        <p className="text-gray-600">Book appointments with verified doctors</p>
      </div>

      {/* Phase Progress */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900">Phase 1 ✅</h3>
          <p className="text-sm text-blue-700">Authentication & Roles</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium text-green-900">Phase 2 ✅</h3>
          <p className="text-sm text-green-700">Doctor Verification</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium text-blue-900">Phase 3 ✅</h3>
          <p className="text-sm text-blue-700">Appointment Booking</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        <button
          onClick={() => setCurrentView("findDoctors")}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <User className="h-8 w-8 text-blue-600" />
            <div className="text-xs text-gray-500">Action</div>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Find Doctors</h3>
          <p className="text-sm text-gray-600">
            Search and filter verified doctors by specialization
          </p>
        </button>

        <button
          onClick={() => setCurrentView("appointments")}
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow text-left group"
        >
          <div className="flex items-center justify-between mb-4">
            <CalendarCheck className="h-8 w-8 text-green-600" />
            <div className="text-xs text-gray-500">Coming Soon</div>
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">My Appointments</h3>
          <p className="text-sm text-gray-600">
            View and manage your upcoming appointments
          </p>
        </button>

        <div className="bg-white p-6 rounded-lg shadow opacity-75">
          <div className="flex items-center justify-between mb-4">
            <Clock className="h-8 w-8 text-gray-400" />
            <div className="text-xs text-gray-400">Phase 4</div>
          </div>
          <h3 className="font-semibold text-gray-500 mb-2">Medical History</h3>
          <p className="text-sm text-gray-400">
            Access your consultation records and prescriptions
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow opacity-75">
          <div className="flex items-center justify-between mb-4">
            <Clock className="h-8 w-8 text-gray-400" />
            <div className="text-xs text-gray-400">Phase 5</div>
          </div>
          <h3 className="font-semibold text-gray-500 mb-2">Video Calls</h3>
          <p className="text-sm text-gray-400">
            Join video consultations with your doctors
          </p>
        </div>
      </div>

      {/* Features Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          🎉 New in Phase 3: Appointment Booking
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Now Available:</h4>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>✅ Search verified doctors by specialization</li>
              <li>✅ Filter by location and consultation fee</li>
              <li>✅ View doctor profiles and experience</li>
              <li>✅ Check real-time availability</li>
              <li>✅ Book appointments instantly</li>
              <li>✅ 30-minute consultation slots</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Coming Next:</h4>
            <ul className="space-y-1 text-sm text-gray-400">
              <li>⏳ Payment integration</li>
              <li>⏳ Email confirmations</li>
              <li>⏳ Appointment reminders</li>
              <li>⏳ Consultation history</li>
              <li>⏳ Prescription management</li>
              <li>⏳ Video call integration</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
