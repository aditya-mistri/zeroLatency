"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Lock,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Appointment, appointmentApi } from "@/lib/appointment-api";

interface PaymentResult {
  appointment: Appointment;
  paymentId: string;
}

interface PaymentFormProps {
  appointmentDetails: {
    id: string;
    doctorName: string;
    specialization: string;
    hospitalName?: string;
    scheduledAt: string;
    amount: number;
  };
  onPaymentSuccess: (paymentResult: PaymentResult) => void;
  onCancel: () => void;
}

export default function PaymentForm({
  appointmentDetails,
  onPaymentSuccess,
  onCancel,
}: PaymentFormProps) {
  const [paymentData, setPaymentData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
    cardholderName: "",
    paymentMethod: "card",
  });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const formatCardNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    // Add spaces every 4 digits
    const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
    return formatted;
  };

  const formatExpiryDate = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    // Add slash after 2 digits
    if (digits.length >= 2) {
      return digits.slice(0, 2) + "/" + digits.slice(2, 4);
    }
    return digits;
  };

  const handleInputChange = (field: string, value: string) => {
    let formattedValue = value;

    if (field === "cardNumber") {
      formattedValue = formatCardNumber(value);
      // Limit to 19 characters (16 digits + 3 spaces)
      if (formattedValue.length > 19) return;
    } else if (field === "expiryDate") {
      formattedValue = formatExpiryDate(value);
      // Limit to 5 characters (MM/YY)
      if (formattedValue.length > 5) return;
    } else if (field === "cvv") {
      // Only allow digits and limit to 4 characters
      formattedValue = value.replace(/\D/g, "").slice(0, 4);
    } else if (field === "cardholderName") {
      // Only allow letters and spaces
      formattedValue = value.replace(/[^a-zA-Z\s]/g, "").toUpperCase();
    }

    setPaymentData((prev) => ({
      ...prev,
      [field]: formattedValue,
    }));
  };

  const validateForm = () => {
    const { cardNumber, expiryDate, cvv, cardholderName } = paymentData;

    if (!cardholderName.trim()) {
      return "Cardholder name is required";
    }

    if (cardNumber.replace(/\s/g, "").length !== 16) {
      return "Please enter a valid 16-digit card number";
    }

    if (expiryDate.length !== 5 || !expiryDate.includes("/")) {
      return "Please enter a valid expiry date (MM/YY)";
    }

    if (cvv.length < 3) {
      return "Please enter a valid CVV";
    }
    const [month, year] = expiryDate.split("/");
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;

    if (parseInt(month) < 1 || parseInt(month) > 12) {
      return "Invalid expiry month";
    }

    if (
      parseInt(year) < currentYear ||
      (parseInt(year) === currentYear && parseInt(month) < currentMonth)
    ) {
      return "Card has expired";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setProcessing(true);

    try {
      const result = await appointmentApi.processPayment(
        appointmentDetails.id,
        {
          ...paymentData,
          cardNumber: paymentData.cardNumber.replace(/\s/g, ""), // Remove spaces for API
        }
      );
      interface GenericApiResult<TData = unknown> {
        status?: string;
        message?: string;
        data?: TData;
      }
      const typedResult = result as unknown as GenericApiResult<PaymentResult>;
      const status = typedResult.status || "error";
      const message = typedResult.message;
      const data = typedResult.data || ({} as PaymentResult);

      if (status === "success") {
        setSuccess(true);
        setTimeout(() => {
          onPaymentSuccess(data);
        }, 1500);
      } else {
        setError(message || "Payment failed. Please try again.");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setError("Network error. Please check your connection and try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">
            Payment Successful!
          </h2>
          <p className="text-green-700 mb-4">
            Your appointment has been confirmed and you will receive a
            confirmation email shortly.
          </p>
          <div className="animate-pulse text-blue-600">
            <Loader2 className="h-5 w-5 inline mr-2 animate-spin" />
            Redirecting...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      <div className="mb-6">
        <div className="flex items-center justify-center mb-4">
          <div className="bg-blue-100 p-3 rounded-full">
            <CreditCard className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Complete Payment
        </h2>
        <p className="text-gray-600 text-center text-sm">
          Secure payment powered by SSL encryption
        </p>
      </div>

      {/* Appointment Summary */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-gray-900 mb-2">
          Appointment Details
        </h3>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Doctor:</span>
            <span className="font-medium">{appointmentDetails.doctorName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Specialization:</span>
            <span className="font-medium">
              {appointmentDetails.specialization}
            </span>
          </div>
          {appointmentDetails.hospitalName && (
            <div className="flex justify-between">
              <span className="text-gray-600">Hospital:</span>
              <span className="font-medium">
                {appointmentDetails.hospitalName}
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Date & Time:</span>
            <span className="font-medium">
              {new Date(appointmentDetails.scheduledAt).toLocaleDateString()}{" "}
              {new Date(appointmentDetails.scheduledAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
          <div className="border-t pt-2 mt-2">
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-blue-600">
                ₹{appointmentDetails.amount}
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cardholder Name
          </label>
          <input
            type="text"
            value={paymentData.cardholderName}
            onChange={(e) =>
              handleInputChange("cardholderName", e.target.value)
            }
            placeholder="JOHN DOE"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Card Number
          </label>
          <input
            type="text"
            value={paymentData.cardNumber}
            onChange={(e) => handleInputChange("cardNumber", e.target.value)}
            placeholder="1234 5678 9012 3456"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="flex space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Expiry Date
            </label>
            <input
              type="text"
              value={paymentData.expiryDate}
              onChange={(e) => handleInputChange("expiryDate", e.target.value)}
              placeholder="MM/YY"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CVV
            </label>
            <input
              type="text"
              value={paymentData.cvv}
              onChange={(e) => handleInputChange("cvv", e.target.value)}
              placeholder="123"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Test Card Information */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="font-semibold text-blue-900 mb-2 text-sm">
            Test Cards:
          </h4>
          <div className="text-xs space-y-1 text-blue-800">
            <div>
              • <code>4242 4242 4242 4242</code> - Success
            </div>
            <div>
              • <code>4000 0000 0000 0000</code> - Insufficient funds
            </div>
            <div>
              • <code>4000 0000 0000 1111</code> - Invalid card
            </div>
            <div>
              • <code>4000 0000 0000 2222</code> - Expired card
            </div>
            <div className="text-blue-600 mt-1">
              Use any future date and CVV
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Shield className="h-4 w-4" />
          <span>Your payment information is secure and encrypted</span>
        </div>

        <div className="flex space-x-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={processing}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={processing}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-2" />
                Pay ₹{appointmentDetails.amount}
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
