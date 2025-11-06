"use client";

import React, { useState, useEffect } from "react";
import { appointmentApi, Doctor } from "@/lib/appointment-api";
import { Search, MapPin, DollarSign, Filter } from "lucide-react";

interface DoctorDiscoveryProps {
  onSelectDoctor: (doctor: Doctor) => void;
}

export default function DoctorDiscovery({
  onSelectDoctor,
}: DoctorDiscoveryProps) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSpecialization, setSelectedSpecialization] = useState("");
  const [minFee, setMinFee] = useState<number | undefined>();
  const [maxFee, setMaxFee] = useState<number | undefined>();
  const [selectedCity, setSelectedCity] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [showFilters, setShowFilters] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch doctors
  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await appointmentApi.getDoctors({
        page: currentPage,
        limit: 12,
        search: searchTerm || undefined,
        specialization: selectedSpecialization || undefined,
        city: selectedCity || undefined,
        minFee,
        maxFee,
        sortBy,
        sortOrder: "asc",
      });

      if (response.status === "success" && response.data) {
        setDoctors(response.data.doctors);
        setTotalPages(response.data.pagination.pages);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch doctors");
    } finally {
      setLoading(false);
    }
  };

  // Fetch specializations
  const fetchSpecializations = async () => {
    try {
      const response = await appointmentApi.getSpecializations();
      if (response.status === "success" && response.data) {
        setSpecializations(response.data.specializations);
      }
    } catch (err) {
      console.error("Failed to fetch specializations:", err);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [
    currentPage,
    searchTerm,
    selectedSpecialization,
    selectedCity,
    minFee,
    maxFee,
    sortBy,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSpecializations();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDoctors();
  };

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedSpecialization("");
    setSelectedCity("");
    setMinFee(undefined);
    setMaxFee(undefined);
    setSortBy("createdAt");
    setCurrentPage(1);
  };

  if (loading && doctors.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
            <div className="flex items-start space-x-4">
              <div className="w-16 h-16 bg-gray-300 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Find a Doctor</h2>
          <p className="text-gray-600">
            Book appointments with verified healthcare professionals
          </p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search by doctor name or specialization..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Search
        </button>
      </form>

      {/* Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Specialization Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization
              </label>
              <select
                value={selectedSpecialization}
                onChange={(e) => setSelectedSpecialization(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Specializations</option>
                {specializations.map((spec) => (
                  <option key={spec} value={spec}>
                    {spec}
                  </option>
                ))}
              </select>
            </div>

            {/* City Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                City
              </label>
              <input
                type="text"
                placeholder="Enter city"
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Fee Range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Min Fee (₹)
              </label>
              <input
                type="number"
                placeholder="Min fee"
                value={minFee || ""}
                onChange={(e) =>
                  setMinFee(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Fee (₹)
              </label>
              <input
                type="number"
                placeholder="Max fee"
                value={maxFee || ""}
                onChange={(e) =>
                  setMaxFee(e.target.value ? Number(e.target.value) : undefined)
                }
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Sort Options */}
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="createdAt">Newest</option>
                <option value="name">Name</option>
                <option value="fee">Consultation Fee</option>
              </select>
            </div>
            <button
              onClick={clearFilters}
              className="mt-6 px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Results Count */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600">
          {doctors.length > 0
            ? `${doctors.length} doctors found`
            : "No doctors found"}
        </p>
      </div>

      {/* Doctor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {doctors.map((doctor) => (
          <div
            key={doctor.id}
            className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
          >
            {/* Doctor Info */}
            <div className="flex items-start space-x-4 mb-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                {doctor.user.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={doctor.user.avatar}
                    alt={`Dr. ${doctor.user.firstName} ${doctor.user.lastName}`}
                    className="w-16 h-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-xl font-semibold text-blue-600">
                    {doctor.user.firstName[0]}
                    {doctor.user.lastName[0]}
                  </span>
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">
                  Dr. {doctor.user.firstName} {doctor.user.lastName}
                </h3>
                <p className="text-blue-600 font-medium">
                  {doctor.specialization}
                </p>
                <p className="text-sm text-gray-600">
                  {doctor.experience} years experience
                </p>
              </div>
            </div>

            {/* Qualification */}
            <div className="mb-4">
              <p className="text-sm text-gray-600">{doctor.qualification}</p>
            </div>

            {/* Hospital Info */}
            {doctor.hospital && (
              <div className="flex items-center space-x-2 mb-4 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                <span>
                  {doctor.hospital.name}, {doctor.hospital.city}
                </span>
              </div>
            )}

            {/* Fee */}
            <div className="flex items-center space-x-2 mb-4">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="font-semibold text-green-600">
                ₹{doctor.consultationFee}
              </span>
              <span className="text-sm text-gray-600">consultation fee</span>
            </div>

            {/* Bio */}
            {doctor.bio && (
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {doctor.bio}
              </p>
            )}

            {/* Actions */}
            <button
              onClick={() => onSelectDoctor(doctor)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Book Appointment
            </button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>

          <span className="px-3 py-2 text-gray-600">
            Page {currentPage} of {totalPages}
          </span>

          <button
            onClick={() =>
              setCurrentPage(Math.min(totalPages, currentPage + 1))
            }
            disabled={currentPage === totalPages}
            className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Loading Overlay */}
      {loading && doctors.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </div>
      )}
    </div>
  );
}
