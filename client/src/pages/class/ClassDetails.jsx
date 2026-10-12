import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MoreVertical, ClipboardList, Plus, FileText, CheckSquare, BookOpen, Clock } from 'lucide-react';
import api from '../../services/api';
import MaterialModal from '../../components/MaterialModal';

const ClassDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [attendanceReport, setAttendanceReport] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [studentOtpInput, setStudentOtpInput] = useState('');
  const [otpMessage, setOtpMessage] = useState({ text: '', isError: false });
  const [activeTab, setActiveTab] = useState('stream');
  const [viewingMaterial, setViewingMaterial] = useState(null);
  
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newAssign, setNewAssign] = useState({ title: '', description: '', dueDate: '', maxMarks: 100 });
  const [isAssigning, setIsAssigning] = useState(false);

  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ title: '', description: '', file: null });
  const [isUploading, setIsUploading] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  const fetchClassData = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${id}`);
      setClassData(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${id}/announcements`);
      setAnnouncements(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${id}/assignments`);
      setAssignments(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchQuizzes = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${id}/quizzes`);
      setQuizzes(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${id}/materials`);
      setMaterials(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchAttendance = useCallback(async () => {
    try {
      const [reportRes, activeRes] = await Promise.all([
        api.get(`/attendance/classes/${id}/report`).catch(() => null),
        api.get(`/attendance/classes/${id}/active`).catch(() => null)
      ]);
      if (reportRes?.data?.data) {
        setAttendanceReport(reportRes.data.data);
      }
      if (activeRes?.data?.data) {
        setActiveSession(activeRes.data.data);
        const rem = Math.max(0, Math.floor((new Date(activeRes.data.data.expiresAt) - new Date()) / 1000));
        setCountdown(rem);
      } else {
        setActiveSession(null);
      }
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    }
  }, [id]);

  useEffect(() => {
    fetchClassData();
    fetchAnnouncements();
    fetchAssignments();
    fetchQuizzes();
    fetchMaterials();
    fetchAttendance();
  }, [fetchClassData, fetchAnnouncements, fetchAssignments, fetchQuizzes, fetchMaterials, fetchAttendance]);

  useEffect(() => {
    let timer;
    if (activeSession && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setActiveSession(null);
            fetchAttendance();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeSession, countdown, fetchAttendance]);

  const handleStartAttendance = async () => {
    try {
      const res = await api.post(`/attendance/classes/${id}/start`);
      setActiveSession(res.data.data);
      const rem = Math.max(0, Math.floor((new Date(res.data.data.expiresAt) - new Date()) / 1000));
      setCountdown(rem);
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.message || 'Error starting attendance session');
    }
  };

  const handleCloseAttendance = async () => {
    if (!activeSession) return;
    try {
      await api.put(`/attendance/sessions/${activeSession.sessionId || activeSession._id}/close`);
      setActiveSession(null);
      setCountdown(0);
      fetchAttendance();
    } catch (err) {
      alert(err.response?.data?.message || 'Error closing attendance session');
    }
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    setOtpMessage({ text: '', isError: false });
    if (!activeSession) {
      setOtpMessage({ text: 'No active session found', isError: true });
      return;
    }
    try {
      await api.post('/attendance/submit', {
        sessionId: activeSession.sessionId || activeSession._id,
        otp: studentOtpInput
      });
      setOtpMessage({ text: 'Attendance marked successfully!', isError: false });
      setStudentOtpInput('');
      fetchAttendance();
    } catch (err) {
      setOtpMessage({ text: err.response?.data?.message || 'Invalid or expired OTP', isError: true });
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/classes/${id}/announcements`, { 
        content: newAnnouncement.trim(),
        title: newAnnouncement.trim().substring(0, 60)
      });
      setNewAnnouncement('');
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to post announcement. Please check permissions.';
      alert(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssign.title.trim()) {
      alert('Please enter an assignment title');
      return;
    }
    setIsAssigning(true);
    try {
      const payload = { 
        title: newAssign.title.trim(),
        description: newAssign.description.trim() || 'Please complete the instructions assigned for this task.',
        maxMarks: Number(newAssign.maxMarks) || 100
      };
      if (newAssign.dueDate) {
        payload.dueDate = new Date(newAssign.dueDate).toISOString();
      }
      await api.post(`/classes/${id}/assignments`, payload);
      setShowAssignModal(false);
      setNewAssign({ title: '', description: '', dueDate: '', maxMarks: 100 });
      await fetchAssignments();
      setActiveTab('classwork');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.data?.message || 'Failed to create assignment. Please check permissions.';
      alert(errMsg);
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterial.title.trim()) return;
    if (!editingMaterial && !newMaterial.file) return;
    setIsUploading(true);
    
    const formData = new FormData();
    formData.append('title', newMaterial.title);
    formData.append('description', newMaterial.description || '');
    if (newMaterial.file) {
      formData.append('file', newMaterial.file);
    }

    try {
      if (editingMaterial) {
        await api.put(`/classes/${id}/materials/${editingMaterial._id}`, formData);
      } else {
        await api.post(`/classes/${id}/materials`, formData);
      }
      setShowMaterialModal(false);
      setEditingMaterial(null);
      setNewMaterial({ title: '', description: '', file: null });
      fetchMaterials();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error saving material');
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditMaterial = (m) => {
    setEditingMaterial(m);
    setNewMaterial({ title: m.title, description: m.description, file: null });
    setShowMaterialModal(true);
  };

  const handleDeleteMaterial = async (materialId) => {
    if (!window.confirm('Are you sure you want to delete this material?')) return;
    try {
      await api.delete(`/classes/${id}/materials/${materialId}`);
      fetchMaterials();
    } catch (err) {
      console.error(err);
      alert('Error deleting material');
    }
  };

  if (loading || !classData) {
    return <div className="flex justify-center py-20 text-muted">Loading...</div>;
  }

  const isTeacher = user.role === 'admin' || (user.role === 'teacher' && classData.teacher._id === user._id);
  const gradientClass = 'bg-gradient-to-r from-primary-700 to-indigo-600';

  return (
    <div className="max-w-5xl mx-auto pb-12 font-sans">
      
      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {['stream', 'classwork', 'people', 'attendance'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium capitalize transition-colors relative ${
              activeTab === tab 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-muted hover:text-content hover:bg-surface rounded-t-lg'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 w-full h-1 bg-primary-600 rounded-t-md"></span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'stream' && (
        <div className="space-y-6">
          <div className={`${gradientClass} rounded-xl h-48 sm:h-64 relative flex flex-col justify-end p-6 text-white shadow-sm overflow-hidden`}>
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <div className="relative z-10">
              <h1 className="text-3xl sm:text-4xl font-medium mb-1 drop-shadow-md">{classData.name}</h1>
              {classData.description && <p className="text-lg opacity-90 drop-shadow-md">{classData.description}</p>}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            <div className="hidden md:block w-64 space-y-4 shrink-0">
              {isTeacher && (
                <div className="card-surface p-4">
                  <h3 className="text-sm font-medium text-muted mb-1">Class code</h3>
                  <div className="text-2xl text-primary-600 dark:text-primary-400 font-mono tracking-wider">{classData.classCode}</div>
                </div>
              )}
              <div className="card-surface p-4">
                <h3 className="text-sm font-medium text-muted mb-3">Upcoming</h3>
                {assignments.filter(a => a.dueDate && new Date(a.dueDate) > new Date()).length > 0 || quizzes.filter(q => q.endTime && new Date(q.endTime) > new Date()).length > 0 ? (
                  <ul className="text-sm space-y-2 mb-4">
                    {assignments.filter(a => a.dueDate && new Date(a.dueDate) > new Date()).slice(0,2).map(a => (
                      <li key={a._id} className="text-content truncate">
                        <Link to={`/classes/${id}/assignments/${a._id}`} className="hover:underline flex items-center gap-1"><FileText size={14}/>{a.title}</Link>
                      </li>
                    ))}
                    {quizzes.filter(q => q.endTime && new Date(q.endTime) > new Date()).slice(0,2).map(q => (
                      <li key={q._id} className="text-content truncate">
                        <Link to={`/classes/${id}/quizzes/${q._id}`} className="hover:underline flex items-center gap-1"><CheckSquare size={14}/>{q.title}</Link>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted mb-4">No work due soon</p>
                )}
                <button onClick={() => setActiveTab('classwork')} className="text-sm text-primary-600 dark:text-primary-400 font-medium hover:underline focus:outline-none">View all</button>
              </div>
            </div>

            <div className="flex-1 space-y-4">
              {isTeacher && (
                <div className="card-surface overflow-hidden">
                  <div className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium shrink-0 shadow-sm">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <form onSubmit={handlePostAnnouncement} className="flex-1">
                      <textarea
                        value={newAnnouncement}
                        onChange={(e) => setNewAnnouncement(e.target.value)}
                        placeholder="Announce something to your class"
                        className="w-full bg-base hover:bg-surface focus:bg-surface px-4 py-3 border-b-2 border-transparent focus:border-primary-600 outline-none resize-none transition-colors duration-200 min-h-[50px] text-content"
                        rows={newAnnouncement.length > 50 ? 3 : 1}
                        required
                      ></textarea>
                      {newAnnouncement.trim().length > 0 && (
                        <div className="flex justify-end mt-3 gap-2">
                          <button 
                            type="button" 
                            onClick={() => setNewAnnouncement('')} 
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="btn-primary"
                          >
                            {isSubmitting ? 'Posting...' : 'Post'}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div key={ann._id} className="card-surface">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium shadow-sm">
                          {ann.author?.name ? ann.author.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <h4 className="font-medium text-content">{ann.author?.name || 'Unknown User'}</h4>
                          <p className="text-xs text-muted">
                            {new Date(ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <button className="p-2 rounded-full hover:bg-base text-muted transition-colors">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                    <div className="px-4 pb-4">
                      <p className="text-content whitespace-pre-wrap">{ann.content}</p>
                    </div>
                  </div>
                ))}
                
                {announcements.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center border border-border rounded-lg bg-base">
                    <ClipboardList size={48} className="text-muted mb-4" />
                    <h3 className="text-lg font-medium text-content mb-1">This is where you'll see updates</h3>
                    <p className="text-sm text-muted max-w-md">
                      {isTeacher 
                        ? "Use the stream to communicate with your class and post announcements." 
                        : "Your teacher hasn't posted any announcements yet."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'classwork' && (
        <div className="max-w-4xl mx-auto pt-4">
          {isTeacher && (
            <div className="flex justify-start mb-6 border-b border-border pb-6 gap-4">
              <button
                onClick={() => setShowAssignModal(true)}
                className="btn-primary"
              >
                <Plus size={20} />
                <span>Assignment</span>
              </button>
              <Link
                to={`/classes/${id}/quizzes/create`}
                className="flex items-center gap-2 bg-secondary-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-secondary-700 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
              >
                <Plus size={20} />
                <span>Quiz</span>
              </Link>
              <button
                onClick={() => setShowMaterialModal(true)}
                className="flex items-center gap-2 bg-teal-600 text-white px-6 py-2.5 rounded-full font-medium hover:bg-teal-700 transition-all shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                <Plus size={20} />
                <span>Material</span>
              </button>
            </div>
          )}

          <div className="space-y-4">
            {quizzes.map(q => (
              <Link 
                key={q._id} 
                to={`/classes/${id}/quizzes/${q._id}`}
                className="group flex items-center gap-4 card-surface p-4 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-full bg-secondary-100 text-secondary-600 dark:bg-secondary-900/50 dark:text-secondary-400 flex items-center justify-center group-hover:bg-secondary-200 group-hover:text-secondary-700 transition-colors shrink-0">
                  <CheckSquare size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-medium text-content truncate">{q.title}</h3>
                    {!q.isPublished && isTeacher && <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Draft</span>}
                  </div>
                  <div className="text-sm text-muted flex items-center gap-3">
                    <span>{q.durationMinutes} mins</span>
                    {q.endTime && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className={new Date(q.endTime) < new Date() ? 'text-red-500' : ''}>
                          Due {new Date(q.endTime).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            {assignments.map(a => (
              <Link 
                key={a._id} 
                to={`/classes/${id}/assignments/${a._id}`}
                className="group flex items-center gap-4 card-surface p-4 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 dark:bg-primary-900/50 dark:text-primary-400 group-hover:bg-primary-200 transition-colors shrink-0">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-medium text-content truncate">{a.title}</h3>
                  <div className="text-sm text-muted flex items-center gap-3">
                    <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                    {a.dueDate && (
                      <>
                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                        <span className={new Date(a.dueDate) < new Date() ? 'text-red-500' : ''}>
                          Due {new Date(a.dueDate).toLocaleDateString()}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </Link>
            ))}

            {materials.map(m => (
              <div key={m._id} className="relative group card-surface hover:shadow-md transition-shadow w-full flex items-center">
                <button 
                  onClick={() => setViewingMaterial(m)}
                  className="flex-1 flex items-center gap-4 p-4 text-left min-w-0"
                >
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 dark:bg-teal-900/50 dark:text-teal-400 group-hover:bg-teal-200 transition-colors shrink-0">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex-1 min-w-0 pr-16">
                    <h3 className="text-base font-medium text-content truncate">{m.title}</h3>
                    <div className="text-sm text-muted flex items-center gap-3">
                      <span>{new Date(m.createdAt).toLocaleDateString()}</span>
                      <span>Material</span>
                    </div>
                  </div>
                </button>
                {isTeacher && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleEditMaterial(m); }}
                      className="p-1.5 text-muted hover:text-primary-600 bg-base rounded-full shadow-sm border border-border"
                      title="Edit Material"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                    </button>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleDeleteMaterial(m._id); }}
                      className="p-1.5 text-muted hover:text-red-600 bg-base rounded-full shadow-sm border border-border"
                      title="Delete Material"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {(assignments.length === 0 && quizzes.length === 0 && materials.length === 0) && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="bg-base border border-border p-6 rounded-full mb-4">
                  <ClipboardList size={48} className="text-muted" />
                </div>
                <h2 className="text-xl font-medium text-content mb-2">No classwork yet</h2>
                <p className="text-muted max-w-md text-sm">
                  {isTeacher ? 'Create assignments or quizzes for your students here.' : 'Your teacher hasn\'t assigned any work yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'people' && (
        <div className="max-w-3xl mx-auto card-surface p-8 mt-4">
          <div className="mb-10">
            <div className="flex items-center justify-between border-b border-primary-500 pb-3 mb-6">
              <h2 className="text-2xl font-medium text-primary-600 dark:text-primary-400">Teacher</h2>
            </div>
            <div className="flex items-center gap-4 px-2">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-medium shadow-sm">
                {classData.teacher?.name ? classData.teacher.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <span className="text-content">{classData.teacher?.name || 'Unknown Teacher'}</span>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between border-b border-primary-500 pb-3 mb-6">
              <h2 className="text-2xl font-medium text-primary-600 dark:text-primary-400">Students</h2>
              <span className="text-primary-600 dark:text-primary-400 font-medium">{classData.students.length} students</span>
            </div>
            {classData.students.length === 0 ? (
              <p className="text-muted text-center py-6">No students are enrolled in this class yet.</p>
            ) : (
              <ul className="space-y-1">
                {classData.students.map((student) => (
                  <li key={student._id} className="flex items-center gap-4 p-3 hover:bg-surface rounded-lg transition-colors border-b border-border last:border-0">
                    <div className="w-10 h-10 rounded-full bg-base text-muted border border-border flex items-center justify-center font-medium shadow-sm shrink-0">
                      {student?.name ? student.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <span className="text-content font-medium">{student?.name || 'Unknown Student'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Teacher Attendance Controls */}
          {isTeacher ? (
            <div className="card-surface p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-medium text-content flex items-center gap-2">
                    <Clock size={20} className="text-primary-600" />
                    Attendance Session Manager
                  </h2>
                  <p className="text-xs text-muted mt-1">Start a timed OTP session for students currently in your classroom</p>
                </div>
                {!activeSession ? (
                  <button
                    onClick={handleStartAttendance}
                    className="btn-primary flex items-center gap-2 text-sm"
                  >
                    <Plus size={16} />
                    <span>Start OTP Session</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-4 bg-primary-50 dark:bg-primary-950/40 px-4 py-2 rounded-lg border border-primary-200 dark:border-primary-800">
                    <div>
                      <span className="text-xs text-muted block">Live OTP</span>
                      <span className="text-2xl font-mono font-bold tracking-widest text-primary-600 dark:text-primary-400">
                        {activeSession.otp}
                      </span>
                    </div>
                    <div className="pl-4 border-l border-primary-200 dark:border-primary-800">
                      <span className="text-xs text-muted block">Expires in</span>
                      <span className="text-lg font-bold text-red-500 font-mono">{countdown}s</span>
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

              {/* Class Attendance Summary & Student List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-medium text-content">
                    Enrolled Students Attendance ({attendanceReport?.students?.length || 0})
                  </h3>
                  <span className="text-xs text-muted">
                    Total Sessions: {attendanceReport?.totalSessions || 0}
                  </span>
                </div>

                {attendanceReport?.students && attendanceReport.students.length > 0 ? (
                  <div className="overflow-x-auto border border-border rounded-lg">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-base border-b border-border text-xs uppercase text-muted">
                        <tr>
                          <th className="p-3">Student</th>
                          <th className="p-3 text-center">Attended</th>
                          <th className="p-3 text-center">Approved Leaves</th>
                          <th className="p-3 text-center">Eligible Sessions</th>
                          <th className="p-3 text-right">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {attendanceReport.students.map(st => (
                          <tr key={st.student._id} className="hover:bg-surface">
                            <td className="p-3 font-medium text-content">
                              <div>{st.student.name}</div>
                              <div className="text-xs text-muted">{st.student.email}</div>
                            </td>
                            <td className="p-3 text-center text-content">{st.attendedSessions}</td>
                            <td className="p-3 text-center text-muted">{st.approvedLeaveSessions}</td>
                            <td className="p-3 text-center text-muted">{st.eligibleSessions}</td>
                            <td className="p-3 text-right">
                              <span className={`font-semibold px-2 py-0.5 rounded text-xs ${
                                st.percentage >= 75 ? 'bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                              }`}>
                                {st.percentage}%
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted text-sm py-4">No student records to display.</p>
                )}
              </div>
            </div>
          ) : (
            /* Student Attendance View */
            <div className="space-y-6">
              {/* Active Session OTP Submission */}
              {activeSession && (
                <div className="card-surface p-6 border-l-4 border-primary-600">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-content flex items-center gap-2">
                        <Clock size={18} className="text-primary-600" />
                        Live Attendance Session is Active!
                      </h3>
                      <p className="text-xs text-muted mt-1">Enter the 6-digit code shared by your teacher. Expires in {countdown}s</p>
                    </div>
                    <form onSubmit={handleSubmitAttendance} className="flex items-center gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        required
                        value={studentOtpInput}
                        onChange={e => setStudentOtpInput(e.target.value)}
                        placeholder="6-digit OTP"
                        className="input-field max-w-[140px] text-center font-mono font-semibold"
                      />
                      <button type="submit" className="btn-primary text-sm whitespace-nowrap">
                        Submit
                      </button>
                    </form>
                  </div>
                  {otpMessage.text && (
                    <div className={`mt-3 text-xs p-2 rounded ${otpMessage.isError ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400'}`}>
                      {otpMessage.text}
                    </div>
                  )}
                </div>
              )}

              {/* Personal Class Attendance Card */}
              <div className="card-surface p-6">
                <h3 className="text-lg font-medium text-content mb-4 border-b border-border pb-2">
                  My Attendance in this Class
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-base p-4 rounded-xl border border-border">
                    <span className="text-xs text-muted block mb-1">Percentage</span>
                    <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                      {attendanceReport?.percentage !== undefined ? attendanceReport.percentage : 100}%
                    </span>
                  </div>
                  <div className="bg-base p-4 rounded-xl border border-border">
                    <span className="text-xs text-muted block mb-1">Attended</span>
                    <span className="text-2xl font-bold text-content">
                      {attendanceReport?.attendedSessions || 0}
                    </span>
                  </div>
                  <div className="bg-base p-4 rounded-xl border border-border">
                    <span className="text-xs text-muted block mb-1">Approved Leaves</span>
                    <span className="text-2xl font-bold text-content">
                      {attendanceReport?.approvedLeaveSessions || 0}
                    </span>
                  </div>
                  <div className="bg-base p-4 rounded-xl border border-border">
                    <span className="text-xs text-muted block mb-1">Total Sessions</span>
                    <span className="text-2xl font-bold text-content">
                      {attendanceReport?.totalSessions || 0}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <h4 className="text-sm font-medium text-content mb-3">Attendance History</h4>
                  {attendanceReport?.records && attendanceReport.records.length > 0 ? (
                    <div className="space-y-2">
                      {attendanceReport.records.map(rec => (
                        <div key={rec._id} className="p-3 bg-base rounded-lg border border-border flex justify-between items-center text-xs">
                          <span className="text-content font-medium">Session on {new Date(rec.markedAt || rec.createdAt).toLocaleDateString()}</span>
                          <span className="px-2 py-0.5 rounded font-semibold bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
                            Present
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted">No attendance sessions recorded yet for you in this class.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-base">
              <h3 className="text-lg font-medium text-content flex items-center gap-2">
                <FileText size={20} className="text-primary-600" />
                Assignment
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-muted hover:text-content">✕</button>
            </div>
            
            <form id="assign-form" onSubmit={handleCreateAssignment} className="flex-1 overflow-y-auto p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-content mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newAssign.title}
                  onChange={e => setNewAssign({...newAssign, title: e.target.value})}
                  className="input-field"
                  placeholder="Assignment title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-content mb-1">Instructions (optional)</label>
                <textarea
                  required
                  value={newAssign.description}
                  onChange={e => setNewAssign({...newAssign, description: e.target.value})}
                  className="input-field min-h-[120px]"
                  placeholder="Provide detailed instructions..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Due date (optional)</label>
                  <input
                    type="datetime-local"
                    value={newAssign.dueDate}
                    onChange={e => setNewAssign({...newAssign, dueDate: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Points</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newAssign.maxMarks}
                    onChange={e => setNewAssign({...newAssign, maxMarks: Number(e.target.value)})}
                    className="input-field"
                  />
                </div>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-border bg-base flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setShowAssignModal(false)} 
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="assign-form"
                disabled={isAssigning || !newAssign.title.trim()} 
                className="btn-primary"
              >
                {isAssigning ? 'Assigning...' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-base">
              <h3 className="text-lg font-medium text-content flex items-center gap-2">
                <BookOpen size={20} className="text-teal-600" />
                {editingMaterial ? 'Edit Material' : 'Upload Material'}
              </h3>
              <button onClick={() => setShowMaterialModal(false)} className="text-muted hover:text-content">✕</button>
            </div>
            
            <form id="material-form" onSubmit={handleCreateMaterial} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-content mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newMaterial.title}
                  onChange={e => setNewMaterial({...newMaterial, title: e.target.value})}
                  className="input-field"
                  placeholder="Material title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-content mb-1">Description (optional)</label>
                <textarea
                  value={newMaterial.description}
                  onChange={e => setNewMaterial({...newMaterial, description: e.target.value})}
                  className="input-field min-h-[80px]"
                  placeholder="Provide details about the material..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-content mb-1">{editingMaterial ? 'Replace File (optional)' : 'File'}</label>
                <input
                  type="file"
                  required={!editingMaterial}
                  onChange={e => setNewMaterial({...newMaterial, file: e.target.files[0]})}
                  className="w-full text-sm text-muted file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-border bg-base flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setShowMaterialModal(false)} 
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="material-form"
                disabled={isUploading || !newMaterial.title.trim() || (!editingMaterial && !newMaterial.file)} 
                className="btn-primary"
              >
                {isUploading ? (editingMaterial ? 'Saving...' : 'Uploading...') : (editingMaterial ? 'Save Changes' : 'Upload')}
              </button>
            </div>
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

export default ClassDetails;
