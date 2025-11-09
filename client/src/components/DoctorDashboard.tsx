"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import AppointmentList from "./appointments/AppointmentList";
import AvailabilityManager from "./doctor/AvailabilityManager";
import PatientRecords from "./doctor/PatientRecords";
import {
  Calendar,
  Users,
  Clock,
  Star,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";

type ViewState = "dashboard" | "appointments" | "availability" | "patientRecords";

export default function DoctorDashboard() {
  const { user, refreshUser } = useAuth();
  const [currentView, setCurrentView] = useState<ViewState>("dashboard");

  const getStatusInfo = () => {
    if (!user?.doctorProfile) return null;

    const status = user.doctorProfile.status;
    switch (status) {
      case "REJECTED":
        return {
          icon: XCircle,
          bgColor: "bg-red-50",
          borderColor: "border-red-200",
          textColor: "text-red-900",
          iconColor: "text-red-600",
          title: "Account Verification Failed",
          message:
            "Your account verification was rejected. Please contact support for more information or resubmit your credentials.",
          actionButton: (
            <button className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Contact Support
            </button>
          ),
        };
      case "PENDING":
        return {
          icon: AlertTriangle,
          bgColor: "bg-yellow-50",
          borderColor: "border-yellow-200",
          textColor: "text-yellow-900",
          iconColor: "text-yellow-600",
          title: "Pending Verification",
          message:
            "Your account is under review by our moderation team. You'll receive an email once your credentials are verified.",
          actionButton: (
            <button
              onClick={refreshUser}
              className="mt-3 px-4 py-2 text-sm bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
            >
              Refresh Status
            </button>
          ),
        };
      default:
        return null;
    }
  };

  const statusInfo = getStatusInfo();
  const isApproved = user?.doctorProfile?.status === "APPROVED";

  // Handle appointments view
  if (currentView === "appointments") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">My Appointments</h2>
          <button
            onClick={() => setCurrentView("dashboard")}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </button>
        </div>
        <AppointmentList userRole="DOCTOR" />
      </div>
    );
  }

  // Handle availability management view
  if (currentView === "availability") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">
            Manage Availability
          </h2>
          <button
            onClick={() => setCurrentView("dashboard")}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </button>
        </div>
        <AvailabilityManager />
      </div>
    );
  }

  // Handle patient records view
  if (currentView === "patientRecords") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Patient Records</h2>
          <button
            onClick={() => setCurrentView("dashboard")}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Back to Dashboard
          </button>
        </div>
        <PatientRecords />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Doctor Dashboard
        </h1>
        <p className="text-gray-600">
          {isApproved
            ? "Manage your appointments and consultations"
            : "Complete your verification to start practicing"}
        </p>
      </div>

      {/* Account Status */}
      {statusInfo && (
        <div
          className={`rounded-lg p-6 border ${statusInfo.bgColor} ${statusInfo.borderColor}`}
        >
          <div className="flex items-start space-x-4">
            <statusInfo.icon
              className={`h-8 w-8 ${statusInfo.iconColor} mt-1`}
            />
            <div className="flex-1">
              <h3 className={`font-semibold mb-2 ${statusInfo.textColor}`}>
                {statusInfo.title}
              </h3>
              <p className={`text-sm ${statusInfo.textColor} opacity-90 mb-3`}>
                {statusInfo.message}
              </p>

              {/* Doctor Profile Info for Approved */}
              {isApproved && user.doctorProfile && (
                <div className="grid md:grid-cols-2 gap-4 mt-4 p-4 bg-white bg-opacity-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">
                      Your Profile
                    </h4>
                    <div className="space-y-1 text-sm text-green-800">
                      <p>
                        <strong>Specialization:</strong>{" "}
                        {user.doctorProfile.specialization}
                      </p>
                      <p>
                        <strong>Experience:</strong>{" "}
                        {user.doctorProfile.experience} years
                      </p>
                      <p>
                        <strong>Qualification:</strong>{" "}
                        {user.doctorProfile.qualification}
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-green-900 mb-2">
                      Practice Details
                    </h4>
                    <div className="space-y-1 text-sm text-green-800">
                      <p>
                        <strong>Consultation Fee:</strong>
                        {user.doctorProfile.consultationFee}
                      </p>
                      {user.doctorProfile.hospital && (
                        <p>
                          <strong>Hospital:</strong>{" "}
                          {user.doctorProfile.hospital.name}
                        </p>
                      )}
                      <p>
                        <strong>Status:</strong>{" "}
                        <span className="font-semibold">Active & Verified</span>
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {statusInfo.actionButton}
            </div>
          </div>
        </div>
      )}

      {/* Dashboard Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Appointments Card */}
        <button
          onClick={() => isApproved && setCurrentView("appointments")}
          disabled={!isApproved}
          className={`bg-white p-6 rounded-lg shadow text-left ${!isApproved ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"} transition-shadow`}
        >
          <div className="flex items-center justify-between mb-4">
            <Calendar
              className={`h-8 w-8 ${isApproved ? "text-blue-600" : "text-gray-400"}`}
            />
            <div className="text-xs text-gray-500">
              {isApproved ? "Active" : "Requires Approval"}
            </div>
          </div>
          <h3
            className={`font-semibold mb-2 ${isApproved ? "text-gray-900" : "text-gray-500"}`}
          >
            My Appointments
          </h3>
          <p
            className={`text-sm ${isApproved ? "text-gray-600" : "text-gray-400"}`}
          >
            {isApproved
              ? "Manage your upcoming consultations"
              : "Available after verification"}
          </p>
        </button>

        {/* Patients Card */}
        <button
          onClick={() => isApproved && setCurrentView("patientRecords")}
          disabled={!isApproved}
          className={`bg-white p-6 rounded-lg shadow text-left ${!isApproved ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"} transition-shadow`}
        >
          <div className="flex items-center justify-between mb-4">
            <Users
              className={`h-8 w-8 ${isApproved ? "text-green-600" : "text-gray-400"}`}
            />
            <div className="text-xs text-gray-500">
              {isApproved ? "Active" : "Requires Approval"}
            </div>
          </div>
          <h3
            className={`font-semibold mb-2 ${isApproved ? "text-gray-900" : "text-gray-500"}`}
          >
            Patient Records
          </h3>
          <p
            className={`text-sm ${isApproved ? "text-gray-600" : "text-gray-400"}`}
          >
            {isApproved
              ? "View consultation history and prescriptions"
              : "Available after verification"}
          </p>
        </button>

        {/* Schedule Card */}
        <button
          onClick={() => setCurrentView("availability")}
          className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition-shadow text-left w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <Clock className="h-8 w-8 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">
            Schedule Management
          </h3>
          <p className="text-sm text-gray-600">
            Set your availability and time slots for the next 7 days
          </p>
        </button>

        {/* Reviews Card */}
        <div className="bg-white p-6 rounded-lg shadow opacity-75">
          <div className="flex items-center justify-between mb-4">
            <Star className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-500 mb-2">
            Reviews & Ratings
          </h3>
          <p className="text-sm text-gray-400">Patient feedback and ratings</p>
        </div>
      </div>

      {/* Features Overview */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📋 Doctor Features Status
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">
              Currently Available:
            </h4>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span
                  className={isApproved ? "text-gray-600" : "text-gray-400"}
                >
                  Profile verification & approval
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span
                  className={isApproved ? "text-gray-600" : "text-gray-400"}
                >
                  Hospital association
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span
                  className={isApproved ? "text-gray-600" : "text-gray-400"}
                >
                  Consultation fee setting
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span
                  className={isApproved ? "text-gray-600" : "text-gray-400"}
                >
                  Patient discovery (patients can find you)
                </span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span
                  className={isApproved ? "text-gray-600" : "text-gray-400"}
                >
                  Appointment management dashboard
                </span>
              </li>
            </ul>
          </div>
        </div>

        {!isApproved && (
          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h4 className="font-medium text-yellow-900 mb-2">
              Ready to Start Practicing?
            </h4>
            <p className="text-sm text-yellow-800">
              Once your account is verified, you&apos;ll be able to receive
              appointment bookings from patients, manage your schedule, and
              start conducting online consultations.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
