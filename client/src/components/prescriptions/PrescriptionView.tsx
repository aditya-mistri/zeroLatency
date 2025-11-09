"use client";

import React from "react";
import { FileText, Calendar, User, AlertCircle, Pill } from "lucide-react";

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

interface PrescriptionViewProps {
  prescription: {
    id: string;
    diagnosis: string;
    medications: Medication[];
    labTests?: string;
    advice?: string;
    followUpDate?: string;
    createdAt: string;
  };
  doctor?: {
    firstName: string;
    lastName: string;
    doctorProfile?: {
      specialization: string;
      qualification: string;
      hospital?: {
        name: string;
        address?: string;
        phone?: string;
      };
    };
  };
  patient?: {
    firstName: string;
    lastName: string;
    dateOfBirth?: string;
    gender?: string;
    patientProfile?: {
      dateOfBirth?: string;
      gender?: string;
    };
  };
  appointmentDate: string;
}

export default function PrescriptionView({
  prescription,
  doctor,
  patient,
  appointmentDate,
}: PrescriptionViewProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Medical Prescription
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Date: {formatDate(prescription.createdAt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-blue-100">Prescription ID</p>
            <p className="font-mono text-sm">{prescription.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Doctor Info */}
        {doctor && (
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Doctor Information
            </h3>
            <div className="ml-7 space-y-1 text-sm">
              <p className="font-medium text-gray-900">
                Dr. {doctor.firstName} {doctor.lastName}
              </p>
              {doctor.doctorProfile && (
                <>
                  <p className="text-gray-600">{doctor.doctorProfile.specialization}</p>
                  <p className="text-gray-600">{doctor.doctorProfile.qualification}</p>
                  {doctor.doctorProfile.hospital && (
                    <>
                      <p className="text-gray-600">{doctor.doctorProfile.hospital.name}</p>
                      {doctor.doctorProfile.hospital.address && (
                        <p className="text-gray-500 text-xs">{doctor.doctorProfile.hospital.address}</p>
                      )}
                      {doctor.doctorProfile.hospital.phone && (
                        <p className="text-gray-500 text-xs">Phone: {doctor.doctorProfile.hospital.phone}</p>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Patient Info */}
        {patient && (
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Patient Information</h3>
            <div className="ml-7 space-y-1 text-sm">
              <p className="font-medium text-gray-900">
                {patient.firstName} {patient.lastName}
              </p>
              {(patient.dateOfBirth || patient.patientProfile?.dateOfBirth) && (
                <p className="text-gray-600">
                  DOB: {formatDate(patient.dateOfBirth || patient.patientProfile!.dateOfBirth!)}
                </p>
              )}
              {(patient.gender || patient.patientProfile?.gender) && (
                <p className="text-gray-600">
                  Gender: {patient.gender || patient.patientProfile!.gender}
                </p>
              )}
              <p className="text-gray-600">Consultation Date: {formatDate(appointmentDate)}</p>
            </div>
          </div>
        )}

        {/* Diagnosis */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            Diagnosis
          </h3>
          <p className="ml-7 text-gray-700">{prescription.diagnosis}</p>
        </div>

        {/* Medications */}
        <div className="border-b border-gray-200 pb-4">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Pill className="h-5 w-5 text-green-600" />
            Prescribed Medications
          </h3>
          <div className="ml-7 space-y-3">
            {prescription.medications.map((med, index) => (
              <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{med.name}</p>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Dosage:</span>
                        <span className="ml-2 text-gray-700">{med.dosage}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Frequency:</span>
                        <span className="ml-2 text-gray-700">{med.frequency}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Duration:</span>
                        <span className="ml-2 text-gray-700">{med.duration}</span>
                      </div>
                    </div>
                    {med.instructions && (
                      <p className="mt-2 text-sm text-gray-600 italic">
                        Note: {med.instructions}
                      </p>
                    )}
                  </div>
                  <span className="ml-4 px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                    #{index + 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lab Tests */}
        {prescription.labTests && (
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Recommended Lab Tests</h3>
            <p className="ml-7 text-gray-700 whitespace-pre-line">{prescription.labTests}</p>
          </div>
        )}

        {/* Medical Advice */}
        {prescription.advice && (
          <div className="border-b border-gray-200 pb-4">
            <h3 className="font-semibold text-gray-900 mb-2">Medical Advice & Precautions</h3>
            <p className="ml-7 text-gray-700 whitespace-pre-line">{prescription.advice}</p>
          </div>
        )}

        {/* Follow-up */}
        {prescription.followUpDate && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <Calendar className="h-5 w-5" />
              <div>
                <p className="font-semibold">Follow-up Appointment</p>
                <p className="text-sm">Scheduled for: {formatDate(prescription.followUpDate)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 p-4 rounded-b-lg border-t border-gray-200">
        <p className="text-xs text-gray-500 text-center">
          This is a computer-generated prescription. For any queries, please contact your healthcare provider.
        </p>
      </div>
    </div>
  );
}
