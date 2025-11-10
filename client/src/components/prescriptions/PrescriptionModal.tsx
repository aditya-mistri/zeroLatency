"use client";

import React, { useEffect, useState } from "react";
import { X, Loader } from "lucide-react";
import PrescriptionView from "./PrescriptionView";

interface PrescriptionModalProps {
  appointmentId: string;
  onClose: () => void;
}

export default function PrescriptionModal({
  appointmentId,
  onClose,
}: PrescriptionModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prescriptionData, setPrescriptionData] = useState<any>(null);

  useEffect(() => {
    fetchPrescription();
  }, [appointmentId]);

  const fetchPrescription = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/appointments/${appointmentId}/prescription`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch prescription");
      }

      setPrescriptionData(data.data);
    } catch (error) {
      console.error("Error fetching prescription:", error);
      setError(error instanceof Error ? error.message : "Failed to load prescription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="modal-container modal-content bg-white rounded-lg w-full max-w-4xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="sticky top-4 left-full ml-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center p-12">
            <div className="text-center">
              <Loader className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-3" />
              <p className="text-gray-900">Loading prescription...</p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="p-12 text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800 font-medium mb-2">Failed to load prescription</p>
              <p className="text-red-600 text-sm">{error}</p>
              <button
                onClick={fetchPrescription}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* Prescription View */}
        {!loading && !error && prescriptionData && (
          <PrescriptionView
            prescription={prescriptionData.prescription}
            doctor={prescriptionData.appointment?.doctor}
            patient={prescriptionData.appointment?.patient}
            appointmentDate={prescriptionData.appointment?.scheduledAt}
          />
        )}
      </div>
    </div>
  );
}
