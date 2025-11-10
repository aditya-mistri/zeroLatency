"use client";

import React, { useState, useEffect } from "react";
import { FileText, Calendar, User, Clock, Download, Eye } from "lucide-react";
import PrescriptionView from "../prescriptions/PrescriptionView";

interface Prescription {
  id: string;
  diagnosis: string;
  medications: Array<{
    name: string;
    dosage: string;
    frequency: string;
    duration: string;
  }>;
  labTests?: string;
  advice?: string;
  followUpDate?: string;
  createdAt: string;
}

interface Consultation {
  id: string;
  scheduledAt: string;
  duration: number;
  notes?: string;
  doctor: {
    id: string;
    firstName: string;
    lastName: string;
    doctorProfile?: {
      specialization: string;
      qualification: string;
      hospital?: {
        name: string;
      };
    };
  };
  sessionRecord?: {
    id: string;
    duration?: number;
    startedAt?: string;
    endedAt?: string;
    transcript?: string;
    summary?: string;
    prescription?: Prescription;
  };
}

export default function MedicalHistory() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<{
    prescription: Prescription;
    doctor: Consultation["doctor"];
    appointmentDate: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchMedicalHistory();
  }, []);

  const fetchMedicalHistory = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/medical-history`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.data) {
        setConsultations(data.data.consultations);
      }
    } catch (error) {
      console.error("Error fetching medical history:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      timeZone: "Asia/Kolkata",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const downloadTranscript = (consultation: Consultation) => {
    if (!consultation.sessionRecord?.transcript) {
      alert("No transcript available");
      return;
    }

    const element = document.createElement("a");
    const file = new Blob([consultation.sessionRecord.transcript], {
      type: "text/plain",
    });
    element.href = URL.createObjectURL(file);
    element.download = `consultation-transcript-${consultation.id.slice(-8)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filteredConsultations = consultations.filter((consultation) =>
    `${consultation.doctor.firstName} ${consultation.doctor.lastName} ${consultation.doctor.doctorProfile?.specialization || ""}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <input
          type="text"
          placeholder="Search by doctor name or specialization..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 font-medium">Total Consultations</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{consultations.length}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 font-medium">Prescriptions Received</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {consultations.filter((c) => c.sessionRecord?.prescription).length}
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600 font-medium">Doctors Consulted</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">
            {new Set(consultations.map((c) => c.doctor.id)).size}
          </p>
        </div>
      </div>

      {/* Consultations List */}
      {filteredConsultations.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? "No consultations found matching your search" : "No medical history found"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredConsultations.map((consultation) => (
            <div
              key={consultation.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      Dr. {consultation.doctor.firstName} {consultation.doctor.lastName}
                    </h3>
                    {consultation.doctor.doctorProfile && (
                      <>
                        <p className="text-sm text-gray-600">
                          {consultation.doctor.doctorProfile.specialization}
                        </p>
                        {consultation.doctor.doctorProfile.hospital && (
                          <p className="text-xs text-gray-500">
                            {consultation.doctor.doctorProfile.hospital.name}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(consultation.scheduledAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                    <Clock className="h-4 w-4" />
                    <span>{formatTime(consultation.scheduledAt)} IST</span>
                  </div>
                </div>
              </div>

              {consultation.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Notes:</span> {consultation.notes}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {consultation.sessionRecord?.prescription && (
                  <button
                    onClick={() => {
                      if (consultation.sessionRecord?.prescription) {
                        setSelectedPrescription({
                          prescription: consultation.sessionRecord.prescription,
                          doctor: consultation.doctor,
                          appointmentDate: consultation.scheduledAt,
                        });
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    View Prescription
                  </button>
                )}

                {consultation.sessionRecord?.transcript && (
                  <button
                    onClick={() => downloadTranscript(consultation)}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download Transcript
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prescription Modal */}
      {selectedPrescription && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
          <div className="modal-container modal-content relative w-full max-w-4xl">
            <button
              onClick={() => setSelectedPrescription(null)}
              className="sticky top-4 left-full ml-4 z-10 bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <svg
                className="h-6 w-6 text-gray-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <PrescriptionView
              prescription={selectedPrescription.prescription}
              doctor={selectedPrescription.doctor}
              appointmentDate={selectedPrescription.appointmentDate}
            />
          </div>
        </div>
      )}
    </div>
  );
}
