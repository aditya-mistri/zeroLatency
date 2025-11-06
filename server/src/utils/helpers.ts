import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { UserRole } from "@prisma/client";

// Generate JWT token
export const generateToken = (payload: {
  id: string;
  email: string;
  role: UserRole;
}): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || "7d";

  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  return jwt.sign(payload, jwtSecret, {
    expiresIn: jwtExpiresIn,
  } as jwt.SignOptions);
};

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
export const comparePassword = async (
  password: string,
  hashedPassword: string
): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

// Validate email format
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate password strength
export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

// Sanitize user data (remove sensitive fields)
export const sanitizeUser = (user: any) => {
  const { password, ...sanitizedUser } = user;
  return sanitizedUser;
};

// Generate random string for verification codes
export const generateRandomCode = (length: number = 6): string => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Format response for consistent API responses
export const formatResponse = (
  status: "success" | "error",
  message: string,
  data?: any
) => {
  return {
    status,
    message,
    ...(data && { data }),
    timestamp: new Date().toISOString(),
  };
};
