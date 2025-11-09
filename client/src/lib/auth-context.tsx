"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, RegisterData } from "@/types/auth";
import { authApi, tokenStorage } from "@/lib/api";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const initialize = async () => {
      try {
        if (tokenStorage.isValid()) {
          await refreshUser();
        }
      } catch (error) {
        console.error("Failed to initialize auth:", error);
        tokenStorage.remove();
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await authApi.login({ email, password });

      if (response.status === "success" && response.data) {
        tokenStorage.set(response.data.token);
        setUser(response.data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Login failed:", error);
      // Re-throw the error so the component can catch and display it
      throw error;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      const response = await authApi.register(userData);

      if (response.status === "success" && response.data) {
        tokenStorage.set(response.data.token);
        setUser(response.data.user);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Registration failed:", error);
      // Re-throw the error so the component can catch and display it
      throw error;
    }
  };

  const logout = () => {
    tokenStorage.remove();
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getProfile();

      if (response.status === "success" && response.data) {
        setUser(response.data.user);
      }
    } catch (error) {
      console.error("Failed to refresh user:", error);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
