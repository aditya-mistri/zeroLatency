"use client";

import { useState } from "react";
import { UserRole } from "@/types/auth";
import { useAuth } from "@/lib/auth-context";
import { Eye, EyeOff, User, UserPlus, Shield, Upload, FileText } from "lucide-react";
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

  const [licenseFile, setLicenseFile] = useState<File | null>(null);
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
      if (mode === "login") {
        await login(formData.email, formData.password);
      } else {
        // For doctor registration with file upload
        if (formData.role === UserRole.DOCTOR) {
          // Create FormData for multipart/form-data
          const formDataToSend = new FormData();
          formDataToSend.append("email", formData.email);
          formDataToSend.append("password", formData.password);
          formDataToSend.append("firstName", formData.firstName);
          formDataToSend.append("lastName", formData.lastName);
          formDataToSend.append("role", formData.role);
          
          if (formData.phone) formDataToSend.append("phone", formData.phone);
          formDataToSend.append("specialization", formData.specialization);
          formDataToSend.append("experience", formData.experience);
          formDataToSend.append("qualification", formData.qualification);
          formDataToSend.append("consultationFee", formData.consultationFee);
          
          // Add license file if provided
          if (licenseFile) {
            formDataToSend.append("license", licenseFile);
          }

          // Call register with FormData
          await register(formDataToSend);
        } else {
          // Regular JSON registration for patients/moderators
          const registerData = {
            email: formData.email,
            password: formData.password,
            firstName: formData.firstName,
            lastName: formData.lastName,
            phone: formData.phone || undefined,
            role: formData.role,
          };

          // Add patient-specific fields
          if (formData.role === UserRole.PATIENT) {
            Object.assign(registerData, {
              dateOfBirth: formData.dateOfBirth || undefined,
              gender: formData.gender || undefined,
              address: formData.address || undefined,
            });
          }

          await register(registerData);
        }
      }
      // If we get here, success - no error to set
    } catch (err: unknown) {
      // Extract the error message from the API error
      let errorMessage = "An error occurred";
      
      if (err && typeof err === "object" && "message" in err) {
        errorMessage = String(err.message);
      } else if (typeof err === "string") {
        errorMessage = err;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDoctor = formData.role === UserRole.DOCTOR;
  const isPatient = formData.role === UserRole.PATIENT;

  return (
    <div className="modal-container modal-content w-full max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
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
              minLength={mode === "register" ? 8 : undefined}
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
          {mode === "register" && (
            <p className="mt-1 text-xs text-gray-500">
              Must be at least 8 characters with uppercase, lowercase, and number
            </p>
          )}
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
                      Consultation Fee (₹)
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

                {/* Medical License Upload */}
                <div>
                  <label
                    htmlFor="license"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    Medical License / Degree Certificate <span className="text-red-500">*</span>
                  </label>
                  <div className="mt-1 flex items-center gap-3">
                    <label
                      htmlFor="license"
                      className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border-2 border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-500 transition-all duration-200"
                    >
                      <Upload className="h-5 w-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">
                        {licenseFile ? "Change File" : "Upload License"}
                      </span>
                    </label>
                    <input
                      type="file"
                      id="license"
                      name="license"
                      accept="image/*,.pdf"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Validate file size (5MB max)
                          if (file.size > 5 * 1024 * 1024) {
                            setError("File size must be less than 5MB");
                            e.target.value = "";
                            return;
                          }
                          setLicenseFile(file);
                          setError("");
                        }
                      }}
                      required
                      className="hidden"
                    />
                    {licenseFile && (
                      <div className="flex items-center gap-2 flex-1 min-w-0 px-3 py-2 bg-green-50 border border-green-200 rounded-lg">
                        <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                        <span className="text-sm text-green-700 truncate">
                          {licenseFile.name}
                        </span>
                        <span className="text-xs text-green-600 ml-auto flex-shrink-0">
                          {(licenseFile.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Upload your medical license or degree certificate (JPG, PNG, or PDF, max 5MB)
                  </p>
                  <p className="mt-1 text-xs text-yellow-600">
                    Your account will be reviewed by our moderators before approval
                  </p>
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
