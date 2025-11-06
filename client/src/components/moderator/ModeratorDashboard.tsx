"use client";

import { useState, useEffect } from "react";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Building2,
  TrendingUp,
  Activity,
  AlertCircle,
} from "lucide-react";
import { ModeratorStats } from "@/types/moderator";
import { moderatorApi } from "@/lib/moderator-api";
import { cn } from "@/lib/utils";

export default function ModeratorDashboard() {
  const [stats, setStats] = useState<ModeratorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await moderatorApi.getDashboardStats();
      setStats(response.data?.stats || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12 text-gray-500">
        No statistics available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Moderator Dashboard
        </h1>
        <button
          onClick={fetchDashboardStats}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Refresh Stats
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Pending Doctors */}
        <StatCard
          title="Pending Approvals"
          value={stats.doctors.pending}
          icon={Clock}
          color="yellow"
          subtitle={`${stats.doctors.pending} doctors awaiting review`}
          urgent={stats.doctors.pending > 0}
        />

        {/* Approved Doctors */}
        <StatCard
          title="Approved Doctors"
          value={stats.doctors.approved}
          icon={UserCheck}
          color="green"
          subtitle={`${stats.doctors.approvalRate}% approval rate`}
        />

        {/* Total Hospitals */}
        <StatCard
          title="Hospitals"
          value={stats.hospitals.total}
          icon={Building2}
          color="blue"
          subtitle="Healthcare facilities"
        />

        {/* Total Patients */}
        <StatCard
          title="Patients"
          value={stats.patients.total}
          icon={Users}
          color="purple"
          subtitle="Registered users"
        />
      </div>

      {/* Detailed Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Doctor Management Summary */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Doctor Management
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Applications</span>
              <span className="font-medium">{stats.doctors.total}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center text-yellow-600">
                <Clock className="h-4 w-4 mr-1" />
                Pending Review
              </span>
              <span className="font-medium text-yellow-600">
                {stats.doctors.pending}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center text-green-600">
                <UserCheck className="h-4 w-4 mr-1" />
                Approved
              </span>
              <span className="font-medium text-green-600">
                {stats.doctors.approved}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="flex items-center text-red-600">
                <UserX className="h-4 w-4 mr-1" />
                Rejected
              </span>
              <span className="font-medium text-red-600">
                {stats.doctors.rejected}
              </span>
            </div>

            {/* Approval Rate */}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Approval Rate</span>
                <span className="text-sm font-medium">
                  {stats.doctors.approvalRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full transition-all"
                  style={{ width: `${stats.doctors.approvalRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Recent Activity
          </h3>

          <div className="space-y-4">
            <div className="flex items-center p-3 bg-blue-50 rounded-lg">
              <Activity className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {stats.recent.applications} new applications
                </div>
                <div className="text-xs text-gray-500">in the last 7 days</div>
              </div>
            </div>

            {stats.doctors.pending > 0 && (
              <div className="flex items-center p-3 bg-yellow-50 rounded-lg">
                <AlertCircle className="h-5 w-5 text-yellow-500 mr-3" />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Action required
                  </div>
                  <div className="text-xs text-gray-500">
                    {stats.doctors.pending} doctors pending approval
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center p-3 bg-gray-50 rounded-lg">
              <TrendingUp className="h-5 w-5 text-gray-500 mr-3" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Platform Growth
                </div>
                <div className="text-xs text-gray-500">
                  {stats.patients.total} patients, {stats.doctors.approved}{" "}
                  active doctors
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "blue" | "green" | "yellow" | "purple" | "red";
  subtitle?: string;
  urgent?: boolean;
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  urgent,
}: StatCardProps) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    yellow: "bg-yellow-50 text-yellow-600",
    purple: "bg-purple-50 text-purple-600",
    red: "bg-red-50 text-red-600",
  };

  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow p-6 border-l-4 transition-all hover:shadow-md",
        urgent ? "border-l-yellow-400" : "border-l-gray-200"
      )}
    >
      <div className="flex items-center">
        <div className={cn("p-3 rounded-full", colorClasses[color])}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
