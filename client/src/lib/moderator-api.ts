import {
  ModeratorStats,
  DoctorWithDetails,
  HospitalWithStats,
  PaginationInfo,
  ApiResponse,
} from "@/types/moderator";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

// Generic API request function with auth
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem("authToken");

  const config: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
    ...options,
  };

  const response = await fetch(url, config);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
}

export const moderatorApi = {
  // Dashboard
  getDashboardStats: async (): Promise<
    ApiResponse<{ stats: ModeratorStats }>
  > => {
    return apiRequest("/moderator/dashboard/stats");
  },

  // Doctor Management
  getDoctors: async (params?: {
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<
    ApiResponse<{ doctors: DoctorWithDetails[]; pagination: PaginationInfo }>
  > => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString());
      });
    }
    return apiRequest(`/moderator/doctors?${searchParams}`);
  },

  getDoctorById: async (
    doctorId: string
  ): Promise<ApiResponse<{ doctor: DoctorWithDetails }>> => {
    return apiRequest(`/moderator/doctors/${doctorId}`);
  },

  approveDoctor: async (
    doctorId: string,
    data: { hospitalId?: string; notes?: string }
  ) => {
    return apiRequest(`/moderator/doctors/${doctorId}/approve`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  rejectDoctor: async (doctorId: string, reason: string) => {
    return apiRequest(`/moderator/doctors/${doctorId}/reject`, {
      method: "PUT",
      body: JSON.stringify({ reason }),
    });
  },

  updateDoctorProfile: async (
    doctorId: string,
    data: {
      specialization?: string;
      experience?: number;
      qualification?: string;
      consultationFee?: number;
      bio?: string;
      hospitalId?: string;
    }
  ) => {
    return apiRequest(`/moderator/doctors/${doctorId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // Hospital Management
  getHospitals: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<
    ApiResponse<{ hospitals: HospitalWithStats[]; pagination: PaginationInfo }>
  > => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, value.toString());
      });
    }
    return apiRequest(`/moderator/hospitals?${searchParams}`);
  },

  getHospitalById: async (
    hospitalId: string
  ): Promise<ApiResponse<{ hospital: HospitalWithStats }>> => {
    return apiRequest(`/moderator/hospitals/${hospitalId}`);
  },

  createHospital: async (data: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    email?: string;
    website?: string;
    description?: string;
  }) => {
    return apiRequest("/moderator/hospitals", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  updateHospital: async (
    hospitalId: string,
    data: {
      name?: string;
      address?: string;
      city?: string;
      state?: string;
      zipCode?: string;
      phone?: string;
      email?: string;
      website?: string;
      description?: string;
      isActive?: boolean;
    }
  ) => {
    return apiRequest(`/moderator/hospitals/${hospitalId}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  deleteHospital: async (hospitalId: string) => {
    return apiRequest(`/moderator/hospitals/${hospitalId}`, {
      method: "DELETE",
    });
  },

  getHospitalStats: async (hospitalId: string) => {
    return apiRequest(`/moderator/hospitals/${hospitalId}/stats`);
  },
};
