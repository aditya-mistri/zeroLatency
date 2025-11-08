import React, { useState, useEffect } from "react";
import { Calendar, Clock, Save, Trash2, AlertCircle, Copy } from "lucide-react";
import { toast } from "react-hot-toast";
import { config } from "@/lib/config";
import { getCurrentISTDate, formatISTDate } from "@/lib/timezone-utils";

interface DaySchedule {
  date: string;
  dayName: string;
  fullDate: string;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isSet: boolean;
}

interface AvailabilityResponse {
  date: string;
  slots: Array<{
    startTime: string;
    endTime: string;
    slotDurationMinutes: number;
  }>;
}

const AvailabilityManager: React.FC = () => {
  const [schedules, setSchedules] = useState<Record<string, DaySchedule>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [clearing, setClearing] = useState<Record<string, boolean>>({});
  const [next7Days, setNext7Days] = useState<DaySchedule[]>([]);

  // Generate next 7 days starting from today in IST
  const getNext7Days = () => {
    const days = [];
    const todayIST = getCurrentISTDate(); // Get today's date in IST
    const todayDate = new Date(todayIST);

    for (let i = 0; i < 7; i++) {
      const date = new Date(todayDate);
      date.setDate(todayDate.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      
      const formatted = formatISTDate(dateStr);

      days.push({
        date: dateStr,
        dayName: formatted.dayOfWeek,
        fullDate: formatted.long,
        startTime: "09:00",
        endTime: "17:00",
        slotDurationMinutes: 30,
        isSet: false,
      });
    }
    return days;
  };

  // Initialize on mount
  useEffect(() => {
    const days = getNext7Days();
    setNext7Days(days);

    // Initialize schedules with default values
    const initialSchedules: Record<string, DaySchedule> = {};
    days.forEach((day) => {
      initialSchedules[day.date] = day;
    });
    setSchedules(initialSchedules);

    // Fetch saved availabilities
    fetchDoctorAvailabilities();
  }, []); // Run once on mount

  const fetchDoctorAvailabilities = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${config.api.baseUrl}/availability/doctor`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const availabilities = data.data?.availabilities || [];

        console.log("Fetched availabilities:", availabilities); // Debug log

        // Update schedules with fetched data
        setSchedules((prev) => {
          const updated = { ...prev };
          availabilities.forEach((av: AvailabilityResponse) => {
            // Check if date exists in our schedule
            if (updated[av.date] && av.slots && av.slots.length > 0) {
              const slot = av.slots[0]; // Take first slot
              console.log("Processing slot:", slot); // Debug log

              updated[av.date] = {
                ...updated[av.date],
                startTime: slot.startTime,
                endTime: slot.endTime,
                slotDurationMinutes: slot.slotDurationMinutes, // Backend now returns this correctly
                isSet: true,
              };
            }
          });
          console.log("Updated schedules:", updated); // Debug log
          return updated;
        });
      } else {
        console.error("Failed to fetch availabilities:", response.status);
        toast.error("Failed to load availabilities");
      }
    } catch (error) {
      console.error("Error fetching availabilities:", error);
      toast.error("Failed to load availabilities");
    } finally {
      setLoading(false);
    }
  };

  const updateSchedule = (
    date: string,
    field: keyof DaySchedule,
    value: string | number | boolean
  ) => {
    setSchedules((prev) => ({
      ...prev,
      [date]: {
        ...prev[date],
        [field]: value,
      },
    }));
  };

  const saveAvailability = async (date: string) => {
    const schedule = schedules[date];
    if (!schedule) return;

    if (schedule.startTime >= schedule.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    setSaving((prev) => ({ ...prev, [date]: true }));
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${config.api.baseUrl}/availability/set`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: date,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          slotDuration: schedule.slotDurationMinutes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save availability");
      }

      setSchedules((prev) => ({
        ...prev,
        [date]: {
          ...prev[date],
          isSet: true,
        },
      }));

      toast.success(`Availability saved for ${schedule.dayName}`);
    } catch (error) {
      console.error("Error saving availability:", error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to save: ${msg}`);
    } finally {
      setSaving((prev) => ({ ...prev, [date]: false }));
    }
  };

  const clearAvailability = async (date: string) => {
    console.log("🗑️ Frontend - Clearing availability for date:", date);

    setClearing((prev) => ({ ...prev, [date]: true }));

    try {
      const token = localStorage.getItem("authToken");

      if (!token) {
        toast.error("Please log in to clear availability");
        return;
      }

      console.log(
        "🗑️ Frontend - Making DELETE request to:",
        `${config.api.baseUrl}/availability/clear/${date}`
      );

      const response = await fetch(
        `${config.api.baseUrl}/availability/clear/${date}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      console.log("🗑️ Frontend - Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("🗑️ Frontend - Error response:", errorData);
        throw new Error(errorData.message || "Failed to clear availability");
      }

      const responseData = await response.json();
      console.log("🗑️ Frontend - Success response:", responseData);

      // Reset to default values
      const defaultDay = next7Days.find((d) => d.date === date);
      if (defaultDay) {
        console.log("🗑️ Frontend - Resetting to default:", defaultDay);
        setSchedules((prev) => ({
          ...prev,
          [date]: defaultDay,
        }));
      }

      // Refresh data from backend to ensure consistency
      console.log("🗑️ Frontend - Refreshing availabilities from backend");
      await fetchDoctorAvailabilities();

      toast.success("Availability cleared successfully");
    } catch (error) {
      console.error("❌ Frontend - Error clearing availability:", error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to clear: ${msg}`);
    } finally {
      setClearing((prev) => ({ ...prev, [date]: false }));
    }
  };

  const copyToAllDays = (date: string) => {
    const sourceSchedule = schedules[date];
    if (!sourceSchedule) return;

    setSchedules((prev) => {
      const updated = { ...prev };
      Object.keys(updated).forEach((key) => {
        if (key !== date) {
          updated[key] = {
            ...updated[key],
            startTime: sourceSchedule.startTime,
            endTime: sourceSchedule.endTime,
            slotDurationMinutes: sourceSchedule.slotDurationMinutes,
          };
        }
      });
      return updated;
    });
    toast.success("Schedule copied to all days");
  };

  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
        options.push(time);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading availabilities...</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Weekly Availability
            </h1>
          </div>
          <p className="text-gray-600">
            Set your working hours for each day. Patients can book appointments
            during these times.
          </p>
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <Clock className="inline h-4 w-4 mr-1" />
              All times are in <strong>Indian Standard Time (IST)</strong>
            </p>
          </div>
        </div>

        <div className="p-6">
          {Object.keys(schedules).length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Loading schedule...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {next7Days.map((day) => {
                const schedule = schedules[day.date];
                if (!schedule) return null;

                return (
                  <div
                    key={day.date}
                    className={`border rounded-lg p-5 transition-all ${
                      schedule.isSet
                        ? "border-green-300 bg-green-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      {/* Day Info */}
                      <div className="md:w-48">
                        <h3 className="font-semibold text-gray-900">
                          {schedule.dayName}
                        </h3>
                        <p className="text-sm text-gray-500">{day.date}</p>
                        {schedule.isSet && (
                          <span className="inline-block mt-1 text-xs bg-green-600 text-white px-2 py-1 rounded">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Time Inputs */}
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Start Time
                          </label>
                          <select
                            value={schedule.startTime}
                            onChange={(e) =>
                              updateSchedule(
                                day.date,
                                "startTime",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {timeOptions.map((time) => (
                              <option
                                key={`start-${time}`}
                                value={time}
                                className="text-gray-900"
                              >
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            End Time
                          </label>
                          <select
                            value={schedule.endTime}
                            onChange={(e) =>
                              updateSchedule(
                                day.date,
                                "endTime",
                                e.target.value
                              )
                            }
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            {timeOptions.map((time) => (
                              <option
                                key={`end-${time}`}
                                value={time}
                                className="text-gray-900"
                              >
                                {time}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Slot Duration
                          </label>
                          <select
                            value={schedule.slotDurationMinutes}
                            onChange={(e) =>
                              updateSchedule(
                                day.date,
                                "slotDurationMinutes",
                                parseInt(e.target.value)
                              )
                            }
                            className="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value={15} className="text-gray-900">
                              15 minutes
                            </option>
                            <option value={30} className="text-gray-900">
                              30 minutes
                            </option>
                            <option value={45} className="text-gray-900">
                              45 minutes
                            </option>
                            <option value={60} className="text-gray-900">
                              60 minutes
                            </option>
                          </select>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => saveAvailability(day.date)}
                          disabled={saving[day.date]}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                          <Save className="h-4 w-4" />
                          {saving[day.date] ? "Saving..." : "Save"}
                        </button>

                        {schedule.isSet && (
                          <button
                            onClick={() => {
                              console.log(
                                "🗑️ Delete button clicked for:",
                                day.date
                              );
                              clearAvailability(day.date);
                            }}
                            disabled={clearing[day.date]}
                            className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            title="Clear availability"
                          >
                            {clearing[day.date] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        )}

                        <button
                          onClick={() => copyToAllDays(day.date)}
                          className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                          title="Copy to all days"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <Clock className="inline h-4 w-4 mr-1" />
                        {schedule.startTime} - {schedule.endTime} (
                        {schedule.slotDurationMinutes} min slots)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AvailabilityManager;
