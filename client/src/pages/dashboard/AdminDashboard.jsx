import React, { useState, useEffect, useCallback } from 'react';
import { Users, BookOpen, FileText, CheckSquare, Activity, Calendar, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data.data);
    } catch (err) {
      console.error('Failed to fetch admin stats', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading || !stats) {
    return <div className="flex justify-center py-20 text-muted">Loading dashboard...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto mt-2 font-sans space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-content">Admin Dashboard</h1>
          <p className="text-sm text-muted mt-1">Platform statistics and overview</p>
        </div>
        <div>
          <Link to="/admin/users" className="btn-primary">
            Manage Users
          </Link>
        </div>
      </div>

      {/* Main 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-surface p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-primary-100 dark:text-primary-900/30 opacity-50 group-hover:scale-110 transition-transform">
            <Users size={120} />
          </div>
          <h3 className="text-sm font-medium text-muted mb-1 relative z-10">Total Users</h3>
          <div className="text-4xl font-bold text-content relative z-10">{stats.users.total}</div>
          <div className="text-xs text-muted mt-4 relative z-10 flex gap-4">
            <span>{stats.users.students} Students</span>
            <span>{stats.users.teachers} Teachers</span>
          </div>
        </div>

        <div className="card-surface p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-secondary-100 dark:text-secondary-900/30 opacity-50 group-hover:scale-110 transition-transform">
            <BookOpen size={120} />
          </div>
          <h3 className="text-sm font-medium text-muted mb-1 relative z-10">Total Classes</h3>
          <div className="text-4xl font-bold text-content relative z-10">{stats.classes.total}</div>
          <div className="text-xs text-muted mt-4 relative z-10">
            <span>{stats.classes.totalEnrollments} Total Enrollments</span>
          </div>
        </div>

        <div className="card-surface p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-green-100 dark:text-green-900/30 opacity-50 group-hover:scale-110 transition-transform">
            <FileText size={120} />
          </div>
          <h3 className="text-sm font-medium text-muted mb-1 relative z-10">Academic Content</h3>
          <div className="text-4xl font-bold text-content relative z-10">{stats.academic?.assignments || 0}</div>
          <div className="text-xs text-muted mt-4 relative z-10 flex gap-4">
            <span>Assignments</span>
            <span>•</span>
            <span>{stats.academic?.materials || 0} Materials</span>
          </div>
        </div>

        <div className="card-surface p-6 flex flex-col justify-center relative overflow-hidden group">
          <div className="absolute -right-6 -top-6 text-yellow-100 dark:text-yellow-900/30 opacity-50 group-hover:scale-110 transition-transform">
            <Activity size={120} />
          </div>
          <h3 className="text-sm font-medium text-muted mb-1 relative z-10">Assessments (Member 2)</h3>
          <div className="text-3xl font-bold text-content relative z-10">
            {stats.assessments !== null ? stats.assessments.totalQuizzes : '0'}
          </div>
          <div className="text-xs text-muted mt-4 relative z-10">
            {stats.assessments !== null
              ? `${stats.assessments.totalAttempts} Quiz Attempts`
              : 'Integration Slot Ready'}
          </div>
        </div>
      </div>

      {/* Secondary Metrics: Attendance & Leaves */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-surface p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
            <div className="p-2 rounded-lg bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-300">
              <Clock size={20} />
            </div>
            <div>
              <h3 className="text-base font-medium text-content">Attendance Sessions</h3>
              <p className="text-xs text-muted">Platform-wide OTP attendance records</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-base p-4 rounded-xl border border-border">
              <span className="text-xs text-muted block mb-1">Total Sessions Conducted</span>
              <span className="text-2xl font-bold text-content">{stats.attendance?.sessions || 0}</span>
            </div>
            <div className="bg-base p-4 rounded-xl border border-border">
              <span className="text-xs text-muted block mb-1">Total Attendance Records</span>
              <span className="text-2xl font-bold text-content">{stats.attendance?.records || 0}</span>
            </div>
          </div>
        </div>

        <div className="card-surface p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-border pb-3">
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <Calendar size={20} />
            </div>
            <div>
              <h3 className="text-base font-medium text-content">Leave Applications</h3>
              <p className="text-xs text-muted">Student leave requests and statuses</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="bg-base p-4 rounded-xl border border-border">
              <span className="text-xs text-muted block mb-1">Pending Review</span>
              <span className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.leaves?.pending || 0}</span>
            </div>
            <div className="bg-base p-4 rounded-xl border border-border">
              <span className="text-xs text-muted block mb-1">Total Applications</span>
              <span className="text-2xl font-bold text-content">{stats.leaves?.total || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
