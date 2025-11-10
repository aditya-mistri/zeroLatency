"use client";

import React, { useState, useEffect } from "react";
import { Appointment } from "@/lib/appointment-api";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Video,
  FileText,
} from "lucide-react";
import dynamic from "next/dynamic";
import { appointmentApi } from "@/lib/appointment-api";

const PrescriptionForm = dynamic(
  () => import("../prescriptions/PrescriptionForm"),
  { ssr: false }
);

interface AppointmentCardProps {
  appointment: Appointment;
  userRole: "PATIENT" | "DOCTOR";
  onStatusUpdate?: (appointmentId: string, status: string) => Promise<void>;
  onCancel?: (appointmentId: string, reason?: string) => Promise<void>;
}

interface JoinStatus {
  canJoin: boolean;
  reason?: string;
  timeUntilStart?: number;
  timeUntilEnd?: number;
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
  const [joinStatus, setJoinStatus] = useState<JoinStatus | null>(null);
  const [timeDisplay, setTimeDisplay] = useState<string>("");
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  useEffect(() => {
    const checkJoinStatus = async () => {
      try {
        const response = await appointmentApi.canJoinAppointment(
          appointment.id
        );
        if (response.data) {
          console.log(
            "Join Status for",
            appointment.id.slice(-8),
            ":",
            response.data
          );
          setJoinStatus(response.data);
        }
      } catch (error) {
        console.error("Error checking join status:", error);
      }
    };

    // Check only once when component mounts or status changes
    checkJoinStatus();
  }, [appointment.id, appointment.status]);
  useEffect(() => {
    const updateTimeDisplay = () => {
      if (!joinStatus) return;

      const now = new Date();
      const scheduledTime = new Date(appointment.scheduledAt);
      const endTime = new Date(
        scheduledTime.getTime() + appointment.duration * 60000
      );
      const bufferEndTime = new Date(endTime.getTime() + 5 * 60000);

      if (now < scheduledTime) {
        const minutesUntil = Math.ceil(
          (scheduledTime.getTime() - now.getTime()) / 60000
        );
        if (minutesUntil <= 5) {
          setTimeDisplay(
            `Starts in ${minutesUntil} minute${minutesUntil !== 1 ? "s" : ""}`
          );
        } else {
          setTimeDisplay("");
        }
      } else if (now >= scheduledTime && now <= endTime) {
        const minutesRemaining = Math.ceil(
          (endTime.getTime() - now.getTime()) / 60000
        );
        setTimeDisplay(
          `${minutesRemaining} minute${minutesRemaining !== 1 ? "s" : ""} remaining`
        );
      } else if (now > endTime && now <= bufferEndTime) {
        setTimeDisplay("Consultation ending soon");
      } else {
        setTimeDisplay("");
      }
    };

    // Calculate time display once when joinStatus changes or component mounts
    updateTimeDisplay();
  }, [joinStatus, appointment.scheduledAt, appointment.duration]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAYMENT_PENDING":
        return "bg-orange-50 text-orange-700 border-orange-200";
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
      case "PAYMENT_PENDING":
        return <span className="text-base">₹</span>;
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
    const dateFormatted = date.toLocaleDateString("en-US", {
      timeZone: "Asia/Kolkata",
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const timeFormatted = date.toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    return {
      date: dateFormatted,
      time: `${timeFormatted} IST`,
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

  // Determine if join button should be shown
  const showJoinButton =
    joinStatus?.canJoin &&
    ["CONFIRMED", "IN_PROGRESS"].includes(appointment.status);

  console.log(
    "Appointment",
    appointment.id.slice(-8),
    "showJoinButton:",
    showJoinButton,
    "joinStatus:",
    joinStatus,
    "status:",
    appointment.status
  );

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
            ₹{appointment.amount}
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

        {/* Time Status Display */}
        {timeDisplay && showJoinButton && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-blue-600 mr-2" />
              <p className="text-sm font-medium text-blue-800">{timeDisplay}</p>
            </div>
          </div>
        )}

        {/* Cannot Join Message */}
        {!joinStatus?.canJoin &&
          joinStatus?.reason &&
          ["CONFIRMED", "IN_PROGRESS"].includes(appointment.status) && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-2" />
                <p className="text-sm text-amber-800">{joinStatus.reason}</p>
              </div>
            </div>
          )}

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

        {/* Payment Pending Message */}
        {appointment.status === "PAYMENT_PENDING" && (
          <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="flex items-center">
              <div>
                <p className="text-sm font-medium text-orange-800">
                  Payment Required
                </p>
                <p className="text-xs text-orange-700">
                  {userRole === "PATIENT"
                    ? "Complete your payment to confirm this appointment"
                    : "Appointment will be visible once patient completes payment"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-100">
          {/* Join Consultation button - show for IN_PROGRESS appointments within time window */}
          {showJoinButton && (
            <button
              onClick={() => {
                // Open consultation room in a new tab
                window.open(
                  `/consultation/${appointment.id}`,
                  '_blank',
                  'noopener,noreferrer'
                );
              }}
              className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-2"
            >
              <Video className="h-4 w-4" />
              Join Consultation
            </button>
          )}

          {canModify && (
            <>
              {/* Pay Now button for PAYMENT_PENDING appointments */}
              {userRole === "PATIENT" &&
                appointment.status === "PAYMENT_PENDING" &&
                appointment.paymentStatus === "PENDING" && (
                  <button
                    onClick={() =>
                      (window.location.href = `/payment/${appointment.id}`)
                    }
                    disabled={loading}
                    className="px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors flex items-center"
                  >
                    Pay Now (₹{appointment.amount})
                  </button>
                )}

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

              {/* Don't allow cancellation for PAYMENT_PENDING with COMPLETED payment */}
              {!(
                appointment.status === "PAYMENT_PENDING" &&
                appointment.paymentStatus === "COMPLETED"
              ) && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  disabled={loading}
                  className="px-4 py-2 bg-red-100 text-red-700 text-sm rounded-lg hover:bg-red-200 disabled:opacity-50 transition-colors"
                >
                  Cancel
                </button>
              )}
            </>
          )}
        </div>

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

        {/* Prescription Button for In Progress and Completed Consultations */}
        {(appointment.status === "IN_PROGRESS" ||
          appointment.status === "COMPLETED") &&
          userRole === "DOCTOR" && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <button
                onClick={() => setShowPrescriptionForm(true)}
                className="w-full px-4 py-3 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {appointment.status === "IN_PROGRESS"
                  ? "Add/Edit Prescription (Draft)"
                  : "Create/View Prescription"}
              </button>
            </div>
          )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="modal-content bg-white rounded-lg max-w-md w-full p-6">
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

      {showPrescriptionForm && (
        <PrescriptionForm
          appointmentId={appointment.id}
          patientName={`${appointment.patient.firstName} ${appointment.patient.lastName}`}
          onClose={() => setShowPrescriptionForm(false)}
          onSuccess={() => {
            // Refresh appointment data or show success message
            alert("Prescription created successfully!");
          }}
        />
      )}
    </>
  );
}
