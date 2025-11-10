"use client";

import React, { useState, useEffect } from "react";
import { Users, Calendar, Eye, Clock, Search, Edit, Plus } from "lucide-react";
import PrescriptionView from "../prescriptions/PrescriptionView";
import dynamic from "next/dynamic";

const PrescriptionForm = dynamic(() => import("../prescriptions/PrescriptionForm"), { ssr: false });

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
  sessionRecord?: {
    id: string;
    duration?: number;
    startedAt?: string;
    endedAt?: string;
    prescription?: Prescription;
  };
}

interface PatientRecord {
  patientId: string;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    patientProfile?: {
      dateOfBirth?: string;
      gender?: string;
      bloodGroup?: string;
      allergies?: string;
      chronicConditions?: string;
    };
  };
  consultations: Consultation[];
  totalConsultations: number;
  lastConsultation?: string;
}

export default function PatientRecords() {
  const [patientRecords, setPatientRecords] = useState<PatientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrescription, setSelectedPrescription] = useState<{
    prescription: Prescription;
    patient: PatientRecord["patient"];
    appointmentDate: string;
  } | null>(null);
  const [prescriptionFormData, setPrescriptionFormData] = useState<{
    appointmentId: string;
    patientName: string;
  } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  useEffect(() => {
    fetchPatientRecords();
  }, []);

  const fetchPatientRecords = async () => {
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/patient-records`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok && data.data) {
        setPatientRecords(data.data.patientRecords);
      }
    } catch (error) {
      console.error("Error fetching patient records:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "short",
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

  const calculateAge = (dateOfBirth?: string) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const filteredRecords = patientRecords.filter((record) =>
    `${record.patient.firstName} ${record.patient.lastName} ${record.patient.email}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  const totalPatients = patientRecords.length;
  const totalConsultations = patientRecords.reduce(
    (sum, record) => sum + record.totalConsultations,
    0
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
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by patient name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-600 font-medium">Total Patients</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">{totalPatients}</p>
        </div>
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <p className="text-sm text-green-600 font-medium">Total Consultations</p>
          <p className="text-2xl font-bold text-green-900 mt-1">{totalConsultations}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
          <p className="text-sm text-purple-600 font-medium">Prescriptions Written</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">
            {patientRecords.reduce(
              (sum, record) =>
                sum +
                record.consultations.filter((c) => c.sessionRecord?.prescription).length,
              0
            )}
          </p>
        </div>
      </div>

      {/* Patient Records List */}
      {filteredRecords.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? "No patients found matching your search" : "No patient records found"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map((record) => (
            <div
              key={record.patientId}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
            >
              {/* Patient Header */}
              <div
                className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() =>
                  setExpandedPatient(
                    expandedPatient === record.patientId ? null : record.patientId
                  )
                }
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-lg">
                        {record.patient.firstName} {record.patient.lastName}
                      </h3>
                      <p className="text-sm text-gray-600">{record.patient.email}</p>
                      {record.patient.phone && (
                        <p className="text-sm text-gray-500">{record.patient.phone}</p>
                      )}

                      {record.patient.patientProfile && (
                        <div className="flex flex-wrap gap-3 mt-2 text-sm">
                          {record.patient.patientProfile.dateOfBirth && (
                            <span className="text-gray-600">
                              Age: {calculateAge(record.patient.patientProfile.dateOfBirth)}
                            </span>
                          )}
                          {record.patient.patientProfile.gender && (
                            <span className="text-gray-600">
                              • {record.patient.patientProfile.gender}
                            </span>
                          )}
                          {record.patient.patientProfile.bloodGroup && (
                            <span className="text-gray-600">
                              • Blood Group: {record.patient.patientProfile.bloodGroup}
                            </span>
                          )}
                        </div>
                      )}

                      {record.patient.patientProfile?.allergies && (
                        <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm">
                          <span className="font-medium text-yellow-800">Allergies:</span>{" "}
                          <span className="text-yellow-700">
                            {record.patient.patientProfile.allergies}
                          </span>
                        </div>
                      )}

                      {record.patient.patientProfile?.chronicConditions && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                          <span className="font-medium text-red-800">Chronic Conditions:</span>{" "}
                          <span className="text-red-700">
                            {record.patient.patientProfile.chronicConditions}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>{record.totalConsultations} Consultations</span>
                    </div>
                    {record.lastConsultation && (
                      <p className="text-xs text-gray-500 mt-1">
                        Last: {formatDate(record.lastConsultation)}
                      </p>
                    )}
                    <button className="mt-2 text-blue-600 text-sm font-medium hover:text-blue-700">
                      {expandedPatient === record.patientId ? "Hide" : "View"} History
                    </button>
                  </div>
                </div>
              </div>

              {/* Consultation History */}
              {expandedPatient === record.patientId && (
                <div className="border-t border-gray-200 bg-gray-50 p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Consultation History</h4>
                  <div className="space-y-4">
                    {record.consultations.map((consultation) => (
                      <div
                        key={consultation.id}
                        className="bg-white rounded-lg border border-gray-200 p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="h-4 w-4" />
                              <span>{formatDate(consultation.scheduledAt)}</span>
                              <Clock className="h-4 w-4 ml-2" />
                              <span>{formatTime(consultation.scheduledAt)} IST</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              Duration: {consultation.duration} minutes
                            </p>
                          </div>

                          <div className="flex gap-2">
                            {consultation.sessionRecord?.prescription ? (
                              <>
                                <button
                                  onClick={() =>
                                    setSelectedPrescription({
                                      prescription: consultation.sessionRecord!.prescription!,
                                      patient: record.patient,
                                      appointmentDate: consultation.scheduledAt,
                                    })
                                  }
                                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                                >
                                  <Eye className="h-4 w-4" />
                                  View
                                </button>
                                <button
                                  onClick={() =>
                                    setPrescriptionFormData({
                                      appointmentId: consultation.id,
                                      patientName: `${record.patient.firstName} ${record.patient.lastName}`,
                                    })
                                  }
                                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                                >
                                  <Edit className="h-4 w-4" />
                                  Edit
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() =>
                                  setPrescriptionFormData({
                                    appointmentId: consultation.id,
                                    patientName: `${record.patient.firstName} ${record.patient.lastName}`,
                                  })
                                }
                                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                <Plus className="h-4 w-4" />
                                Create Prescription
                              </button>
                            )}
                          </div>
                        </div>

                        {consultation.notes && (
                          <div className="p-3 bg-gray-50 rounded text-sm">
                            <p className="text-gray-700">
                              <span className="font-medium">Notes:</span> {consultation.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Prescription Form Modal */}
      {prescriptionFormData && (
        <PrescriptionForm
          appointmentId={prescriptionFormData.appointmentId}
          patientName={prescriptionFormData.patientName}
          onClose={() => setPrescriptionFormData(null)}
          onSuccess={() => {
            setPrescriptionFormData(null);
            fetchPatientRecords(); // Refresh the records
          }}
        />
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
              patient={selectedPrescription.patient}
              appointmentDate={selectedPrescription.appointmentDate}
            />
          </div>
        </div>
      )}
    </div>
  );
}
