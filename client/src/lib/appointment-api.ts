import { config } from "./config";

export interface Doctor {
  id: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
  specialization: string;
  experience: number;
  qualification: string;
  bio?: string;
  consultationFee: number;
  hospital?: {
    id: string;
    name: string;
    city: string;
    state: string;
    address?: string;
    phone?: string;
    website?: string;
  };
}

export interface Appointment {
  id: string;
  scheduledAt: string;
  duration: number;
  status: "SCHEDULED" | "CONFIRMED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  notes?: string;
  amount: number;
  paymentStatus: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    doctorProfile: {
      specialization: string;
      consultationFee: number;
      hospital?: {
        name: string;
        address: string;
      };
    };
  };
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
}

export interface TimeSlot {
  time: string;
  displayTime: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  status: "success" | "error";
  message: string;
  data?: T;
  timestamp: string;
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${config.api.baseUrl}${endpoint}`;
  const token = localStorage.getItem("authToken");

  console.log(`API Request: ${options.method || "GET"} ${url}`);
  console.log(`Auth token: ${token ? "Present" : "Missing"}`);

  const config_req: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config_req);
  const data = await response.json();

  if (!response.ok) {
    console.error(`API Error: ${response.status} ${response.statusText}`, data);
    throw new Error(
      data.message || `Request failed with status ${response.status}`
    );
  }

  return data;
}

export const appointmentApi = {
  // Get approved doctors
  getDoctors: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    specialization?: string;
    city?: string;
    minFee?: number;
    maxFee?: number;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<
    ApiResponse<{ doctors: Doctor[]; pagination: PaginationInfo }>
  > => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString());
      });
    }
    return apiRequest(`/doctors?${searchParams}`);
  },

  // Get doctor by ID
  getDoctorById: async (
    doctorId: string
  ): Promise<ApiResponse<{ doctor: Doctor }>> => {
    return apiRequest(`/doctors/${doctorId}`);
  },

  // Get specializations
  getSpecializations: async (): Promise<
    ApiResponse<{ specializations: string[] }>
  > => {
    return apiRequest("/doctors/meta/specializations");
  },

  // Get doctor availability
  getDoctorAvailability: async (
    doctorId: string,
    date: string
  ): Promise<
    ApiResponse<{
      date: string;
      availableSlots: TimeSlot[];
      doctor: {
        name: string;
        specialization: string;
        consultationFee: number;
      };
    }>
  > => {
    return apiRequest(`/appointments/availability/${doctorId}?date=${date}`);
  },

  // Book appointment
  createAppointment: async (data: {
    doctorId: string;
    scheduledAt: string;
    notes?: string;
    duration?: number;
  }): Promise<ApiResponse<{ appointment: Appointment }>> => {
    return apiRequest("/appointments", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  // Get appointments for current user
  getAppointments: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    upcoming?: boolean;
  }): Promise<
    ApiResponse<{ appointments: Appointment[]; pagination: PaginationInfo }>
  > => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString());
      });
    }
    return apiRequest(`/appointments?${searchParams}`);
  },

  // Get appointment by ID
  getAppointmentById: async (
    appointmentId: string
  ): Promise<ApiResponse<{ appointment: Appointment }>> => {
    return apiRequest(`/appointments/${appointmentId}`);
  },

  // Update appointment status
  updateAppointmentStatus: async (
    appointmentId: string,
    status: string,
    notes?: string
  ) => {
    return apiRequest(`/appointments/${appointmentId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, notes }),
    });
  },

  // Cancel appointment
  cancelAppointment: async (appointmentId: string, reason?: string) => {
    return apiRequest(`/appointments/${appointmentId}/cancel`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  },
};
