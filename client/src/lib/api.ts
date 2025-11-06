import { RegisterData, LoginData, AuthResponse } from "@/types/auth";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL;

class ApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Generic API request function
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

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(response.status, data.message || "Request failed");
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(500, "Network error occurred");
  }
}

// Authentication API functions
export const authApi = {
  // Register new user
  register: async (userData: RegisterData): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  },

  // Login user
  login: async (credentials: LoginData): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  },

  // Get current user profile
  getProfile: async (): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/auth/profile");
  },

  // Update user profile
  updateProfile: async (
    userData: Partial<RegisterData>
  ): Promise<AuthResponse> => {
    return apiRequest<AuthResponse>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(userData),
    });
  },
};

// Token management
export const tokenStorage = {
  set: (token: string): void => {
    localStorage.setItem("authToken", token);
  },

  get: (): string | null => {
    return localStorage.getItem("authToken");
  },

  remove: (): void => {
    localStorage.removeItem("authToken");
  },

  isValid: (): boolean => {
    const token = tokenStorage.get();
    if (!token) return false;

    try {
      // Basic JWT structure check
      const parts = token.split(".");
      if (parts.length !== 3) return false;

      // Decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const now = Math.floor(Date.now() / 1000);

      return payload.exp > now;
    } catch {
      return false;
    }
  },
};

export { ApiError };
