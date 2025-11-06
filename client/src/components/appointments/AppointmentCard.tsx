"use client";

import React, { useState } from "react";
import { Appointment } from "@/lib/appointment-api";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
} from "lucide-react";

interface AppointmentCardProps {
  appointment: Appointment;
  userRole: "PATIENT" | "DOCTOR";
  onStatusUpdate?: (appointmentId: string, status: string) => Promise<void>;
  onCancel?: (appointmentId: string, reason?: string) => Promise<void>;
}

export default function AppointmentCard({
  appointment,
  userRole,
  onStatusUpdate,
  onCancel,
}: AppointmentCardProps) {
  const [loading, setLoading] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const getStatusColor = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "CONFIRMED":
        return "bg-green-50 text-green-700 border-green-200";
      case "IN_PROGRESS":
        return "bg-yellow-50 text-yellow-700 border-yellow-200";
      case "COMPLETED":
        return "bg-gray-50 text-gray-700 border-gray-200";
      case "CANCELLED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <Calendar className="h-4 w-4" />;
      case "CONFIRMED":
        return <CheckCircle className="h-4 w-4" />;
      case "IN_PROGRESS":
        return <Play className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!onStatusUpdate) return;

    setLoading(true);
    try {
      await onStatusUpdate(appointment.id, newStatus);
    } catch (error) {
      console.error("Failed to update status:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!onCancel) return;

    setLoading(true);
    try {
      await onCancel(appointment.id, cancelReason);
      setShowCancelModal(false);
    } catch (error) {
      console.error("Failed to cancel appointment:", error);
    } finally {
      setLoading(false);
    }
  };

  const { date, time } = formatDateTime(appointment.scheduledAt);
  const otherParty =
    userRole === "PATIENT" ? appointment.doctor : appointment.patient;
  const isUpcoming = new Date(appointment.scheduledAt) > new Date();
  const canModify =
    isUpcoming && ["SCHEDULED", "CONFIRMED"].includes(appointment.status);

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(appointment.status)}`}
            >
              {getStatusIcon(appointment.status)}
              <span className="ml-1">
                {appointment.status.replace("_", " ")}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              #{appointment.id.slice(-8)}
            </div>
          </div>

          <div className="flex items-center text-green-600 font-medium">
            <DollarSign className="h-4 w-4 mr-1" />${appointment.amount}
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center space-x-4 mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center text-gray-700">
            <Calendar className="h-5 w-5 mr-2 text-blue-600" />
            <span className="font-medium">{date}</span>
          </div>
          <div className="flex items-center text-gray-700">
            <Clock className="h-5 w-5 mr-2 text-blue-600" />
            <span>{time}</span>
            <span className="ml-1 text-gray-500">
              ({appointment.duration} min)
            </span>
          </div>
        </div>

        {/* Other Party Info */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-gray-400" />
              <div>
                <p className="font-medium text-gray-900">
                  {userRole === "PATIENT"
                    ? `Dr. ${otherParty.firstName} ${otherParty.lastName}`
                    : `${otherParty.firstName} ${otherParty.lastName}`}
                </p>
                {userRole === "PATIENT" && appointment.doctor.doctorProfile && (
                  <p className="text-sm text-gray-500">
                    {appointment.doctor.doctorProfile.specialization}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Mail className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">{otherParty.email}</span>
          </div>

          {userRole === "DOCTOR" && appointment.patient.phone && (
            <div className="flex items-center space-x-3">
              <Phone className="h-5 w-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {appointment.patient.phone}
              </span>
            </div>
          )}

          {userRole === "PATIENT" &&
            appointment.doctor.doctorProfile?.hospital && (
              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {appointment.doctor.doctorProfile.hospital.name}
                </span>
              </div>
            )}
        </div>

        {/* Notes */}
        {appointment.notes && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Notes:</span> {appointment.notes}
            </p>
          </div>
        )}

        {/* Actions */}
        {canModify && (
          <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
            {userRole === "DOCTOR" && appointment.status === "SCHEDULED" && (
              <button
                onClick={() => handleStatusUpdate("CONFIRMED")}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                Confirm
              </button>
            )}

            {appointment.status === "CONFIRMED" && (
              <button
                onClick={() => handleStatusUpdate("IN_PROGRESS")}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Start Consultation
              </button>
            )}

            <button
              onClick={() => setShowCancelModal(true)}
              disabled={loading}
              className="px-4 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Payment Status */}
        <div className="mt-4 pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-500">Payment Status:</span>
            <span
              className={`font-medium ${
                appointment.paymentStatus === "COMPLETED"
                  ? "text-green-600"
                  : appointment.paymentStatus === "FAILED"
                    ? "text-red-600"
                    : "text-yellow-600"
              }`}
            >
              {appointment.paymentStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Cancel Appointment
            </h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel this appointment? Please provide a
              reason:
            </p>

            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              className="w-full p-3 border border-gray-300 rounded-lg mb-4 resize-none"
              rows={3}
            />

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? "Cancelling..." : "Cancel Appointment"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
