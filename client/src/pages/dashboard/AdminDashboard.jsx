import React, { useState, useEffect, useCallback } from 'react';
import { Users, BookOpen, FileText, Activity, Calendar, Clock, ArrowRight } from 'lucide-react';
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
      console.error('Failed to fetch admin statistics', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading || !stats) {
    return <div className="flex justify-center py-20 text-muted text-sm">Loading administrator metrics...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto font-sans space-y-8 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Administrator Console</h1>
          <p className="text-sm text-muted mt-1">Platform-wide overview, active enrollment metrics, and system activity</p>
        </div>
        <div>
          <Link to="/admin/users" className="btn-primary text-xs shadow-sm flex items-center gap-1.5">
            <Users size={15} />
            <span>Manage User Directory</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="card-surface p-5 rounded-xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <Users size={18} className="text-primary-600" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-content">{stats.users.total}</div>
          <div className="text-xs text-muted mt-3 pt-3 border-t border-border flex justify-between">
            <span>{stats.users.students} Students</span>
            <span>{stats.users.teachers} Professors</span>
          </div>
        </div>

        <div className="card-surface p-5 rounded-xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Classes</span>
            <BookOpen size={18} className="text-indigo-600" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-content">{stats.classes.total}</div>
          <div className="text-xs text-muted mt-3 pt-3 border-t border-border">
            <span>{stats.classes.totalEnrollments} Course Enrollments</span>
          </div>
        </div>

        <div className="card-surface p-5 rounded-xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assignments & Materials</span>
            <FileText size={18} className="text-teal-600" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-content">
            {(stats.academic.assignments || 0) + (stats.academic.materials || 0)}
          </div>
          <div className="text-xs text-muted mt-3 pt-3 border-t border-border flex justify-between">
            <span>{stats.academic.assignments} Assignments</span>
            <span>{stats.academic.materials} Documents</span>
          </div>
        </div>

        <div className="card-surface p-5 rounded-xl border border-border shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Attendance Sessions</span>
            <Clock size={18} className="text-emerald-600" />
          </div>
          <div className="text-3xl font-bold tracking-tight text-content">{stats.attendance.sessions}</div>
          <div className="text-xs text-muted mt-3 pt-3 border-t border-border flex justify-between">
            <span>{stats.attendance.records} Checked-In Records</span>
          </div>
        </div>
      </div>

      {/* Operational Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-surface p-6 rounded-xl border border-border shadow-xs">
          <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
            <h3 className="text-sm font-semibold text-content flex items-center gap-2">
              <Calendar size={16} className="text-amber-500" />
              Leave Applications Status
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-base rounded-lg border border-border text-center">
              <span className="text-2xl font-bold text-amber-600">{stats.leaves.pending}</span>
              <p className="text-xs text-muted mt-1">Pending Approval</p>
            </div>
            <div className="p-4 bg-base rounded-lg border border-border text-center">
              <span className="text-2xl font-bold text-content">{stats.leaves.total}</span>
              <p className="text-xs text-muted mt-1">Total Submissions</p>
            </div>
          </div>
        </div>

        <div className="card-surface p-6 rounded-xl border border-border shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-semibold text-content flex items-center gap-2">
                <Activity size={16} className="text-primary-600" />
                Administrative Quick Actions
              </h3>
            </div>
            <p className="text-xs text-muted mb-4">
              Access account role definitions, review permissions, and inspect platform user records.
            </p>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <span className="text-xs text-muted font-medium">User Management Console</span>
            <Link to="/admin/users" className="text-xs font-semibold text-primary-600 hover:underline flex items-center gap-1">
              Open Directory <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
