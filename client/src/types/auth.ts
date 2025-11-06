export enum UserRole {
  PATIENT = "PATIENT",
  DOCTOR = "DOCTOR",
  MODERATOR = "MODERATOR",
}

export enum DoctorStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  doctorProfile?: DoctorProfile;
}

export interface DoctorProfile {
  id: string;
  userId: string;
  specialization: string;
  experience: number;
  qualification: string;
  bio?: string;
  consultationFee: number;
  status: DoctorStatus;
  hospitalId?: string;
  hospital?: Hospital;
  availableSlots?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email?: string;
  website?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: UserRole;
  // Doctor-specific
  specialization?: string;
  experience?: number;
  qualification?: string;
  consultationFee?: number;
  // Patient-specific
  dateOfBirth?: string;
  gender?: string;
  address?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  status: "success" | "error";
  message: string;
  data?: {
    user: User;
    token: string;
  };
  timestamp: string;
}
