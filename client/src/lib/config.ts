/**
 * Configuration utility for environment variables
 */

export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
    timeout: 30000, // 30 seconds
  },

  // App Configuration
  app: {
    url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:5173",
    name: "ZeroLatency Connect",
    version: "2.0.0",
    environment: process.env.NODE_ENV || "development",
  },

  // Feature Flags
  features: {
    enableNotifications: true,
    enableFileUpload: false, // Will be enabled in next phase
    enableVideoCall: true, // Stream Video integration
  },

  // Pagination defaults
  pagination: {
    defaultLimit: 10,
    maxLimit: 100,
  },

  // File upload limits (for future implementation)
  fileUpload: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ["pdf", "jpg", "jpeg", "png", "doc", "docx"],
  },
};
export const isProduction = () => config.app.environment === "production";
export const isDevelopment = () => config.app.environment === "development";

export const getApiUrl = (endpoint: string = "") => {
  return `${config.api.baseUrl}${endpoint}`;
};

export const getAppUrl = (path: string = "") => {
  return `${config.app.url}${path}`;
};

export default config;
