"use client";

import { useState } from "react";
import { UserRole } from "@/types/auth";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, User, UserPlus, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthFormProps {
  mode: "login" | "register";
  onToggle: () => void;
  initialRole?: UserRole;
}

const roleOptions = [
  {
    value: UserRole.PATIENT,
    label: "Patient",
    icon: User,
    description: "Book appointments and consult doctors",
  },
  {
    value: UserRole.DOCTOR,
    label: "Doctor",
    icon: UserPlus,
    description: "Provide medical consultations",
  },
  {
    value: UserRole.MODERATOR,
    label: "Moderator",
    icon: Shield,
    description: "Manage platform and verify doctors",
  },
];

export default function AuthForm({
  mode,
  onToggle,
  initialRole,
}: AuthFormProps) {
  const { login, register, loading } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    role: initialRole || UserRole.PATIENT,
    // Doctor specific
    specialization: "",
    experience: "",
    qualification: "",
    consultationFee: "",
    // Patient specific
    dateOfBirth: "",
    gender: "",
    address: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError(""); // Clear error on input change
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      let success = false;

      if (mode === "login") {
        success = await login(formData.email, formData.password);
      } else {
        // Prepare registration data
        const registerData = {
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          role: formData.role,
        };

        // Add doctor-specific fields
        if (formData.role === UserRole.DOCTOR) {
          Object.assign(registerData, {
            specialization: formData.specialization,
            experience: parseInt(formData.experience),
            qualification: formData.qualification,
            consultationFee: parseFloat(formData.consultationFee),
          });
        }

        // Add patient-specific fields
        if (formData.role === UserRole.PATIENT) {
          Object.assign(registerData, {
            dateOfBirth: formData.dateOfBirth || undefined,
            gender: formData.gender || undefined,
            address: formData.address || undefined,
          });
        }

        success = await register(registerData);
      }

      if (!success) {
        setError(
          mode === "login" ? "Invalid email or password" : "Registration failed"
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDoctor = formData.role === UserRole.DOCTOR;
  const isPatient = formData.role === UserRole.PATIENT;

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          {mode === "login" ? "Welcome Back" : "Create Account"}
        </h2>
        <p className="text-gray-600 mt-2">
          {mode === "login"
            ? "Sign in to your account"
            : "Join ZeroLatency Connect"}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Role Selection - Only for registration */}
        {mode === "register" && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              I am joining as a
            </label>
            <div className="grid grid-cols-1 gap-2">
              {roleOptions.map((role) => {
                const Icon = role.icon;
                return (
                  <label
                    key={role.value}
                    className={cn(
                      "relative flex items-center p-3 border rounded-lg cursor-pointer transition-colors",
                      formData.role === role.value
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={role.value}
                      checked={formData.role === role.value}
                      onChange={handleChange}
                      className="sr-only"
                    />
                    <Icon className="h-5 w-5 text-gray-600 mr-3" />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        {role.label}
                      </div>
                      <div className="text-sm text-gray-500">
                        {role.description}
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Email */}
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700"
          >
            Email Address
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
            placeholder="your@email.com"
          />
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700"
          >
            Password
          </label>
          <div className="relative mt-1">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
              placeholder={
                mode === "register" ? "Min. 8 characters" : "Your password"
              }
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>

        {/* Registration Fields */}
        {mode === "register" && (
          <>
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="firstName"
                  className="block text-sm font-medium text-gray-700"
                >
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                />
              </div>
              <div>
                <label
                  htmlFor="lastName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-700"
              >
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            {/* Doctor Specific Fields */}
            {isDoctor && (
              <>
                <div>
                  <label
                    htmlFor="specialization"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Specialization
                  </label>
                  <input
                    type="text"
                    id="specialization"
                    name="specialization"
                    value={formData.specialization}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                    placeholder="e.g., Cardiology, Dermatology"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="experience"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      id="experience"
                      name="experience"
                      value={formData.experience}
                      onChange={handleChange}
                      required
                      min="0"
                      max="50"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="consultationFee"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Consultation Fee ($)
                    </label>
                    <input
                      type="number"
                      id="consultationFee"
                      name="consultationFee"
                      value={formData.consultationFee}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="qualification"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Qualification
                  </label>
                  <input
                    type="text"
                    id="qualification"
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                    placeholder="e.g., MD, MBBS, PhD"
                  />
                </div>
              </>
            )}

            {/* Patient Specific Fields */}
            {isPatient && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="dateOfBirth"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Date of Birth (Optional)
                    </label>
                    <input
                      type="date"
                      id="dateOfBirth"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="gender"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Gender (Optional)
                    </label>
                    <select
                      id="gender"
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="prefer_not_to_say">
                        Prefer not to say
                      </option>
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="address"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Address (Optional)
                  </label>
                  <textarea
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 placeholder-gray-400"
                    placeholder="Your address"
                  />
                </div>
              </>
            )}
          </>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || loading}
          className={cn(
            "w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white",
            "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
            isSubmitting || loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-600 hover:bg-blue-700"
          )}
        >
          {isSubmitting ? (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              {mode === "login" ? "Signing in..." : "Creating account..."}
            </div>
          ) : mode === "login" ? (
            "Sign In"
          ) : (
            "Create Account"
          )}
        </button>
      </form>

      {/* Toggle Mode */}
      <div className="mt-6 text-center">
        <button
          onClick={onToggle}
          className="text-sm text-blue-600 hover:text-blue-500"
        >
          {mode === "login" ? (
            <>
              Don&apos;t have an account?{" "}
              <span className="font-medium">Sign up</span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span className="font-medium">Sign in</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
