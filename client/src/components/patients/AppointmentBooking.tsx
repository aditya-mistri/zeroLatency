"use client";

import React, { useState, useEffect } from "react";
import { appointmentApi, Doctor, TimeSlot } from "@/lib/appointment-api";
import { useAuth } from "@/lib/auth-context";
import { ArrowLeft, Calendar, Clock, DollarSign, MapPin } from "lucide-react";

interface AppointmentBookingProps {
  doctor: Doctor;
  onBack: () => void;
  onBookingSuccess: () => void;
}

export default function AppointmentBooking({
  doctor,
  onBack,
  onBookingSuccess,
}: AppointmentBookingProps) {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate next 7 days for date selection
  const getNext7Days = () => {
    const days = [];
    for (let i = 1; i <= 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push({
        value: date.toISOString().split("T")[0],
        label: date.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
        fullDate: date.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      });
    }
    return days;
  };

  const availableDates = getNext7Days();

  // Fetch available slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      setError(null);
      const response = await appointmentApi.getDoctorAvailability(
        doctor.id,
        selectedDate
      );

      if (response.status === "success" && response.data) {
        setAvailableSlots(response.data.availableSlots);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch available slots"
      );
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!user) {
      setError("Please log in to book an appointment");
      return;
    }

    if (!selectedDate || !selectedTime) {
      setError("Please select both date and time");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const scheduledAt = new Date(`${selectedDate}T${selectedTime}`);

      const response = await appointmentApi.createAppointment({
        doctorId: doctor.id,
        scheduledAt: scheduledAt.toISOString(),
        notes: notes.trim() || undefined,
        duration: 30,
      });

      if (response.status === "success") {
        onBookingSuccess();
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to book appointment";
      if (
        errorMessage.includes("token") ||
        errorMessage.includes("authentication")
      ) {
        setError("Please log in again to book an appointment");
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center mb-6">
        <button
          onClick={onBack}
          className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          Back to doctors
        </button>
        <h2 className="text-2xl font-bold text-gray-900">Book Appointment</h2>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Doctor Info */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Doctor Information</h3>

          <div className="flex items-start space-x-4 mb-4">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
              {doctor.user.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={doctor.user.avatar}
                  alt={`Dr. ${doctor.user.firstName} ${doctor.user.lastName}`}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="text-2xl font-semibold text-blue-600">
                  {doctor.user.firstName[0]}
                  {doctor.user.lastName[0]}
                </span>
              )}
            </div>
            <div>
              <h4 className="text-xl font-semibold text-gray-900">
                Dr. {doctor.user.firstName} {doctor.user.lastName}
              </h4>
              <p className="text-blue-600 font-medium">
                {doctor.specialization}
              </p>
              <p className="text-gray-600">
                {doctor.experience} years experience
              </p>
              <p className="text-gray-600">{doctor.qualification}</p>
            </div>
          </div>

          {doctor.hospital && (
            <div className="flex items-center space-x-2 mb-4 text-gray-600">
              <MapPin className="h-4 w-4" />
              <div>
                <p className="font-medium">{doctor.hospital.name}</p>
                <p className="text-sm">
                  {doctor.hospital.city}, {doctor.hospital.state}
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center space-x-2 mb-4">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span className="text-xl font-semibold text-green-600">
              ₹{doctor.consultationFee}
            </span>
            <span className="text-gray-600">consultation fee</span>
          </div>

          {doctor.bio && (
            <div className="mt-4">
              <h5 className="font-medium text-gray-900 mb-2">About</h5>
              <p className="text-gray-600 text-sm">{doctor.bio}</p>
            </div>
          )}
        </div>

        {/* Booking Form */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Select Date & Time</h3>

          {/* Date Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              <Calendar className="h-4 w-4 inline mr-1" />
              Select Date
            </label>
            <div className="grid grid-cols-1 gap-2">
              {availableDates.map((date) => (
                <button
                  key={date.value}
                  onClick={() => {
                    setSelectedDate(date.value);
                    setSelectedTime(""); // Reset time selection
                  }}
                  className={`p-3 text-left border rounded-lg transition-colors ${
                    selectedDate === date.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <div className="font-medium">{date.label}</div>
                  <div className="text-sm text-gray-600">{date.fullDate}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Time Selection */}
          {selectedDate && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                <Clock className="h-4 w-4 inline mr-1" />
                Available Time Slots
              </label>

              {loadingSlots ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-gray-600">Loading slots...</span>
                </div>
              ) : availableSlots.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {availableSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() =>
                        setSelectedTime(
                          new Date(slot.time).toTimeString().slice(0, 5)
                        )
                      }
                      className={`p-3 text-center border rounded-lg transition-colors ${
                        selectedTime ===
                        new Date(slot.time).toTimeString().slice(0, 5)
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 hover:border-gray-400"
                      }`}
                    >
                      {slot.displayTime}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No available slots for this date</p>
                  <p className="text-sm">Please select another date</p>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Describe your symptoms or reason for consultation..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {/* Booking Summary */}
          {selectedDate && selectedTime && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">
                Booking Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Date:</span>
                  <span className="font-medium">
                    {
                      availableDates.find((d) => d.value === selectedDate)
                        ?.fullDate
                    }
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time:</span>
                  <span className="font-medium">
                    {new Date(`2000-01-01T${selectedTime}`).toLocaleTimeString(
                      "en-US",
                      {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      }
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">30 minutes</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Consultation Fee:</span>
                  <span className="font-semibold text-green-600">
                    ₹{doctor.consultationFee}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Book Button */}
          <button
            onClick={handleBookAppointment}
            disabled={!user || !selectedDate || !selectedTime || loading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              user && selectedDate && selectedTime && !loading
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-300 text-gray-500 cursor-not-allowed"
            }`}
          >
            {!user ? (
              "Please Log In to Book Appointment"
            ) : loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Booking Appointment...
              </div>
            ) : (
              "Book Appointment"
            )}
          </button>

          <p className="text-xs text-gray-500 text-center mt-3">
            By booking, you agree to our terms and conditions. You can cancel up
            to 2 hours before the appointment.
          </p>
        </div>
      </div>
    </div>
  );
}
