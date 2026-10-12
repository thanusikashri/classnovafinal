import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BarChart3, Users, BookOpen, Clock, FileText, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';
import api from '../../services/api';

const AdminReports = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to load admin stats', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Platform Reports & Analytics</h1>
          <p className="text-sm text-muted mt-1">
            Real usage, attendance participation, assessment activity, and enrollment distribution metrics
          </p>
        </div>
      </div>

      {loading || !stats ? (
        <div className="flex justify-center py-20 text-muted text-sm">Aggregating platform metrics...</div>
      ) : (
        <div className="space-y-8">
          {/* Top Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="card-surface p-6 rounded-2xl">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">User Distribution</span>
              <div className="text-3xl font-extrabold text-content">{stats.users?.total || 0}</div>
              <p className="text-xs text-muted mt-2">
                {stats.users?.students || 0} Students • {stats.users?.teachers || 0} Faculty
              </p>
            </div>

            <div className="card-surface p-6 rounded-2xl">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Course Deployments</span>
              <div className="text-3xl font-extrabold text-content">{stats.classes?.total || 0}</div>
              <p className="text-xs text-muted mt-2">
                {stats.classes?.totalEnrollments || 0} Total Active Enrollments
              </p>
            </div>

            <div className="card-surface p-6 rounded-2xl">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Attendance Check-Ins</span>
              <div className="text-3xl font-extrabold text-content">{stats.attendance?.records || 0}</div>
              <p className="text-xs text-muted mt-2">
                Across {stats.attendance?.sessions || 0} live lecture sessions
              </p>
            </div>

            <div className="card-surface p-6 rounded-2xl">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider block mb-2">Coursework Volume</span>
              <div className="text-3xl font-extrabold text-content">
                {(stats.academic?.assignments || 0) + (stats.academic?.materials || 0)}
              </div>
              <p className="text-xs text-muted mt-2">
                {stats.academic?.assignments || 0} Assignments • {stats.academic?.materials || 0} Materials
              </p>
            </div>
          </div>

          {/* Breakdown Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-surface p-6 sm:p-8 rounded-2xl">
              <h3 className="text-base font-bold text-content mb-4 flex items-center gap-2">
                <Users size={18} className="text-primary-500" />
                <span>Account Ratio Breakdown</span>
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-content">Students</span>
                    <span className="text-muted">{stats.users?.students || 0} accounts</span>
                  </div>
                  <div className="w-full bg-base rounded-full h-2.5 overflow-hidden border border-border">
                    <div
                      className="bg-primary-600 h-2.5 rounded-full"
                      style={{ width: `${Math.round(((stats.users?.students || 0) / (stats.users?.total || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-content">Faculty / Teachers</span>
                    <span className="text-muted">{stats.users?.teachers || 0} accounts</span>
                  </div>
                  <div className="w-full bg-base rounded-full h-2.5 overflow-hidden border border-border">
                    <div
                      className="bg-indigo-600 h-2.5 rounded-full"
                      style={{ width: `${Math.round(((stats.users?.teachers || 0) / (stats.users?.total || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold mb-1">
                    <span className="text-content">Administrators</span>
                    <span className="text-muted">{stats.users?.admins || 0} accounts</span>
                  </div>
                  <div className="w-full bg-base rounded-full h-2.5 overflow-hidden border border-border">
                    <div
                      className="bg-purple-600 h-2.5 rounded-full"
                      style={{ width: `${Math.round(((stats.users?.admins || 0) / (stats.users?.total || 1)) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="card-surface p-6 sm:p-8 rounded-2xl">
              <h3 className="text-base font-bold text-content mb-4 flex items-center gap-2">
                <Calendar size={18} className="text-emerald-500" />
                <span>Attendance & Leave Operations</span>
              </h3>
              <div className="space-y-4 text-sm">
                <div className="p-4 rounded-xl bg-base border border-border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-content block">Total Attendance Sessions</span>
                    <span className="text-xs text-muted">Sessions initiated across courses</span>
                  </div>
                  <span className="text-lg font-bold text-content">{stats.attendance?.sessions || 0}</span>
                </div>

                <div className="p-4 rounded-xl bg-base border border-border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-content block">Total Verified Check-Ins</span>
                    <span className="text-xs text-muted">Valid student OTP recordings</span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.attendance?.records || 0}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-base border border-border flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-content block">Student Leave Applications</span>
                    <span className="text-xs text-muted">
                      {stats.leaves?.pending || 0} pending teacher decision
                    </span>
                  </div>
                  <span className="text-lg font-bold text-content">{stats.leaves?.total || 0}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReports;
