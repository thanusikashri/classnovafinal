import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, AlertCircle, CheckCircle2, XCircle, Send, FileText, Filter } from 'lucide-react';
import api from '../../services/api';

const LeaveRequests = () => {
  const { user } = useAuth();
  const isStudent = user?.role === 'student';
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  // Student State
  const [classes, setClasses] = useState([]);
  const [studentLeaves, setStudentLeaves] = useState([]);
  const [leaveForm, setLeaveForm] = useState({
    classId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState({ text: '', isError: false });

  // Teacher State
  const [teacherLeaves, setTeacherLeaves] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [reviewingLeave, setReviewingLeave] = useState(null);
  const [reviewDecision, setReviewDecision] = useState('approved');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const [loading, setLoading] = useState(true);

  // Fetch student data
  const fetchStudentData = useCallback(async () => {
    try {
      const [clsRes, leaveRes] = await Promise.all([
        api.get('/classes').catch(() => ({ data: { data: [] } })),
        api.get('/leaves/my').catch(() => ({ data: { data: [] } }))
      ]);
      const classList = clsRes.data.data || [];
      setClasses(classList);
      setStudentLeaves(leaveRes.data.data || []);
      if (classList.length > 0 && !leaveForm.classId) {
        setLeaveForm(prev => ({ ...prev, classId: classList[0]._id }));
      }
    } catch (err) {
      console.error('Failed to load student leave requests', err);
    } finally {
      setLoading(false);
    }
  }, [leaveForm.classId]);

  // Fetch teacher data
  const fetchTeacherData = useCallback(async () => {
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await api.get('/leaves/teacher', { params });
      setTeacherLeaves(res.data.data || []);
    } catch (err) {
      console.error('Failed to load teacher leave requests', err);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    if (isStudent) {
      fetchStudentData();
    } else {
      fetchTeacherData();
    }
  }, [isStudent, fetchStudentData, fetchTeacherData]);

  // Student Submit
  const handleStudentApply = async (e) => {
    e.preventDefault();
    if (!leaveForm.classId || !leaveForm.startDate || !leaveForm.endDate || !leaveForm.reason.trim()) {
      setFormMessage({ text: 'Please fill in all application fields', isError: true });
      return;
    }
    if (new Date(leaveForm.startDate) > new Date(leaveForm.endDate)) {
      setFormMessage({ text: 'Start date cannot be after end date', isError: true });
      return;
    }

    setFormSubmitting(true);
    setFormMessage({ text: '', isError: false });

    try {
      await api.post('/leaves', {
        classId: leaveForm.classId,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        reason: leaveForm.reason.trim()
      });
      setFormMessage({ text: 'Leave application submitted successfully!', isError: false });
      setLeaveForm(prev => ({ ...prev, startDate: '', endDate: '', reason: '' }));
      fetchStudentData();
    } catch (err) {
      setFormMessage({ text: err.response?.data?.message || 'Failed to submit leave application', isError: true });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Student Cancel
  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Are you sure you want to cancel this leave application?')) return;
    try {
      await api.put(`/leaves/${leaveId}/cancel`);
      fetchStudentData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel application');
    }
  };

  // Teacher Review
  const handleTeacherReview = async (e) => {
    e.preventDefault();
    if (!reviewingLeave) return;
    setReviewSubmitting(true);
    try {
      await api.put(`/leaves/${reviewingLeave._id}/review`, {
        status: reviewDecision,
        reviewNote: reviewRemarks.trim(),
        teacherComment: reviewRemarks.trim()
      });
      setReviewingLeave(null);
      setReviewRemarks('');
      fetchTeacherData();
    } catch (err) {
      alert(err.response?.data?.message || `Failed to ${reviewDecision} request`);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
            <CheckCircle2 size={13} />
            <span>Approved</span>
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
            <XCircle size={13} />
            <span>Rejected</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-slate-300">
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            <Clock size={13} />
            <span>Pending Review</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans pt-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Leave Requests</h1>
          <p className="text-sm text-muted mt-1">
            {isStudent
              ? 'Apply for academic leave, track approval decisions, and review instructor feedback'
              : 'Review and approve or reject student leave requests for your courses'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading leave records...</div>
      ) : isStudent ? (
        /* STUDENT VIEW */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Application Form */}
          <div className="lg:col-span-1">
            <div className="card-surface p-6 rounded-2xl sticky top-24">
              <h2 className="text-base font-semibold text-content mb-1 flex items-center gap-2">
                <Send size={18} className="text-primary-500" />
                <span>Apply for Leave</span>
              </h2>
              <p className="text-xs text-muted mb-6">Submit request with dates and detailed justification</p>

              {formMessage.text && (
                <div
                  className={`mb-4 p-3.5 rounded-xl border text-xs flex items-center gap-2 ${
                    formMessage.isError
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  }`}
                >
                  {formMessage.isError ? <AlertCircle size={15} /> : <CheckCircle2 size={15} />}
                  <span>{formMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleStudentApply} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                    Select Course
                  </label>
                  <select
                    value={leaveForm.classId}
                    onChange={e => setLeaveForm({ ...leaveForm, classId: e.target.value })}
                    className="input-field text-sm"
                    required
                  >
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      required
                      value={leaveForm.startDate}
                      onChange={e => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      required
                      value={leaveForm.endDate}
                      onChange={e => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                    Reason for Leave
                  </label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide clear reasons for your leave application (medical, family, event, etc.)..."
                    value={leaveForm.reason}
                    onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={formSubmitting || classes.length === 0}
                  className="w-full btn-primary text-sm flex items-center justify-center gap-2"
                >
                  <Send size={15} />
                  <span>{formSubmitting ? 'Submitting...' : 'Submit Leave Application'}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Request History */}
          <div className="lg:col-span-2">
            <div className="card-surface rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-content text-base">Application History</h3>
                  <p className="text-xs text-muted mt-0.5">Records of all your submitted leave requests</p>
                </div>
                <span className="text-xs font-semibold text-muted bg-base px-3 py-1 rounded-full border border-border">
                  {studentLeaves.length} Total
                </span>
              </div>

              {studentLeaves.length === 0 ? (
                <div className="p-12 text-center text-muted text-sm">
                  <Calendar size={36} className="mx-auto mb-2 opacity-40" />
                  <span>No leave applications submitted yet.</span>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {studentLeaves.map(leave => {
                    const className = leave.classId?.name || (typeof leave.classId === 'string' ? leave.classId : 'Course');
                    const reviewer = leave.reviewedBy?.name || 'Course Instructor';

                    return (
                      <div key={leave._id} className="p-6 hover:bg-base/40 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-content text-base">{className}</span>
                              {getStatusBadge(leave.status)}
                            </div>
                            <div className="text-xs text-muted mt-1 flex items-center gap-3">
                              <span>
                                {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                              </span>
                              <span>•</span>
                              <span>Applied on {new Date(leave.createdAt).toLocaleDateString()}</span>
                            </div>
                          </div>

                          {leave.status === 'pending' && (
                            <button
                              onClick={() => handleCancelLeave(leave._id)}
                              className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 font-medium self-start px-2.5 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            >
                              Cancel Application
                            </button>
                          )}
                        </div>

                        <div className="bg-base/70 p-3.5 rounded-xl border border-border text-sm text-content mb-3">
                          <span className="text-xs font-semibold text-muted block mb-1">Student Reason:</span>
                          <p>{leave.reason}</p>
                        </div>

                        {(leave.teacherComment || leave.reviewNote) && (
                          <div className="p-3.5 rounded-xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-200 dark:border-primary-900/40 text-xs">
                            <span className="font-semibold text-primary-700 dark:text-primary-300 block mb-0.5">
                              Instructor Feedback ({reviewer}):
                            </span>
                            <p className="text-content">{leave.teacherComment || leave.reviewNote}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* TEACHER VIEW */
        <div>
          {/* Status Filters */}
          <div className="mb-6 flex items-center gap-2">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider mr-2 flex items-center gap-1.5">
              <Filter size={14} />
              Filter:
            </span>
            {['all', 'pending', 'approved', 'rejected'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium capitalize transition-colors ${
                  statusFilter === st
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-surface border border-border text-muted hover:text-content'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="card-surface rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-content text-base">Course Leave Applications</h3>
                <p className="text-xs text-muted mt-0.5">Showing student applications for courses you manage</p>
              </div>
              <span className="text-xs font-semibold text-muted bg-base px-3 py-1 rounded-full border border-border">
                {teacherLeaves.length} Requests
              </span>
            </div>

            {teacherLeaves.length === 0 ? (
              <div className="p-16 text-center text-muted text-sm">
                <CheckCircle2 size={40} className="mx-auto mb-2 opacity-40 text-emerald-500" />
                <span>No leave applications found matching this status filter.</span>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {teacherLeaves.map(leave => {
                  const studentName = leave.student?.name || 'Enrolled Student';
                  const studentEmail = leave.student?.email || '';
                  const className = leave.classId?.name || (typeof leave.classId === 'string' ? leave.classId : 'Course');

                  return (
                    <div key={leave._id} className="p-6 hover:bg-base/40 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-bold text-content text-base">{studentName}</span>
                            <span className="text-xs text-muted font-mono">({studentEmail})</span>
                            {getStatusBadge(leave.status)}
                          </div>
                          <div className="text-xs text-muted mt-1 flex items-center gap-3">
                            <span className="font-medium text-primary-600 dark:text-primary-400">{className}</span>
                            <span>•</span>
                            <span>
                              {new Date(leave.startDate).toLocaleDateString()} — {new Date(leave.endDate).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span>Submitted {new Date(leave.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {leave.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setReviewingLeave(leave);
                                setReviewDecision('approved');
                                setReviewRemarks('');
                              }}
                              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-semibold shadow-xs transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => {
                                setReviewingLeave(leave);
                                setReviewDecision('rejected');
                                setReviewRemarks('');
                              }}
                              className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-semibold shadow-xs transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>

                      <div className="bg-base/70 p-4 rounded-xl border border-border text-sm text-content mb-2">
                        <span className="text-xs font-semibold text-muted block mb-1">Reason for Application:</span>
                        <p>{leave.reason}</p>
                      </div>

                      {(leave.teacherComment || leave.reviewNote) && (
                        <div className="p-3 rounded-xl bg-surface border border-border text-xs text-muted">
                          <span className="font-semibold text-content block mb-0.5">Recorded Decision Note:</span>
                          <p>{leave.teacherComment || leave.reviewNote}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card-surface p-6 sm:p-8 rounded-2xl max-w-lg w-full">
            <h2 className="text-xl font-bold text-content mb-1">
              Confirm {reviewDecision === 'approved' ? 'Approval' : 'Rejection'}
            </h2>
            <p className="text-xs text-muted mb-4">
              For student <strong className="text-content">{reviewingLeave.student?.name}</strong> in {reviewingLeave.classId?.name}
            </p>

            <form onSubmit={handleTeacherReview} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                  Instructor Remarks (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder={`Add a note for the student regarding this ${reviewDecision} decision...`}
                  value={reviewRemarks}
                  onChange={e => setReviewRemarks(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setReviewingLeave(null)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className={`text-sm px-5 py-2.5 rounded-full font-medium text-white transition-colors shadow-sm ${
                    reviewDecision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {reviewSubmitting ? 'Submitting...' : `Confirm ${reviewDecision === 'approved' ? 'Approve' : 'Reject'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeaveRequests;
