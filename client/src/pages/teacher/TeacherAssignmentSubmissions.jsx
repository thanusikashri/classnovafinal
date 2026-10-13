import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  FileCheck,
  Search,
  Filter,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Plus,
  RefreshCw
} from 'lucide-react';
import api from '../../services/api';

const TeacherAssignmentSubmissions = () => {
  const [overview, setOverview] = useState([]);
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchOverview = useCallback(async () => {
    try {
      setRefreshing(true);
      const [ovRes, clsRes] = await Promise.all([
        api.get('/assignments/teacher-overview'),
        api.get('/classes')
      ]);
      setOverview(ovRes.data.data || []);
      setClasses(clsRes.data.data || []);
    } catch (err) {
      console.error('Failed to load assignment submissions overview', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const filteredAssignments = overview.filter(asgn => {
    const matchesClass = selectedClass === 'all' || asgn.classId === selectedClass || asgn.classId?._id === selectedClass;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q ||
      asgn.title?.toLowerCase().includes(q) ||
      asgn.courseName?.toLowerCase().includes(q) ||
      asgn.courseCode?.toLowerCase().includes(q);
    return matchesClass && matchesSearch;
  });

  const totalEligible = filteredAssignments.reduce((sum, a) => sum + (a.stats?.totalEligibleCount || 0), 0);
  const totalSubmitted = filteredAssignments.reduce((sum, a) => sum + (a.stats?.submittedCount || 0), 0);
  const totalNotSubmitted = filteredAssignments.reduce((sum, a) => sum + (a.stats?.notSubmittedCount || 0), 0);
  const totalAwaitingReview = filteredAssignments.reduce((sum, a) => sum + (a.stats?.awaitingReviewCount || 0), 0);
  const totalReviewed = filteredAssignments.reduce((sum, a) => sum + (a.stats?.reviewedCount || 0), 0);
  const totalLate = filteredAssignments.reduce((sum, a) => sum + (a.stats?.lateCount || 0), 0);

  return (
    <div className="max-w-7xl mx-auto pb-16 font-sans pt-2 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary-100 dark:bg-primary-950/60 text-primary-600 flex items-center justify-center">
              <FileCheck size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-content">Assignment Submissions</h1>
              <p className="text-xs text-muted mt-0.5">
                Monitor student submissions, review submitted PDFs, and manage grading across all your courses
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOverview}
            disabled={refreshing}
            className="btn-secondary text-xs flex items-center gap-1.5 py-2 px-3 rounded-lg"
            title="Refresh submission statistics"
          >
            <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
          <Link
            to="/assignments"
            className="btn-primary text-xs flex items-center gap-1.5 py-2 px-3.5 rounded-lg shadow-xs"
          >
            <Plus size={14} />
            <span>Create Assignment</span>
          </Link>
        </div>
      </div>

      {/* Aggregate Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="card-surface p-4 rounded-xl border border-border">
          <span className="text-[11px] uppercase tracking-wider text-muted font-bold block">Assignments</span>
          <span className="text-2xl font-bold text-content mt-1 block">{filteredAssignments.length}</span>
        </div>
        <div className="card-surface p-4 rounded-xl border border-border">
          <span className="text-[11px] uppercase tracking-wider text-muted font-bold block">Total Enrolled</span>
          <span className="text-2xl font-bold text-content mt-1 block">{totalEligible}</span>
        </div>
        <div className="card-surface p-4 rounded-xl border border-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20">
          <span className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold block">Submitted</span>
          <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">{totalSubmitted}</span>
        </div>
        <div className="card-surface p-4 rounded-xl border border-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20">
          <span className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold block">Not Submitted</span>
          <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">{totalNotSubmitted}</span>
        </div>
        <div className="card-surface p-4 rounded-xl border border-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20">
          <span className="text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-400 font-bold block">Awaiting Review</span>
          <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">{totalAwaitingReview}</span>
        </div>
        <div className="card-surface p-4 rounded-xl border border-purple-500/20 bg-purple-50/20 dark:bg-purple-950/20">
          <span className="text-[11px] uppercase tracking-wider text-purple-700 dark:text-purple-400 font-bold block">Reviewed</span>
          <span className="text-2xl font-bold text-purple-600 dark:text-purple-400 mt-1 block">{totalReviewed}</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card-surface p-4 rounded-xl border border-border flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-muted" />
            <label className="text-xs font-semibold text-content">Course:</label>
          </div>
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="input-field text-xs py-1.5 px-3 min-w-[200px]"
          >
            <option value="all">All Managed Courses ({classes.length})</option>
            {classes.map(c => (
              <option key={c._id} value={c._id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="relative w-full sm:w-72">
          <Search size={14} className="absolute left-3 top-2.5 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search assignments or courses..."
            className="input-field text-xs py-1.5 pl-8 pr-3 w-full"
          />
        </div>
      </div>

      {/* Assignments List */}
      {loading ? (
        <div className="flex justify-center py-24 text-muted text-sm">Loading assignments overview...</div>
      ) : filteredAssignments.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl border border-border">
          <FileText size={48} className="mx-auto text-muted mb-3 opacity-40" />
          <h3 className="text-base font-semibold text-content mb-1">No assignments match your criteria</h3>
          <p className="text-xs text-muted mb-6">
            Try adjusting your search filter or course selection.
          </p>
          <button onClick={() => { setSelectedClass('all'); setSearchQuery(''); }} className="btn-secondary text-xs">
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredAssignments.map(asgn => {
            const stats = asgn.stats || {
              totalEligibleCount: 0,
              submittedCount: 0,
              notSubmittedCount: 0,
              awaitingReviewCount: 0,
              reviewedCount: 0,
              lateCount: 0
            };
            const submitPct = stats.totalEligibleCount > 0
              ? Math.round((stats.submittedCount / stats.totalEligibleCount) * 100)
              : 0;
            const dueDateStr = asgn.dueDate ? new Date(asgn.dueDate).toLocaleDateString() : 'No date set';

            return (
              <div key={asgn._id} className="card-surface rounded-2xl p-5 border border-border hover:shadow-md transition-all flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300">
                          {asgn.courseName || 'Course'} {asgn.courseCode ? `(${asgn.courseCode})` : ''}
                        </span>
                        <span className="text-xs text-muted">Due: {dueDateStr}</span>
                      </div>
                      <h3 className="text-base font-bold text-content leading-snug">{asgn.title}</h3>
                      <p className="text-xs text-muted line-clamp-2">{asgn.description || 'No description provided'}</p>
                    </div>

                    <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-base border border-border text-primary-600 dark:text-primary-400 shrink-0">
                      {asgn.maxMarks || 100} Pts
                    </span>
                  </div>

                  {/* 6 Core Statistics */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center pt-2">
                    <div className="p-2 bg-base rounded-lg border border-border">
                      <span className="text-[10px] text-muted block font-medium">Eligible</span>
                      <span className="text-sm font-bold text-content">{stats.totalEligibleCount}</span>
                    </div>
                    <div className="p-2 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg border border-emerald-500/20">
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-medium">Submitted</span>
                      <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stats.submittedCount}</span>
                    </div>
                    <div className="p-2 bg-amber-50/60 dark:bg-amber-950/30 rounded-lg border border-amber-500/20">
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-medium">Not Subm.</span>
                      <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{stats.notSubmittedCount}</span>
                    </div>
                    <div className="p-2 bg-blue-50/60 dark:bg-blue-950/30 rounded-lg border border-blue-500/20">
                      <span className="text-[10px] text-blue-700 dark:text-blue-400 block font-medium">Awaiting</span>
                      <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{stats.awaitingReviewCount}</span>
                    </div>
                    <div className="p-2 bg-purple-50/60 dark:bg-purple-950/30 rounded-lg border border-purple-500/20">
                      <span className="text-[10px] text-purple-700 dark:text-purple-400 block font-medium">Reviewed</span>
                      <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{stats.reviewedCount}</span>
                    </div>
                    <div className="p-2 bg-rose-50/60 dark:bg-rose-950/30 rounded-lg border border-rose-500/20">
                      <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-medium">Late</span>
                      <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{stats.lateCount}</span>
                    </div>
                  </div>

                  {/* Turn-in Progress */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted">Turn-in Completion: <strong className="text-content">{submitPct}%</strong></span>
                      {stats.awaitingReviewCount > 0 && (
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {stats.awaitingReviewCount} awaiting review
                        </span>
                      )}
                    </div>
                    <div className="w-full bg-base h-2 rounded-full overflow-hidden border border-border">
                      <div
                        className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                        style={{ width: `${Math.min(100, submitPct)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {stats.notSubmittedCount > 0 ? `${stats.notSubmittedCount} students yet to submit` : 'All students submitted!'}
                  </span>
                  <Link
                    to={`/classes/${asgn.classId}/assignments/${asgn._id}`}
                    className="btn-primary text-xs py-1.5 px-3.5 flex items-center gap-1.5 shadow-xs"
                  >
                    <span>Open Submission Roster</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TeacherAssignmentSubmissions;
