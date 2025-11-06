import { DoctorProfile, Hospital } from "@/types/auth";

export interface ModeratorStats {
  doctors: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    approvalRate: string;
  };
  hospitals: {
    total: number;
  };
  patients: {
    total: number;
  };
  recent: {
    applications: number;
  };
}

export interface DoctorWithDetails extends DoctorProfile {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    avatar?: string;
    createdAt: string;
  };
  hospital?: Hospital;
  verificationDocs?: VerificationDoc[];
}

export interface VerificationDoc {
  id: string;
  docType: string;
  fileName: string;
  fileUrl: string;
  status: string;
  uploadedAt: string;
  reviewedAt?: string;
}

export interface HospitalWithStats extends Hospital {
  doctors?: DoctorProfile[];
  _count?: {
    doctors: number;
  };
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
