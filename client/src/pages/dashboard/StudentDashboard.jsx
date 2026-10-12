import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, BookOpen, Clock, Calendar, CheckCircle2, AlertCircle, FileText, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import MaterialModal from '../../components/MaterialModal';

const StudentDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  const [viewingMaterial, setViewingMaterial] = useState(null);

  // OTP Attendance Submission State
  const [selectedClassForOtp, setSelectedClassForOtp] = useState('');
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpMessage, setOtpMessage] = useState({ text: '', isError: false });

  // Leave Application State
  const [leaveForm, setLeaveForm] = useState({
    classId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [leaveMessage, setLeaveMessage] = useState({ text: '', isError: false });
  
  const [dashboardData, setDashboardData] = useState({
    announcements: [],
    attendance: 100,
    leaves: [],
    pendingLeaves: [],
    recentMaterials: [],
    upcomingAssessments: []
  });

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/student');
      setClasses(res.data.data.classes || []);
      setDashboardData({
        announcements: res.data.data.announcements || [],
        attendance: res.data.data.attendance !== undefined ? res.data.data.attendance : 100,
        leaves: res.data.data.leaves || res.data.data.pendingLeaves || [],
        pendingLeaves: res.data.data.pendingLeaves || [],
        recentMaterials: res.data.data.recentMaterials || [],
        upcomingAssessments: res.data.data.upcomingAssessments || []
      });
      if (res.data.data.classes?.length > 0) {
        if (!selectedClassForOtp) setSelectedClassForOtp(res.data.data.classes[0]._id);
        if (!leaveForm.classId) setLeaveForm(prev => ({ ...prev, classId: res.data.data.classes[0]._id }));
      }
    } catch (err) {
      console.error('Failed to load student dashboard', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClassForOtp, leaveForm.classId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!classCode.trim()) return;
    setIsSubmitting(true);
    setError('');
    try {
      await api.post('/classes/enroll', { code: classCode.trim() });
      setShowJoinModal(false);
      setClassCode('');
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enroll in class. Verify the code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    if (!selectedClassForOtp || enteredOtp.length !== 6) return;
    setIsSubmitting(true);
    setOtpMessage({ text: '', isError: false });
    try {
      const activeRes = await api.get(`/attendance/classes/${selectedClassForOtp}/active`);
      const session = activeRes.data.data;
      if (!session) {
        setOtpMessage({ text: 'No active attendance session found for this class', isError: true });
        setIsSubmitting(false);
        return;
      }
      const sessId = session.sessionId || session._id;
      await api.post('/attendance/submit', {
        sessionId: sessId,
        otp: enteredOtp
      });
      setOtpMessage({ text: 'Attendance checked in successfully!', isError: false });
      setEnteredOtp('');
      setTimeout(() => {
        setShowOtpModal(false);
        setOtpMessage({ text: '', isError: false });
        fetchDashboard();
      }, 1500);
    } catch (err) {
      setOtpMessage({ text: err.response?.data?.message || 'Failed to submit OTP', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    setLeaveMessage({ text: '', isError: false });
    setIsSubmitting(true);
    try {
      await api.post('/leaves', leaveForm);
      setLeaveMessage({ text: 'Leave application submitted successfully!', isError: false });
      setLeaveForm(prev => ({ ...prev, startDate: '', endDate: '', reason: '' }));
      setTimeout(() => {
        setShowLeaveModal(false);
        setLeaveMessage({ text: '', isError: false });
        fetchDashboard();
      }, 1500);
    } catch (err) {
      setLeaveMessage({ text: err.response?.data?.message || 'Failed to apply for leave', isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!window.confirm('Cancel this pending leave request?')) return;
    try {
      await api.put(`/leaves/${leaveId}/cancel`);
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error cancelling leave');
    }
  };

  const getBannerColor = (index) => {
    const colors = [
      'bg-slate-800 text-white',
      'bg-indigo-900 text-white',
      'bg-teal-900 text-white',
      'bg-sky-900 text-white'
    ];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-8 font-sans pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Student Portal</h1>
          <p className="text-sm text-muted mt-1">Overview of your enrolled classes, course assignments, and attendance records</p>
        </div>
        <div className="flex items-center gap-3">
          {classes.length > 0 && (
            <>
              <button
                onClick={() => setShowOtpModal(true)}
                className="btn-secondary flex items-center gap-2 text-xs"
              >
                <Clock size={15} />
                <span>Submit OTP</span>
              </button>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="btn-secondary flex items-center gap-2 text-xs"
              >
                <Calendar size={15} />
                <span>Apply Leave</span>
              </button>
            </>
          )}
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn-primary flex items-center gap-2 text-xs shadow-sm"
          >
            <Plus size={16} />
            <span>Enroll in Class</span>
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-semibold text-content">Available Courses ({classes.length})</h2>
            <p className="text-xs text-muted mt-0.5">All academic courses created by faculty across departments</p>
          </div>
          <button
            onClick={() => setShowJoinModal(true)}
            className="text-xs text-primary-600 hover:underline font-medium"
          >
            + Enter Enrollment Code
          </button>
        </div>
        {loading ? (
          <div className="flex justify-center py-16 text-muted text-sm">Loading available courses...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {classes.map((cls, idx) => (
              <div key={cls._id} className="card-surface rounded-xl overflow-hidden border border-border hover:shadow-md transition-shadow flex flex-col h-64">
                <div className={`p-4 ${getBannerColor(idx)} flex flex-col justify-between h-24`}>
                  <Link to={`/classes/${cls._id}`} className="hover:underline">
                    <h3 className="font-semibold text-base line-clamp-1" title={cls.name}>{cls.name}</h3>
                  </Link>
                  <p className="text-xs opacity-85 truncate">{cls.description || 'Academic course'}</p>
                </div>
                
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="text-xs text-muted flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium shrink-0">
                      {cls.teacher?.name ? cls.teacher.name.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <span className="truncate">{cls.teacher?.name || 'Instructor'}</span>
                  </div>

                  <div className="text-xs text-muted flex justify-between items-center border-t border-border pt-3">
                    <span className="font-mono text-[11px] bg-base px-2 py-0.5 rounded border border-border">
                      {cls.code || cls.classCode || 'OPEN'}
                    </span>
                    <Link to={`/classes/${cls._id}`} className="text-primary-600 hover:underline flex items-center gap-1 font-medium">
                      Course Details <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            ))}

            {classes.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted border border-dashed border-border rounded-xl">
                <BookOpen size={32} className="text-muted mb-2" />
                <h3 className="text-sm font-semibold text-content">No courses available yet</h3>
                <p className="text-xs text-muted mt-1">Faculty course offerings will appear here as soon as they are created.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attendance & Upcoming Work Section */}
      {!loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Real Attendance Card */}
          <div className="card-surface p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-semibold text-content flex items-center gap-2">
                <Clock size={16} className="text-primary-600" />
                Attendance Standing
              </h3>
              <span className="text-xs text-muted">Excludes approved leaves</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold tracking-tight text-primary-600 dark:text-primary-400">
                  {dashboardData.attendance}%
                </div>
                <p className="text-xs text-muted mt-1">
                  {dashboardData.attendance >= 75
                    ? 'In good standing (Meets minimum 75% requirement)'
                    : 'Notice: Below required 75% attendance threshold'}
                </p>
              </div>
              <button
                onClick={() => setShowOtpModal(true)}
                className="btn-secondary text-xs px-3 py-2"
              >
                Enter OTP
              </button>
            </div>
          </div>

          {/* Upcoming Assignments / Tasks */}
          <div className="card-surface p-6 rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-semibold text-content flex items-center gap-2">
                <FileText size={16} className="text-primary-600" />
                Upcoming Coursework ({dashboardData.upcomingAssessments.length})
              </h3>
            </div>
            {dashboardData.upcomingAssessments.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.upcomingAssessments.map(item => (
                  <div key={item._id} className="p-3 bg-base rounded-lg border border-border flex items-center justify-between">
                    <div>
                      <Link to={`/classes/${item.classId}/assignments/${item._id}`} className="text-sm font-medium text-content hover:underline block">
                        {item.title}
                      </Link>
                      <span className="text-xs text-muted">
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </span>
                    </div>
                    <Link to={`/classes/${item.classId}`} className="text-xs text-primary-600 hover:underline shrink-0">
                      View →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-xs text-center py-6">No upcoming assignments due soon.</p>
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

          {/* Recent Materials */}
          <div className="card-surface p-6 rounded-xl border border-border">
            <h3 className="text-sm font-semibold text-content mb-4 border-b border-border pb-3">Course Materials</h3>
            {dashboardData.recentMaterials && dashboardData.recentMaterials.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentMaterials.map(mat => (
                  <div key={mat._id} className="border-l-2 border-teal-500 pl-3 py-1">
                    <button 
                      onClick={() => setViewingMaterial(mat)}
                      className="text-xs font-semibold text-content truncate hover:underline text-left block"
                    >
                      {mat.title}
                    </button>
                    {mat.description && <p className="text-xs text-muted mt-0.5 truncate">{mat.description}</p>}
                    <p className="text-[10px] text-muted opacity-70 mt-1">{new Date(mat.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-xs text-center py-6">No study materials shared yet.</p>
            )}
          </div>

          {/* My Leave Applications & Review Status */}
          <div className="card-surface p-6 rounded-xl border border-border col-span-1 lg:col-span-2">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-sm font-semibold text-content flex items-center gap-2">
                <Calendar size={16} className="text-amber-500" />
                Leave Applications & Approvals ({(dashboardData.leaves || []).length})
              </h3>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="btn-secondary text-xs py-1 px-2.5"
              >
                + New Application
              </button>
            </div>
            {(dashboardData.leaves && dashboardData.leaves.length > 0) ? (
              <div className="space-y-3">
                {dashboardData.leaves.map(l => (
                  <div key={l._id} className="p-3 bg-base rounded-lg border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-content">{l.classId?.name || 'Course'}</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full capitalize ${
                          l.status === 'approved' 
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                            : l.status === 'rejected'
                            ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800'
                            : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                        }`}>
                          {l.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted">
                        Dates: {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-content italic">"{l.reason}"</p>
                      {(l.teacherComment || l.reviewNote) && (
                        <p className="text-xs text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/20 p-2 rounded mt-1">
                          <span className="font-semibold">Faculty Note:</span> {l.teacherComment || l.reviewNote}
                        </p>
                      )}
                    </div>
                    {l.status === 'pending' && (
                      <button
                        onClick={() => handleCancelLeave(l._id)}
                        className="btn-secondary text-xs py-1 px-3 text-red-600 hover:text-red-700 self-start sm:self-center"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-xs text-center py-6">No leave applications submitted yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 rounded-xl border border-border shadow-xl">
            <div className="px-6 py-4 border-b border-border bg-base">
              <h3 className="text-base font-semibold text-content">Enroll in Course</h3>
              <p className="text-xs text-muted mt-0.5">Enter the course enrollment code given by your instructor</p>
            </div>
            <form onSubmit={handleJoinClass}>
              <div className="p-6 space-y-4">
                {error && <div className="text-red-600 text-xs bg-red-50 dark:bg-red-950/40 p-3 rounded-md border border-red-200 dark:border-red-800">{error}</div>}
                
                <div>
                  <label className="block text-xs font-medium text-content mb-1">Enrollment Code</label>
                  <input 
                    required 
                    type="text" 
                    value={classCode} 
                    onChange={e => setClassCode(e.target.value)} 
                    className="input-field uppercase font-mono tracking-wider text-center text-lg" 
                    placeholder="e.g. CS101-AI"
                    maxLength={15}
                  />
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-base border-t border-border">
                <button type="button" onClick={() => setShowJoinModal(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" disabled={!classCode.trim() || isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? 'Verifying...' : 'Enroll'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 rounded-xl border border-border shadow-xl">
            <div className="px-6 py-4 border-b border-border bg-base">
              <h3 className="text-base font-semibold text-content flex items-center gap-2">
                <Clock size={18} className="text-primary-600" />
                Submit Attendance OTP
              </h3>
              <p className="text-xs text-muted mt-0.5">Enter the 6-digit session code shown on your classroom display</p>
            </div>
            <form onSubmit={handleSubmitOtp}>
              <div className="p-6 space-y-4">
                {otpMessage.text && (
                  <div className={`p-3 rounded-md text-xs border flex items-center gap-2 ${
                    otpMessage.isError 
                      ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                  }`}>
                    {otpMessage.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{otpMessage.text}</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-medium text-content mb-1">Select Class</label>
                  <select
                    value={selectedClassForOtp}
                    onChange={(e) => setSelectedClassForOtp(e.target.value)}
                    className="input-field text-xs"
                    required
                  >
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-content mb-1">6-Digit Code</label>
                  <input
                    required
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    placeholder="482910"
                    className="input-field text-center font-mono text-2xl tracking-widest"
                  />
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-base border-t border-border">
                <button type="button" onClick={() => setShowOtpModal(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" disabled={enteredOtp.length !== 6 || isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? 'Verifying...' : 'Check In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 rounded-xl border border-border shadow-xl">
            <div className="px-6 py-4 border-b border-border bg-base">
              <h3 className="text-base font-semibold text-content flex items-center gap-2">
                <Calendar size={18} className="text-amber-500" />
                Submit Leave Application
              </h3>
              <p className="text-xs text-muted mt-0.5">Approved leaves are automatically excused from attendance counts</p>
            </div>
            <form onSubmit={handleApplyLeave}>
              <div className="p-6 space-y-4">
                {leaveMessage.text && (
                  <div className={`p-3 rounded-md text-xs border flex items-center gap-2 ${
                    leaveMessage.isError 
                      ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800' 
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800'
                  }`}>
                    {leaveMessage.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{leaveMessage.text}</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-medium text-content mb-1">Class</label>
                  <select
                    value={leaveForm.classId}
                    onChange={(e) => setLeaveForm({ ...leaveForm, classId: e.target.value })}
                    className="input-field text-xs"
                    required
                  >
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-content mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      className="input-field text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-content mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                      className="input-field text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-content mb-1">Reason for Absence</label>
                  <textarea
                    required
                    rows={3}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    placeholder="Provide justification for academic leave..."
                    className="input-field text-xs resize-none"
                  ></textarea>
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-base border-t border-border">
                <button type="button" onClick={() => setShowLeaveModal(false)} className="btn-secondary text-xs">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary text-xs">
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
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

export default StudentDashboard;
