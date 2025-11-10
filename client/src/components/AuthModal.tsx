"use client";

import { useState } from "react";
import { X, User, UserPlus, Shield } from "lucide-react";
import { UserRole } from "@/types/auth";
import AuthForm from "./AuthForm";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const roleOptions = [
  {
    value: UserRole.PATIENT,
    label: "Patient",
    icon: User,
    description: "Book appointments and consult with verified doctors",
  },
  {
    value: UserRole.DOCTOR,
    label: "Doctor",
    icon: UserPlus,
    description: "Provide medical consultations to patients",
  },
  {
    value: UserRole.MODERATOR,
    label: "Moderator",
    icon: Shield,
    description: "Manage and verify doctors on the platform",
  },
];

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "register">("register");

  if (!isOpen) return null;

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  const handleToggleMode = () => {
    setAuthMode(authMode === "login" ? "register" : "login");
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 modal-backdrop transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="modal-container modal-content relative bg-white rounded-lg shadow-xl max-w-4xl w-full">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
          >
            <X className="h-6 w-6" />
          </button>

          {!selectedRole ? (
            // Role Selection View
            <div className="p-8">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                  Join ZeroLatency Connect
                </h2>
                <p className="text-gray-600">Choose your role to get started</p>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-8">
                {roleOptions.map((role) => {
                  const Icon = role.icon;
                  return (
                    <button
                      key={role.value}
                      onClick={() => handleRoleSelect(role.value)}
                      className="group relative p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left"
                    >
                      <div className="flex flex-col items-center text-center">
                        <div className="mb-4 p-4 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                          <Icon className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                          {role.label}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {role.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-center pt-6 border-t">
                <p className="text-gray-600 mb-4">Already have an account?</p>
                <button
                  onClick={() => {
                    setSelectedRole(UserRole.PATIENT);
                    setAuthMode("login");
                  }}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Sign in instead
                </button>
              </div>
            </div>
          ) : (
            // Auth Form View
            <div className="p-8">
              <button
                onClick={handleBack}
                className="mb-4 text-gray-600 hover:text-gray-900 flex items-center"
              >
                ← Back to role selection
              </button>

              <AuthForm
                mode={authMode}
                onToggle={handleToggleMode}
                initialRole={selectedRole}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
