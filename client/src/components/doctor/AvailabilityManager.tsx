import React, { useState, useEffect } from "react";
import { Calendar, Clock, Plus, Save, Trash2, AlertCircle } from "lucide-react";
import { toast } from "react-hot-toast";
import { config } from "@/lib/config";

interface TimeSlot {
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
}

interface DayAvailability {
  date: string;
  slots: TimeSlot[];
}

const AvailabilityManager: React.FC = () => {
  const [availabilities, setAvailabilities] = useState<DayAvailability[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [currentSlot, setCurrentSlot] = useState<TimeSlot>({
    startTime: "09:00",
    endTime: "17:00",
    slotDurationMinutes: 30,
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Generate next 7 days starting from today
  const getNext7Days = () => {
    const days = [];
    const today = new Date();

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push({
        date: date.toISOString().split("T")[0],
        dayName: date.toLocaleDateString("en-US", { weekday: "long" }),
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

  const next7Days = getNext7Days();

  useEffect(() => {
    fetchDoctorAvailabilities();
  }, []);

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
        setAvailabilities(data.data?.availabilities || []);
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

  const addTimeSlot = () => {
    if (!selectedDate) {
      toast.error("Please select a date first");
      return;
    }

    if (currentSlot.startTime >= currentSlot.endTime) {
      toast.error("End time must be after start time");
      return;
    }

    const existingDayIndex = availabilities.findIndex(
      (av) => av.date === selectedDate
    );

    if (existingDayIndex >= 0) {
      // Replace existing availability for this day
      const updatedAvailabilities = [...availabilities];
      updatedAvailabilities[existingDayIndex] = {
        date: selectedDate,
        slots: [{ ...currentSlot }],
      };
      setAvailabilities(updatedAvailabilities);
      toast.success("Availability updated for this date");
    } else {
      // Create new day
      setAvailabilities([
        ...availabilities,
        {
          date: selectedDate,
          slots: [{ ...currentSlot }],
        },
      ]);
      toast.success("Availability added for this date");
    }
  };

  const removeTimeSlot = (date: string, slotIndex: number) => {
    const updatedAvailabilities = availabilities
      .map((av) => {
        if (av.date === date) {
          return {
            ...av,
            slots: av.slots.filter((_, index) => index !== slotIndex),
          };
        }
        return av;
      })
      .filter((av) => av.slots.length > 0); // Remove days with no slots

    setAvailabilities(updatedAvailabilities);
    toast.success("Time slot removed");
  };

  const saveAvailability = async (dayAvailability: DayAvailability) => {
    setSaving(true);
    try {
      const token = localStorage.getItem("authToken");

      // For now, take the first slot's time range and duration
      // In a more complex system, you'd want to handle multiple non-overlapping slots
      if (dayAvailability.slots.length === 0) {
        toast.error("No slots to save");
        return;
      }

      const firstSlot = dayAvailability.slots[0];
      const response = await fetch(`${config.api.baseUrl}/availability/set`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          date: dayAvailability.date,
          startTime: firstSlot.startTime,
          endTime: firstSlot.endTime,
          slotDuration: firstSlot.slotDurationMinutes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to save availability");
      }

      toast.success(`Availability saved for ${dayAvailability.date}`);
      // Refresh the availability list after saving
      fetchDoctorAvailabilities();
    } catch (error) {
      console.error("Error saving availability:", error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to save availability: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const clearDayAvailability = async (date: string) => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${config.api.baseUrl}/availability/clear/${date}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to clear availability");
      }

      setAvailabilities(availabilities.filter((av) => av.date !== date));
      toast.success("Day availability cleared");
    } catch (error) {
      console.error("Error clearing availability:", error);
      const msg = error instanceof Error ? error.message : String(error);
      toast.error(`Failed to clear availability: ${msg}`);
    }
  };

  const getDayAvailability = (date: string) => {
    return availabilities.find((av) => av.date === date);
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <Calendar className="h-6 w-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">
              Manage Availability
            </h1>
          </div>
          <p className="text-gray-600">
            Set your availability for the next 7 days. Patients can only book
            appointments during these times.
          </p>
        </div>

        {/* Add New Time Slot */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Set Daily Availability
          </h2>

          <div className="grid md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Date
              </label>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose a date</option>
                {next7Days.map((day) => (
                  <option key={day.date} value={day.date}>
                    {day.dayName} ({day.date})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <select
                value={currentSlot.startTime}
                onChange={(e) =>
                  setCurrentSlot({ ...currentSlot, startTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <select
                value={currentSlot.endTime}
                onChange={(e) =>
                  setCurrentSlot({ ...currentSlot, endTime: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {timeOptions.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slot Duration (mins)
              </label>
              <select
                value={currentSlot.slotDurationMinutes}
                onChange={(e) =>
                  setCurrentSlot({
                    ...currentSlot,
                    slotDurationMinutes: parseInt(e.target.value),
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes</option>
              </select>
            </div>
          </div>

          <button
            onClick={addTimeSlot}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Set Availability
          </button>
        </div>

        {/* Current Availability */}
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Availability
          </h2>

          {next7Days.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">
                No dates available for scheduling.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {next7Days.map((day) => {
                const dayAvailability = getDayAvailability(day.date);

                return (
                  <div
                    key={day.date}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {day.fullDate}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {dayAvailability
                            ? `${dayAvailability.slots.length} time slot(s)`
                            : "No availability set"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {dayAvailability && (
                          <>
                            <button
                              onClick={() => saveAvailability(dayAvailability)}
                              disabled={saving}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                            >
                              <Save className="h-3 w-3" />
                              Save
                            </button>
                            <button
                              onClick={() => clearDayAvailability(day.date)}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
                            >
                              <Trash2 className="h-3 w-3" />
                              Clear
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {dayAvailability && dayAvailability.slots.length > 0 && (
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {dayAvailability.slots.map((slot, index) => (
                          <div
                            key={index}
                            className="bg-blue-50 border border-blue-200 rounded p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-blue-900">
                                  {slot.startTime} - {slot.endTime}
                                </p>
                                <p className="text-sm text-blue-700">
                                  {slot.slotDurationMinutes} min slots
                                </p>
                              </div>
                              <button
                                onClick={() => removeTimeSlot(day.date, index)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {!dayAvailability && (
                      <div className="text-center py-4 text-gray-500">
                        <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                        <p>No availability set for this day</p>
                      </div>
                    )}
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
