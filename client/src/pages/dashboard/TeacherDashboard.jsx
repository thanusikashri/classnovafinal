import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MoreVertical, Users, Check, X, Clock, Calendar, CheckCircle, XCircle } from 'lucide-react';
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
    todaysAttendance: [],
    pendingLeaves: [],
    recentMaterials: []
  });

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/teacher');
      setClasses(res.data.data.classes);
      setDashboardData({
        announcements: res.data.data.announcements || [],
        todaysAttendance: res.data.data.todaysAttendance || [],
        pendingLeaves: res.data.data.pendingLeaves || [],
        recentMaterials: res.data.data.recentMaterials || []
      });
      if (res.data.data.classes.length > 0 && !selectedClassForAttendance) {
        setSelectedClassForAttendance(res.data.data.classes[0]._id);
      }
    } catch (err) {
      console.error(err);
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
      await api.put(`/attendance/sessions/${activeSession.sessionId}/close`);
      setActiveSession(null);
      setCountdown(0);
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || 'Error closing session');
    }
  };

  const handleReviewLeave = async (leaveId, status) => {
    try {
      await api.put(`/leaves/${leaveId}/review`, { status });
      fetchDashboard();
    } catch (err) {
      alert(err.response?.data?.message || `Error ${status} leave`);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/classes', { name: newClassName, description: newClassDesc });
      setShowModal(false);
      setNewClassName('');
      setNewClassDesc('');
      fetchDashboard();
    } catch (err) {
      console.error(err);
      alert('Error creating class');
    } finally {
      setIsSubmitting(false);
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
    <div className="space-y-8">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium text-content">Teacher Dashboard</h1>
          <p className="text-sm text-muted mt-1">Manage classes, attendance sessions, and student requests</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary"
          >
            <Plus size={20} />
            <span>Create Class</span>
          </button>
        </div>
      </div>

      {/* Quick Attendance Launcher Widget */}
      {classes.length > 0 && (
        <div className="card-surface p-6 border-l-4 border-primary-600">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400 rounded-xl">
                <Clock size={24} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-content">Quick Attendance Session</h3>
                <p className="text-xs text-muted">Generate a 60-second secure OTP code for students present in class</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {!activeSession ? (
                <>
                  <select
                    value={selectedClassForAttendance}
                    onChange={(e) => setSelectedClassForAttendance(e.target.value)}
                    className="input-field py-2 text-sm max-w-xs"
                  >
                    {classes.map(c => (
                      <option key={c._id} value={c._id}>{c.name}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleStartAttendance}
                    disabled={startingSession}
                    className="btn-primary text-sm whitespace-nowrap"
                  >
                    {startingSession ? 'Generating...' : 'Start OTP Session'}
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-4 bg-primary-50 dark:bg-primary-950/40 px-4 py-2 rounded-lg border border-primary-200 dark:border-primary-800">
                  <div className="text-center">
                    <span className="text-xs text-muted block">Current OTP</span>
                    <span className="text-2xl font-mono font-bold tracking-widest text-primary-600 dark:text-primary-400">
                      {activeSession.otp}
                    </span>
                  </div>
                  <div className="text-center pl-4 border-l border-primary-200 dark:border-primary-800">
                    <span className="text-xs text-muted block">Expires in</span>
                    <span className="text-lg font-bold text-red-500 font-mono">
                      {countdown}s
                    </span>
                  </div>
                  <button
                    onClick={handleCloseAttendance}
                    className="btn-secondary text-xs text-red-600 hover:text-red-700 ml-2"
                  >
                    End Early
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Managed Classes Grid */}
      <div>
        <h2 className="text-lg font-semibold text-content mb-4">My Classes</h2>
        {loading ? (
          <div className="flex justify-center py-16 text-muted">Loading classes...</div>
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
                  <div className="space-y-1">
                    <span className="text-xs text-muted font-medium block">Enrollment Code</span>
                    <span className="text-base font-mono font-semibold text-primary-600 dark:text-primary-400">
                      {cls.classCode}
                    </span>
                  </div>

                  <div className="text-xs text-muted flex justify-between items-center border-t border-border pt-3">
                    <span className="font-medium text-content">{cls.students?.length || 0} students enrolled</span>
                    <Link to={`/classes/${cls._id}`} className="text-primary-600 hover:underline">
                      Open →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            {classes.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted border border-dashed border-border rounded-xl">
                <div className="bg-surface border border-border p-4 rounded-full mb-3">
                  <Users size={36} className="text-muted" />
                </div>
                <h3 className="text-base font-medium text-content mb-1">Add a class to get started</h3>
                <p className="text-xs">Create a class to manage students, attendance, materials, and assignments.</p>
                <button
                  onClick={() => setShowModal(true)}
                  className="mt-4 btn-primary text-sm"
                >
                  Create Class
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Lower Dashboard Sections */}
      {!loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pending Leaves Review */}
          <div className="card-surface p-6">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-base font-medium text-content flex items-center gap-2">
                <Calendar size={18} className="text-amber-500" />
                Pending Leaves ({dashboardData.pendingLeaves.length})
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
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 font-medium">
                        {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-content italic">"{leave.reason}"</p>
                    <div className="flex justify-end gap-2 pt-1 border-t border-border">
                      <button
                        onClick={() => handleReviewLeave(leave._id, 'rejected')}
                        className="btn-secondary text-xs py-1 px-3 text-red-600 hover:text-red-700"
                      >
                        Reject
                      </button>
                      <button
                        onClick={() => handleReviewLeave(leave._id, 'approved')}
                        className="btn-primary text-xs py-1 px-3 bg-green-600 hover:bg-green-700 text-white"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm py-4">No pending leave applications requiring review.</p>
            )}
          </div>
          
          {/* Today's Attendance Sessions */}
          <div className="card-surface p-6">
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-base font-medium text-content flex items-center gap-2">
                <Clock size={18} className="text-primary-600" />
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
                      <span className="text-sm font-bold text-primary-600 dark:text-primary-400">
                        {sess.presentCount} Present
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm py-4">No attendance sessions conducted today yet.</p>
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
              <p className="text-muted text-sm py-4">No recent announcements across your classes.</p>
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
                    <p className="text-xs text-muted">{mat.classId?.name}</p>
                    {mat.description && <p className="text-sm text-muted mt-1 truncate">{mat.description}</p>}
                    <p className="text-[10px] text-muted opacity-70 mt-1">{new Date(mat.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-sm py-4">No recent materials across your classes.</p>
            )}
          </div>
        </div>
      )}

      {/* Create Class Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4">
              <h3 className="text-lg font-medium text-content">Create Class</h3>
            </div>
            <form onSubmit={handleCreateClass}>
              <div className="px-6 py-4 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Class Name</label>
                  <input 
                    required 
                    type="text" 
                    value={newClassName} 
                    onChange={e => setNewClassName(e.target.value)} 
                    className="input-field" 
                    placeholder="e.g. Advanced AI & Algorithms"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Section / Description</label>
                  <input 
                    type="text" 
                    value={newClassDesc} 
                    onChange={e => setNewClassDesc(e.target.value)} 
                    className="input-field" 
                    placeholder="e.g. Fall Semester, CS-401"
                  />
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-base border-t border-border">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={!newClassName.trim() || isSubmitting} className="btn-primary">
                  {isSubmitting ? 'Creating...' : 'Create'}
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
