import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MoreVertical, BookOpen, Clock, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';
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
        pendingLeaves: res.data.data.pendingLeaves || [],
        recentMaterials: res.data.data.recentMaterials || [],
        upcomingAssessments: res.data.data.upcomingAssessments || []
      });
      if (res.data.data.classes?.length > 0) {
        if (!selectedClassForOtp) setSelectedClassForOtp(res.data.data.classes[0]._id);
        if (!leaveForm.classId) setLeaveForm(prev => ({ ...prev, classId: res.data.data.classes[0]._id }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [selectedClassForOtp, leaveForm.classId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleJoinClass = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await api.post('/classes/enroll', { classCode });
      setShowJoinModal(false);
      setClassCode('');
      fetchDashboard();
    } catch (err) {
      setError(err.response?.data?.message || 'Error joining class');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    setOtpMessage({ text: '', isError: false });
    setIsSubmitting(true);
    try {
      // First get active session for this class
      const sessionRes = await api.get(`/attendance/classes/${selectedClassForOtp}/active`);
      if (!sessionRes.data.data) {
        setOtpMessage({ text: 'No active attendance session currently running for this class.', isError: true });
        setIsSubmitting(false);
        return;
      }

      const sessionId = sessionRes.data.data.sessionId;
      await api.post('/attendance/submit', { sessionId, otp: enteredOtp });
      setOtpMessage({ text: 'Attendance marked successfully!', isError: false });
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

  const getBannerGradient = (index) => {
    const gradients = [
      'bg-blue-600',
      'bg-indigo-600',
      'bg-teal-600',
      'bg-rose-600',
      'bg-emerald-600',
      'bg-purple-600'
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div className="space-y-8 font-sans">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-content">Student Dashboard</h1>
          <p className="text-sm text-muted mt-1">Overview of your enrolled classes, attendance, and materials</p>
        </div>
        <div className="flex items-center gap-3">
          {classes.length > 0 && (
            <>
              <button
                onClick={() => setShowOtpModal(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Clock size={16} />
                <span>Submit OTP</span>
              </button>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Calendar size={16} />
                <span>Apply Leave</span>
              </button>
            </>
          )}
          <button
            onClick={() => setShowJoinModal(true)}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus size={18} />
            <span>Join Class</span>
          </button>
        </div>
      </div>

      {/* Classes Grid */}
      <div>
        <h2 className="text-lg font-semibold text-content mb-4">My Enrolled Classes</h2>
        {loading ? (
          <div className="flex justify-center py-16 text-muted">Loading enrolled classes...</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {classes.map((cls, idx) => (
              <div key={cls._id} className="card-surface overflow-hidden hover:shadow-lg flex flex-col h-72 relative group">
                <Link to={`/classes/${cls._id}`} className={`h-24 p-4 text-white relative block ${getBannerGradient(idx)}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-medium truncate hover:underline" title={cls.name}>{cls.name}</h3>
                      <p className="text-sm opacity-90 truncate mt-1" title={cls.description}>{cls.description || 'No description'}</p>
                    </div>
                  </div>
                </Link>
                
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="text-xs text-muted flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 dark:bg-primary-900/50 dark:text-primary-300 flex items-center justify-center font-medium">
                      {cls.teacher?.name ? cls.teacher.name.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <span className="truncate">{cls.teacher?.name || 'Unknown Teacher'}</span>
                  </div>

                  <div className="text-xs text-muted flex justify-between items-center border-t border-border pt-3">
                    <span>{cls.students?.length || 0} classmates</span>
                    <Link to={`/classes/${cls._id}`} className="text-primary-600 hover:underline">
                      View Class →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {classes.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted border border-dashed border-border rounded-xl">
                <div className="bg-surface border border-border p-4 rounded-full mb-3">
                  <BookOpen size={36} className="text-muted" />
                </div>
                <h3 className="text-base font-medium text-content mb-1">You haven't joined any classes yet</h3>
                <p className="text-xs mb-4">Enter a 6-character class code from your teacher to join.</p>
                <button
                  onClick={() => setShowJoinModal(true)}
                  className="btn-primary text-sm"
                >
                  Join Class
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attendance & Leave Metric Panels */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Real Attendance Percentage Card */}
          <div className="card-surface p-6">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-base font-medium text-content flex items-center gap-2">
                <Clock size={18} className="text-primary-600" />
                Overall Attendance
              </h3>
              <span className="text-xs text-muted">Excludes approved leave dates</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
                  {dashboardData.attendance}%
                </div>
                <p className="text-xs text-muted mt-1">
                  {dashboardData.attendance >= 75
                    ? 'Good standing (Above standard 75% requirement)'
                    : 'Attention: Attendance below 75% threshold'}
                </p>
              </div>
              <button
                onClick={() => setShowOtpModal(true)}
                className="btn-secondary text-xs px-3 py-2"
              >
                Mark Attendance
              </button>
            </div>
          </div>

          {/* Pending Leaves Card */}
          <div className="card-surface p-6">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-base font-medium text-content flex items-center gap-2">
                <Calendar size={18} className="text-amber-500" />
                Pending Leaves ({dashboardData.pendingLeaves.length})
              </h3>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="text-xs text-primary-600 hover:underline"
              >
                + New Application
              </button>
            </div>
            {dashboardData.pendingLeaves.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.pendingLeaves.map(leave => (
                  <div key={leave._id} className="p-3 bg-base rounded-lg border border-border flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-content block">{leave.classId?.name}</span>
                      <span className="text-xs text-muted">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()} • "{leave.reason}"
                      </span>
                    </div>
                    <button
                      onClick={() => handleCancelLeave(leave._id)}
                      className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm py-4">No pending leave applications.</p>
            )}
          </div>

          {/* Recent Announcements */}
          <div className="card-surface p-6">
            <h3 className="text-base font-medium text-content mb-4 border-b border-border pb-3">Recent Announcements</h3>
            {dashboardData.announcements.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.announcements.map(ann => (
                  <div key={ann._id} className="border-l-2 border-primary-500 pl-4 py-1">
                    <p className="text-sm font-medium text-content">{ann.classId?.name}</p>
                    <p className="text-sm text-muted mt-1">{ann.content}</p>
                    <p className="text-xs text-muted mt-2">{new Date(ann.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm py-4">No recent announcements in your classes.</p>
            )}
          </div>

          {/* Recent Materials */}
          <div className="card-surface p-6">
            <h3 className="text-base font-medium text-content mb-4 border-b border-border pb-3">Recent Materials</h3>
            {dashboardData.recentMaterials && dashboardData.recentMaterials.length > 0 ? (
              <div className="space-y-4">
                {dashboardData.recentMaterials.map(mat => (
                  <div key={mat._id} className="border-l-2 border-teal-500 pl-4 py-1">
                    <button 
                      onClick={() => setViewingMaterial(mat)}
                      className="text-sm font-medium text-content truncate hover:underline text-left block"
                    >
                      {mat.title}
                    </button>
                    <p className="text-xs text-muted">{mat.classId?.name} • {mat.teacher?.name}</p>
                    {mat.description && <p className="text-sm text-muted mt-1 truncate">{mat.description}</p>}
                    <p className="text-[10px] text-muted opacity-70 mt-1">{new Date(mat.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm py-4">No recent materials in your classes.</p>
            )}
          </div>
        </div>
      )}

      {/* Join Class Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-medium text-content">Join Class</h3>
              <p className="text-xs text-muted mt-1">Enter the 6-character code from your teacher.</p>
            </div>
            <form onSubmit={handleJoinClass}>
              <div className="px-6 py-4 space-y-4">
                {error && <div className="text-red-600 text-sm bg-red-50 dark:bg-red-950/40 p-3 rounded-md border border-red-200 dark:border-red-800">{error}</div>}
                
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Class Code</label>
                  <input 
                    required 
                    type="text" 
                    value={classCode} 
                    onChange={e => setClassCode(e.target.value)} 
                    className="input-field uppercase font-mono tracking-wider text-center text-lg" 
                    placeholder="e.g. 7A8B9C"
                    maxLength={10}
                  />
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-base border-t border-border">
                <button type="button" onClick={() => setShowJoinModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={!classCode.trim() || isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Submit OTP Attendance Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-medium text-content flex items-center gap-2">
                <Clock size={20} className="text-primary-600" />
                Submit Attendance OTP
              </h3>
              <p className="text-xs text-muted mt-1">Enter the active 6-digit code shared by your teacher.</p>
            </div>
            <form onSubmit={handleSubmitOtp}>
              <div className="px-6 py-4 space-y-4">
                {otpMessage.text && (
                  <div className={`p-3 rounded-md text-sm border flex items-center gap-2 ${
                    otpMessage.isError 
                      ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800' 
                      : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/40 dark:border-green-800'
                  }`}>
                    {otpMessage.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{otpMessage.text}</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Select Class</label>
                  <select
                    value={selectedClassForOtp}
                    onChange={(e) => setSelectedClassForOtp(e.target.value)}
                    className="input-field text-sm"
                    required
                  >
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">6-Digit OTP</label>
                  <input
                    required
                    type="text"
                    maxLength={6}
                    value={enteredOtp}
                    onChange={(e) => setEnteredOtp(e.target.value)}
                    placeholder="123456"
                    className="input-field text-center font-mono text-2xl tracking-widest"
                  />
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-base border-t border-border">
                <button type="button" onClick={() => setShowOtpModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={enteredOtp.length !== 6 || isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Verifying...' : 'Submit Attendance'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showLeaveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border">
              <h3 className="text-lg font-medium text-content flex items-center gap-2">
                <Calendar size={20} className="text-amber-500" />
                Apply for Leave
              </h3>
              <p className="text-xs text-muted mt-1">Approved leaves will be excluded from attendance percentage.</p>
            </div>
            <form onSubmit={handleApplyLeave}>
              <div className="px-6 py-4 space-y-4">
                {leaveMessage.text && (
                  <div className={`p-3 rounded-md text-sm border flex items-center gap-2 ${
                    leaveMessage.isError 
                      ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-950/40 dark:border-red-800' 
                      : 'bg-green-50 text-green-600 border-green-200 dark:bg-green-950/40 dark:border-green-800'
                  }`}>
                    {leaveMessage.isError ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
                    <span>{leaveMessage.text}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Class</label>
                  <select
                    value={leaveForm.classId}
                    onChange={(e) => setLeaveForm({ ...leaveForm, classId: e.target.value })}
                    className="input-field text-sm"
                    required
                  >
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Start Date</label>
                    <input
                      required
                      type="date"
                      value={leaveForm.startDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">End Date</label>
                    <input
                      required
                      type="date"
                      value={leaveForm.endDate}
                      onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                      className="input-field text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Reason for Leave</label>
                  <textarea
                    required
                    rows={3}
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                    className="input-field text-sm"
                    placeholder="e.g. Medical emergency, attending academic conference..."
                  />
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-base border-t border-border">
                <button type="button" onClick={() => setShowLeaveModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
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
