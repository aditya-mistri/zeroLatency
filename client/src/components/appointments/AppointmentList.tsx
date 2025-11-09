"use client";

import React, { useState, useEffect, useCallback } from "react";
import { appointmentApi, Appointment } from "@/lib/appointment-api";
import { useAuth } from "@/lib/auth-context";
import AppointmentCard from "./AppointmentCard";
import { Filter, Calendar, Clock, AlertCircle, RefreshCw } from "lucide-react";

interface AppointmentListProps {
  userRole: "PATIENT" | "DOCTOR";
}

export default function AppointmentList({ userRole }: AppointmentListProps) {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<{
    status: string;
    upcoming: boolean;
  }>({
    status: "ALL",
    upcoming: false,
  });

  const statusOptions = [
    { value: "ALL", label: "All Appointments" },
    ...(userRole === "PATIENT"
      ? [{ value: "PAYMENT_PENDING", label: "Payment Pending" }]
      : []),
    { value: "SCHEDULED", label: "Scheduled" },
    { value: "CONFIRMED", label: "Confirmed" },
    { value: "IN_PROGRESS", label: "In Progress" },
    { value: "COMPLETED", label: "Completed" },
    { value: "CANCELLED", label: "Cancelled" },
  ];

  const fetchAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: {
        status?: string;
        upcoming?: boolean;
        limit?: number;
      } = {
        limit: 100  // Fetch up to 100 appointments to avoid pagination issues
      };
      if (filter.status !== "ALL") {
        params.status = filter.status;
      }
      if (filter.upcoming) {
        params.upcoming = true;
      }

      const response = await appointmentApi.getAppointments(params);
      setAppointments(response.data?.appointments || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load appointments"
      );
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user, filter, fetchAppointments]);

  const handleStatusUpdate = async (appointmentId: string, status: string) => {
    try {
      await appointmentApi.updateAppointmentStatus(appointmentId, status);
      // Refresh appointments after status update
      await fetchAppointments();
    } catch {
      throw new Error("Failed to update appointment status");
    }
  };

  const handleCancel = async (appointmentId: string, reason?: string) => {
    try {
      await appointmentApi.cancelAppointment(appointmentId, reason);
      // Refresh appointments after cancellation
      await fetchAppointments();
    } catch {
      throw new Error("Failed to cancel appointment");
    }
  };

  const getFilterStats = () => {
    const total = appointments.length;
    const upcoming = appointments.filter(
      (apt) =>
        new Date(apt.scheduledAt) > new Date() &&
        ["SCHEDULED", "CONFIRMED"].includes(apt.status)
    ).length;
    const completed = appointments.filter(
      (apt) => apt.status === "COMPLETED"
    ).length;

    return { total, upcoming, completed };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading appointments...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to Load Appointments
        </h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchAppointments}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </button>
      </div>
    );
  }

  const stats = getFilterStats();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-blue-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Total Appointments</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.total}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-green-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Upcoming</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.upcoming}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Calendar className="h-5 w-5 text-gray-600 mr-3" />
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-semibold text-gray-900">
                {stats.completed}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filter.status}
              onChange={(e) =>
                setFilter((prev) => ({ ...prev, status: e.target.value }))
              }
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <label className="flex items-center space-x-2 text-sm text-gray-600">
              <input
                type="checkbox"
                checked={filter.upcoming}
                onChange={(e) =>
                  setFilter((prev) => ({ ...prev, upcoming: e.target.checked }))
                }
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Upcoming only</span>
            </label>
          </div>

          <button
            onClick={fetchAppointments}
            className="inline-flex items-center px-3 py-2 text-gray-600 hover:text-blue-600 transition-colors"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Appointments List */}
      {appointments.length === 0 ? (
        <div className="text-center py-12">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Appointments Found
          </h3>
          <p className="text-gray-600 mb-4">
            {filter.status !== "ALL" || filter.upcoming
              ? "No appointments match your current filters."
              : `You don't have any appointments yet.`}
          </p>
          {filter.status !== "ALL" || filter.upcoming ? (
            <button
              onClick={() => setFilter({ status: "ALL", upcoming: false })}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <AppointmentCard
              key={appointment.id}
              appointment={appointment}
              userRole={userRole}
              onStatusUpdate={handleStatusUpdate}
              onCancel={handleCancel}
            />
          ))}
        </div>
      )}
    </div>
  );
}
