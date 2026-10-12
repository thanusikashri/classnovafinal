import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Clock, Calendar, FileText, BookOpen, AlertCircle, CheckCircle, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import MaterialModal from '../../components/MaterialModal';

const TeacherDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [viewingMaterial, setViewingMaterial] = useState(null);
  
  // Quick OTP Attendance State
  const [selectedClassForAttendance, setSelectedClassForAttendance] = useState('');
  const [activeSession, setActiveSession] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [startingSession, setStartingSession] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    announcements: [],
    upcomingAssignments: [],
    todaysAttendance: [],
    pendingLeaves: [],
    recentMaterials: []
  });

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/teacher');
      setClasses(res.data.data.classes || []);
      setDashboardData({
        announcements: res.data.data.announcements || [],
        upcomingAssignments: res.data.data.upcomingAssignments || [],
        todaysAttendance: res.data.data.todaysAttendance || [],
        pendingLeaves: res.data.data.pendingLeaves || [],
        recentMaterials: res.data.data.recentMaterials || []
      });
      if (res.data.data.classes?.length > 0 && !selectedClassForAttendance) {
        setSelectedClassForAttendance(res.data.data.classes[0]._id);
      }
    } catch (err) {
      console.error('Failed to load teacher dashboard', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClassForAttendance]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Countdown timer for active OTP session
  useEffect(() => {
    let timer;
    if (activeSession && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setActiveSession(null);
            fetchDashboard();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeSession, countdown, fetchDashboard]);

  const handleStartAttendance = async () => {
    if (!selectedClassForAttendance) return;
    setStartingSession(true);
    try {
      const res = await api.post(`/attendance/classes/${selectedClassForAttendance}/start`);
      setActiveSession(res.data.data);
      const remainingSeconds = Math.max(0, Math.floor((new Date(res.data.data.expiresAt) - new Date()) / 1000));
      setCountdown(remainingSeconds);
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error starting attendance session');
    } finally {
      setStartingSession(false);
    }
  };

  const handleCloseAttendance = async () => {
    if (!activeSession) return;
    try {
      const sessId = activeSession.sessionId || activeSession._id;
      await api.put(`/attendance/sessions/${sessId}/close`);
      setActiveSession(null);
      setCountdown(0);
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error closing session');
    }
  };

  const [reviewingLeave, setReviewingLeave] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const openReviewModal = (leave, status) => {
    setReviewingLeave(leave);
    setReviewStatus(status);
    setReviewRemarks('');
  };

  const handleConfirmReview = async (e) => {
    e.preventDefault();
    if (!reviewingLeave) return;
    setIsSubmittingReview(true);
    try {
      await api.put(`/leaves/${reviewingLeave._id}/review`, {
        status: reviewStatus,
        teacherComment: reviewRemarks.trim(),
        reviewNote: reviewRemarks.trim()
      });
      setReviewingLeave(null);
      setReviewRemarks('');
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || `Error ${reviewStatus} leave`);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post('/classes', { name: newClassName.trim(), description: newClassDesc.trim() });
      setShowModal(false);
      setNewClassName('');
      setNewClassDesc('');
      fetchDashboard();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error creating class');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getBannerColor = (index) => {
    const colors = [
      'bg-slate-800 text-white',
      'bg-indigo-900 text-white',
      'bg-emerald-900 text-white',
      'bg-blue-900 text-white'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Professor Dashboard</h1>
          <p className="text-sm text-muted mt-1">Manage your active classes, course assignments, and attendance records</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 text-sm shadow-sm"
          >
            <Plus size={18} />
            <span>New Class</span>
          </button>
        </div>
      </div>

      {/* Quick Attendance Widget */}
      {classes.length > 0 && (
        <div className="card-surface p-5 border border-border rounded-xl shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary-50 dark:bg-primary-950/60 text-primary-600 rounded-lg">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-content">Classroom Attendance Session</h3>
                <p className="text-xs text-muted">Generate a secure timed OTP for students in your lecture hall</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!activeSession ? (
                <>
                  <select
                    value={selectedClassForAttendance}
                    onChange={(e) => setSelectedClassForAttendance(e.target.value)}
                    className="input-field py-1.5 px-3 text-xs max-w-xs"
                  >
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleStartAttendance}
                    disabled={startingSession}
                    className="btn-primary text-xs whitespace-nowrap"
                  >
                    {startingSession ? 'Generating...' : 'Start OTP Session'}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-4 bg-primary-50 dark:bg-primary-950/50 px-4 py-2 rounded-lg border border-primary-200 dark:border-primary-800">
                  <div className="text-center">
                    <span className="text-[10px] text-muted block uppercase font-medium">Session OTP</span>
                    <span className="text-xl font-mono font-bold tracking-widest text-primary-600 dark:text-primary-400">
                      {activeSession.otp}
                    </span>
                  </div>
                  <div className="text-center pl-4 border-l border-primary-200 dark:border-primary-800">
                    <span className="text-[10px] text-muted block uppercase font-medium">Time Remaining</span>
                    <span className="text-base font-bold text-red-500 font-mono">
                      {countdown}s
                    </span>
                  </div>
                  <button
                    onClick={handleCloseAttendance}
                    className="btn-secondary text-xs text-red-600 hover:text-red-700 ml-2"
                  >
                    Close Session
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Managed Classes Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-content">Active Classes ({classes.length})</h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-16 text-muted text-sm">Loading classes...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {classes.map((cls, idx) => (
              <div key={cls._id} className="card-surface rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow flex flex-col h-64">
                <div className={`p-4 ${getBannerColor(idx)} flex flex-col justify-between h-24`}>
                  <Link to={`/classes/${cls._id}`} className="hover:underline">
                    <h3 className="font-semibold text-base line-clamp-1" title={cls.name}>{cls.name}</h3>
                  </Link>
                  <p className="text-xs opacity-85 truncate">{cls.description || 'No section notes'}</p>
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-1">
                    <span className="text-[11px] uppercase tracking-wider text-muted font-medium block">Enrollment Code</span>
                    <span className="text-sm font-mono font-semibold text-primary-600 dark:text-primary-400 bg-base px-2 py-0.5 rounded border border-border inline-block">
                      {cls.classCode || cls.code}
                    </span>
                  </div>

                  <div className="text-xs text-muted flex justify-between items-center border-t border-border pt-3">
                    <span className="font-medium text-content">{cls.students?.length || 0} students</span>
                    <Link to={`/classes/${cls._id}`} className="text-primary-600 hover:underline flex items-center gap-1 font-medium">
                      Open <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {classes.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted border border-dashed border-border rounded-xl">
                <Users size={32} className="text-muted mb-2" />
                <h3 className="text-sm font-semibold text-content">No active classes created</h3>
                <p className="text-xs text-muted mt-1">Create your first class to manage materials and course assignments.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 btn-primary text-xs"
                >
                  Create Class
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* 2-Column Dashboard Sections */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming Assignments */}
          <div className="card-surface p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-semibold text-content flex items-center gap-2">
                <FileText size={16} className="text-primary-600" />
                Class Assignments ({dashboardData.upcomingAssignments.length})
              </h3>
            </div>
            {dashboardData.upcomingAssignments.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.upcomingAssignments.map(asgn => (
                  <div key={asgn._id} className="p-3 bg-base rounded-lg border border-border flex items-center justify-between">
                    <div>
                      <Link to={`/classes/${asgn.classId}/assignments/${asgn._id}`} className="text-sm font-medium text-content hover:underline block">
                        {asgn.title}
                      </Link>
                      <span className="text-xs text-muted">
                        Due: {new Date(asgn.dueDate).toLocaleDateString()} • {asgn.maxMarks} points
                      </span>
                    </div>
                    <Link to={`/classes/${asgn.classId}`} className="text-xs text-primary-600 hover:underline shrink-0">
                      Classwork →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted">
                <p className="text-xs">No assignments active yet.</p>
                <p className="text-[11px] mt-1">Open a class to create coursework assignments for your students.</p>
              </div>
            )}
          </div>

          {/* Pending Leaves Review */}
          <div className="card-surface p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-semibold text-content flex items-center gap-2">
                <Calendar size={16} className="text-amber-500" />
                Pending Leave Applications ({dashboardData.pendingLeaves.length})
              </h3>
            </div>
            {dashboardData.pendingLeaves.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.pendingLeaves.map(leave => (
                  <div key={leave._id} className="p-3 bg-base rounded-lg border border-border flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-content text-sm block">{leave.student?.name}</span>
                        <span className="text-xs text-muted">{leave.classId?.name}</span>
                      </div>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 font-medium">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-content italic">"{leave.reason}"</p>
                    <div className="flex justify-end gap-2 pt-2 border-t border-border">
                      <button
                        onClick={() => openReviewModal(leave, 'rejected')}
                        className="btn-secondary text-xs py-1 px-3 text-red-600 hover:text-red-700 font-medium"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => openReviewModal(leave, 'approved')}
                        className="btn-primary text-xs py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-xs text-center py-6">No pending leave requests requiring review.</p>
            )}
          </div>
          
          {/* Today's Attendance Sessions */}
          <div className="card-surface p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-semibold text-content flex items-center gap-2">
                <Clock size={16} className="text-primary-600" />
                Today's Attendance Sessions ({dashboardData.todaysAttendance.length})
              </h3>
            </div>
            {dashboardData.todaysAttendance.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.todaysAttendance.map(sess => (
                  <div key={sess._id} className="p-3 bg-base rounded-lg border border-border flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-content block">{sess.classId?.name}</span>
                      <span className="text-xs text-muted">
                        Started {new Date(sess.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • Status: <span className="capitalize">{sess.status}</span>
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                        {sess.presentCount} Checked In
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-xs text-center py-6">No attendance sessions conducted today yet.</p>
            )}
          </div>

          {/* Recent Announcements */}
          <div className="card-surface p-6 rounded-xl border border-border">
            <h3 className="text-sm font-semibold text-content mb-4 border-b border-border pb-3">Recent Class Announcements</h3>
            {dashboardData.announcements.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.announcements.map(ann => (
                  <div key={ann._id} className="border-l-2 border-primary-500 pl-3 py-1">
                    <p className="text-xs font-semibold text-content">{ann.classId?.name || 'Class'}</p>
                    <p className="text-xs text-muted mt-0.5 line-clamp-2">{ann.content}</p>
                    <p className="text-[10px] text-muted opacity-75 mt-1">{new Date(ann.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-xs text-center py-6">No announcements published yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 rounded-xl border border-border shadow-xl">
            <div className="px-6 py-4 border-b border-border bg-base">
              <h3 className="text-base font-semibold text-content">Create New Class</h3>
              <p className="text-xs text-muted mt-0.5">Set up a course section and generate an enrollment code</p>
            </div>
            <form onSubmit={handleCreateClass}>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-content mb-1">Class Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newClassName} 
                    onChange={e => setNewClassName(e.target.value)} 
                    className="input-field text-sm" 
                    placeholder="e.g. Advanced Operating Systems"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-content mb-1">Section / Description (Optional)</label>
                  <input 
                    type="text" 
                    value={newClassDesc} 
                    onChange={e => setNewClassDesc(e.target.value)} 
                    className="input-field text-sm" 
                    placeholder="e.g. Semester 1, Room 302"
                  />
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-base border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" disabled={!newClassName.trim() || isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Decision Modal */}
      {reviewingLeave && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 rounded-xl border border-border shadow-xl">
            <div className="px-6 py-4 border-b border-border bg-base flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-content">
                  {reviewStatus === 'approved' ? 'Approve Leave Request' : 'Reject Leave Request'}
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Confirm decision for {reviewingLeave.student?.name} ({reviewingLeave.classId?.name})
                </p>
              </div>
            </div>
            <form onSubmit={handleConfirmReview}>
              <div className="p-6 space-y-4">
                <div className="p-3 bg-base rounded-lg border border-border text-xs space-y-1">
                  <div className="flex justify-between text-muted">
                    <span>Duration:</span>
                    <span className="font-medium text-content">
                      {new Date(reviewingLeave.startDate).toLocaleDateString()} - {new Date(reviewingLeave.endDate).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted block mt-1">Reason:</span>
                    <p className="text-content font-medium italic mt-0.5">"{reviewingLeave.reason}"</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-content mb-1">
                    Faculty Remarks / Note (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={reviewRemarks}
                    onChange={(e) => setReviewRemarks(e.target.value)}
                    placeholder={reviewStatus === 'approved' ? 'e.g. Approved. Please review recorded lectures.' : 'e.g. Rejected due to scheduled examination on requested date.'}
                    className="input-field text-xs resize-none"
                  ></textarea>
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-base border-t border-border">
                <button
                  type="button"
                  onClick={() => setReviewingLeave(null)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReview}
                  className={`btn-primary text-xs ${
                    reviewStatus === 'approved'
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  {isSubmittingReview ? 'Updating...' : `Confirm ${reviewStatus === 'approved' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <MaterialModal 
        material={viewingMaterial} 
        onClose={() => setViewingMaterial(null)} 
      />
    </div>
  );
};

export default TeacherDashboard;
