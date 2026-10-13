import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  MoreVertical,
  ClipboardList,
  Plus,
  FileText,
  CheckSquare,
  BookOpen,
  Clock,
  Sparkles,
  Users,
  Award,
  Calendar,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  UserCheck,
  Edit3,
  Trash2,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import api from '../../services/api';
import MaterialModal from '../../components/MaterialModal';

const ClassDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab mapping & query param synchronization
  const validTabs = ['overview', 'quizzes', 'assignments', 'materials', 'announcements', 'attendance', 'people'];
  const queryTab = searchParams.get('tab');
  const normalizedInitialTab = queryTab === 'stream' ? 'overview' : queryTab === 'classwork' ? 'quizzes' : (validTabs.includes(queryTab) ? queryTab : 'overview');
  const [activeTab, setActiveTab] = useState(normalizedInitialTab);

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
  const [viewingMaterial, setViewingMaterial] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEnrollingDirect, setIsEnrollingDirect] = useState(false);

  // Assignment Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newAssign, setNewAssign] = useState({ title: '', description: '', dueDate: '', maxMarks: 100 });
  const [isAssigning, setIsAssigning] = useState(false);

  // Material Modal
  const [showMaterialModal, setShowMaterialModal] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ title: '', description: '', file: null });
  const [isUploading, setIsUploading] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

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
      setAnnouncements(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${id}/assignments`);
      setAssignments(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchQuizzes = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${id}/quizzes`);
      setQuizzes(res.data.data || []);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchMaterials = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${id}/materials`);
      setMaterials(res.data.data || []);
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

  const handleCopyCode = () => {
    if (!classData?.classCode && !classData?.code) return;
    navigator.clipboard.writeText(classData.classCode || classData.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleEnrollDirect = async () => {
    setIsEnrollingDirect(true);
    try {
      await api.post(`/classes/${id}/enroll`);
      await fetchClassData();
      await fetchAssignments();
      await fetchQuizzes();
      alert(`Enrolled in ${classData.name} successfully!`);
    } catch (err) {
      alert(err.response?.data?.message || 'Error enrolling in course');
    } finally {
      setIsEnrollingDirect(false);
    }
  };

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
      alert('Error closing attendance session');
    }
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();
    if (!activeSession || studentOtpInput.length !== 6) return;
    try {
      await api.post('/attendance/submit', {
        sessionId: activeSession.sessionId || activeSession._id,
        otp: studentOtpInput
      });
      setOtpMessage({ text: 'Attendance recorded successfully!', isError: false });
      setStudentOtpInput('');
      fetchAttendance();
    } catch (err) {
      setOtpMessage({ text: err.response?.data?.message || 'Failed to submit OTP', isError: true });
    }
  };

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post(`/classes/${id}/announcements`, { content: newAnnouncement });
      setNewAnnouncement('');
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error posting announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssign.title.trim()) return;

    setIsAssigning(true);
    try {
      await api.post(`/classes/${id}/assignments`, {
        ...newAssign,
        dueDate: newAssign.dueDate || new Date(Date.now() + 86400000 * 7).toISOString()
      });
      setShowAssignModal(false);
      setNewAssign({ title: '', description: '', dueDate: '', maxMarks: 100 });
      fetchAssignments();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error creating assignment');
    } finally {
      setIsAssigning(false);
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!newMaterial.title.trim()) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('title', newMaterial.title);
    formData.append('description', newMaterial.description);
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
    return <div className="flex justify-center py-20 text-muted">Loading course details...</div>;
  }

  const isTeacher = user?.role === 'admin' || (user?.role === 'teacher' && (classData.teacher?._id === user?._id || classData.teacher === user?._id));
  const isStudent = user?.role === 'student';
  const isEnrolled = isTeacher || classData.isEnrolled;

  const upcomingAssignments = assignments.filter(a => a.dueDate && new Date(a.dueDate) > new Date());
  const upcomingQuizzes = quizzes.filter(q => q.endTime && new Date(q.endTime) > new Date());

  const navTabs = [
    { id: 'overview', label: 'Overview', icon: BookOpen },
    { id: 'quizzes', label: `Quizzes (${quizzes.length})`, icon: CheckSquare },
    { id: 'assignments', label: `Assignments (${assignments.length})`, icon: FileText },
    { id: 'materials', label: `Materials (${materials.length})`, icon: BookOpen },
    { id: 'announcements', label: `Announcements (${announcements.length})`, icon: ClipboardList },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'people', label: `People (${classData.students?.length || 0})`, icon: Users },
  ];

  return (
    <div className="max-w-6xl mx-auto pb-16 font-sans">
      
      {/* Course Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-primary-700 rounded-2xl p-6 sm:p-8 text-white shadow-sm mb-6 relative overflow-hidden">
        <div className="absolute inset-0 opacity-15" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-xs px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider mb-3">
              <span>{classData.code || classData.classCode || 'COURSE'}</span>
              <span>•</span>
              <span>{classData.teacher?.name || 'Faculty Member'}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight mb-2 drop-shadow-sm">
              {classData.name}
            </h1>
            <p className="text-sm sm:text-base opacity-90 max-w-2xl line-clamp-2">
              {classData.description || 'Welcome to this course. Access all assessments, coursework, lectures, and resources below.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {/* Enrollment Code Badge */}
            {(classData.classCode || classData.code) && (
              <button
                onClick={handleCopyCode}
                className="bg-white/15 hover:bg-white/25 backdrop-blur-xs border border-white/20 px-3.5 py-2 rounded-xl text-xs font-mono font-medium flex items-center gap-2 transition-colors cursor-pointer"
                title="Click to copy enrollment code"
              >
                <span>Code: {classData.classCode || classData.code}</span>
                {copiedCode ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
              </button>
            )}

            {/* Direct Enroll Button for Unenrolled Students */}
            {isStudent && !isEnrolled && (
              <button
                onClick={handleEnrollDirect}
                disabled={isEnrollingDirect}
                className="bg-white text-blue-700 hover:bg-blue-50 font-semibold px-4 py-2 rounded-xl text-xs shadow-md transition-colors"
              >
                {isEnrollingDirect ? 'Enrolling...' : '+ Enroll in Course'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Guest Enrollment Notice Banner */}
      {isStudent && !isEnrolled && (
        <div className="mb-6 p-4 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-200">You are browsing this course as a guest</h3>
            <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
              Enroll with one click to submit assignments, take quizzes, and track your attendance record.
            </p>
          </div>
          <button
            onClick={handleEnrollDirect}
            disabled={isEnrollingDirect}
            className="btn-primary text-xs px-4 py-2 whitespace-nowrap shadow-xs"
          >
            {isEnrollingDirect ? 'Enrolling...' : 'Enroll in this Course'}
          </button>
        </div>
      )}

      {/* Modern Navigation Tabs */}
      <div className="flex border-b border-border mb-8 overflow-x-auto no-scrollbar scroll-smooth">
        {navTabs.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id)}
              className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold transition-all relative whitespace-nowrap ${
                isActive
                  ? 'text-primary-600 dark:text-primary-400 bg-primary-50/50 dark:bg-primary-950/20 rounded-t-xl'
                  : 'text-muted hover:text-content hover:bg-surface rounded-t-xl'
              }`}
            >
              <Icon size={16} />
              <span>{t.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary-600 dark:bg-primary-400 rounded-t-full"></span>
              )}
            </button>
          );
        })}
      </div>

      {/* ============================================================ */}
      {/* 1. OVERVIEW TAB */}
      {/* ============================================================ */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div 
              onClick={() => handleTabChange('quizzes')}
              className="card-surface p-5 rounded-2xl cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Quizzes</span>
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <CheckSquare size={16} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-content">{quizzes.length}</div>
              <span className="text-xs text-primary-600 dark:text-primary-400 font-medium flex items-center gap-1 mt-2">
                View quizzes <ArrowRight size={12} />
              </span>
            </div>

            <div 
              onClick={() => handleTabChange('assignments')}
              className="card-surface p-5 rounded-2xl cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Assignments</span>
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <FileText size={16} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-content">{assignments.length}</div>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1 mt-2">
                View assignments <ArrowRight size={12} />
              </span>
            </div>

            <div 
              onClick={() => handleTabChange('materials')}
              className="card-surface p-5 rounded-2xl cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Materials</span>
                <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <BookOpen size={16} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-content">{materials.length}</div>
              <span className="text-xs text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1 mt-2">
                View resources <ArrowRight size={12} />
              </span>
            </div>

            <div 
              onClick={() => handleTabChange('announcements')}
              className="card-surface p-5 rounded-2xl cursor-pointer hover:border-primary-400 dark:hover:border-primary-600 hover:shadow-md transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-muted uppercase tracking-wider">Announcements</span>
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ClipboardList size={16} />
                </div>
              </div>
              <div className="text-3xl font-extrabold text-content">{announcements.length}</div>
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1 mt-2">
                Read stream <ArrowRight size={12} />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Instructor Details Card */}
            <div className="card-surface p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-content uppercase tracking-wider mb-4 flex items-center gap-2">
                  <UserCheck size={16} className="text-primary-600" />
                  Course Instructor
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 font-bold text-lg flex items-center justify-center shrink-0">
                    {classData.teacher?.name ? classData.teacher.name.charAt(0).toUpperCase() : 'T'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-semibold text-content truncate">{classData.teacher?.name || 'Class Instructor'}</h4>
                    <p className="text-xs text-muted truncate">{classData.teacher?.email || 'instructor@institution.edu'}</p>
                    <span className="inline-block mt-1 text-[11px] font-medium bg-base px-2 py-0.5 rounded border border-border text-muted">
                      Faculty Lead
                    </span>
                  </div>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  Responsible for course curriculum, assignment evaluations, quizzes, and live attendance sessions.
                </p>
              </div>

              {isTeacher && (
                <div className="mt-6 pt-4 border-t border-border flex flex-col gap-2">
                  <Link 
                    to={`/quiz-generator?classId=${id}`}
                    className="btn-secondary text-xs flex items-center justify-center gap-2 py-2"
                  >
                    <Sparkles size={14} className="text-primary-600" />
                    <span>Generate AI Quiz</span>
                  </Link>
                  <button 
                    onClick={() => setShowAssignModal(true)}
                    className="btn-primary text-xs flex items-center justify-center gap-2 py-2"
                  >
                    <Plus size={14} />
                    <span>Create Assignment</span>
                  </button>
                </div>
              )}
            </div>

            {/* Upcoming Deadlines Card */}
            <div className="card-surface p-6 rounded-2xl lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
                <h3 className="text-sm font-bold text-content uppercase tracking-wider flex items-center gap-2">
                  <Clock size={16} className="text-primary-600" />
                  Upcoming Course Deadlines
                </h3>
                <span className="text-xs text-muted">
                  {upcomingAssignments.length + upcomingQuizzes.length} active
                </span>
              </div>

              {upcomingAssignments.length > 0 || upcomingQuizzes.length > 0 ? (
                <div className="space-y-3">
                  {upcomingQuizzes.map(q => (
                    <div key={q._id} className="p-3.5 bg-base rounded-xl border border-border flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <CheckSquare size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-content truncate">{q.title}</h4>
                          <span className="text-xs text-muted">
                            Quiz • Due: {new Date(q.endTime).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Link 
                        to={isTeacher ? `/classes/${id}/quizzes/${q._id}` : `/classes/${id}/quizzes/${q._id}/take`}
                        className="btn-secondary text-xs py-1.5 px-3 shrink-0 whitespace-nowrap"
                      >
                        {isTeacher ? 'View' : 'Take Quiz'}
                      </Link>
                    </div>
                  ))}

                  {upcomingAssignments.map(a => (
                    <div key={a._id} className="p-3.5 bg-base rounded-xl border border-border flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-content truncate">{a.title}</h4>
                          <span className="text-xs text-muted">
                            Assignment • Due: {new Date(a.dueDate).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <Link 
                        to={`/classes/${id}/assignments/${a._id}`}
                        className="btn-secondary text-xs py-1.5 px-3 shrink-0 whitespace-nowrap"
                      >
                        {isTeacher ? 'Submissions' : 'Turn In'}
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center text-muted">
                  <CheckCircle2 size={36} className="text-muted/60 mb-2" />
                  <p className="text-sm font-medium text-content">No upcoming deadlines</p>
                  <p className="text-xs text-muted mt-0.5">All assignments and quizzes are up to date for this course.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. QUIZZES TAB */}
      {/* ============================================================ */}
      {activeTab === 'quizzes' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-bold text-content">Course Quizzes</h2>
              <p className="text-xs text-muted mt-0.5">
                {isTeacher 
                  ? 'Manage and create targeted course assessments, up to 10 questions each' 
                  : 'Complete published quizzes and view your evaluation results'}
              </p>
            </div>

            {isTeacher && (
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to={`/quiz-generator?classId=${id}`}
                  className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Sparkles size={15} />
                  <span>AI Quiz Generator</span>
                </Link>
                <Link
                  to={`/classes/${id}/quizzes/create`}
                  className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2 shadow-xs"
                >
                  <Plus size={16} />
                  <span>Create Quiz</span>
                </Link>
              </div>
            )}
          </div>

          {/* Quiz Cards */}
          {quizzes.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quizzes.map((q) => {
                const questionCount = q.questions ? q.questions.length : 10;
                const isOverdue = q.endTime && new Date(q.endTime) < new Date();

                return (
                  <div
                    key={q._id}
                    className="card-surface p-5 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
                            <CheckSquare size={18} />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-[#111827] dark:text-slate-100 group-hover:text-primary-600 transition-colors line-clamp-1" title={q.title}>
                              {q.title}
                            </h3>
                            <span className="text-xs text-[#4B5563] dark:text-slate-400 font-medium">
                              {questionCount} Questions • {q.durationMinutes || 20} mins
                            </span>
                          </div>
                        </div>

                        {/* Status Badges */}
                        {isTeacher && (
                          <span className={`badge-status ${
                            q.isPublished 
                              ? 'badge-status-available' 
                              : 'badge-status-draft'
                          }`}>
                            {q.isPublished ? 'Published' : 'Draft'}
                          </span>
                        )}

                        {isStudent && q.hasAttempted && (
                          <span className="badge-status badge-status-evaluated">
                            Score: {q.lastScore} ({q.lastPercentage}%)
                          </span>
                        )}
                      </div>

                      {q.description && (
                        <p className="text-xs text-[#1F2937] dark:text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                          {q.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#E5E7EB] dark:border-slate-700 flex items-center justify-between">
                      <div className="text-xs text-[#374151] dark:text-slate-400 font-medium">
                        {q.endTime ? (
                          <span className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
                            Due: {new Date(q.endTime).toLocaleDateString()}
                          </span>
                        ) : (
                          <span>Open submission</span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Link
                          to={`/classes/${id}/quizzes/${q._id}`}
                          className="link-details"
                        >
                          {isTeacher ? 'Submissions' : 'Details'}
                        </Link>

                        {isStudent && (
                          q.hasAttempted ? (
                            <Link
                              to={`/classes/${id}/quizzes/${q._id}`}
                              className="link-details text-primary-600 font-semibold"
                            >
                              View Results
                            </Link>
                          ) : (
                            <Link
                              to={`/classes/${id}/quizzes/${q._id}/take`}
                              className="btn-primary text-xs px-3.5 py-1.5 shadow-xs"
                            >
                              Take Quiz
                            </Link>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-surface p-12 text-center rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <CheckSquare size={28} />
              </div>
              <h3 className="text-base font-bold text-content mb-1">No quizzes available for this course yet</h3>
              <p className="text-xs text-muted max-w-md mb-5">
                {isTeacher 
                  ? 'Create a customized quiz with up to 10 questions or use our AI Quiz Generator to instantly populate one.'
                  : 'Your instructor has not published any quizzes for this course yet.'}
              </p>
              {isTeacher && (
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Link
                    to={`/quiz-generator?classId=${id}`}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    <Sparkles size={14} />
                    <span>AI Quiz Generator</span>
                  </Link>
                  <Link
                    to={`/classes/${id}/quizzes/create`}
                    className="btn-secondary text-xs px-4 py-2"
                  >
                    + Manual Quiz
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. ASSIGNMENTS TAB */}
      {/* ============================================================ */}
      {activeTab === 'assignments' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-bold text-content">Course Assignments</h2>
              <p className="text-xs text-muted mt-0.5">
                {isTeacher 
                  ? 'Track submissions, download student PDFs, and record grades' 
                  : 'Turn in required assignment deliverables and view grades'}
              </p>
            </div>

            {isTeacher && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2 shadow-xs shrink-0 self-start sm:self-auto"
              >
                <Plus size={16} />
                <span>Create Assignment</span>
              </button>
            )}
          </div>

          {assignments.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {assignments.map((a) => {
                const isOverdue = a.dueDate && new Date(a.dueDate) < new Date();

                return (
                  <div
                    key={a._id}
                    className="card-surface p-5 rounded-2xl flex flex-col justify-between hover:shadow-md transition-shadow group"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 flex items-center justify-center shrink-0">
                            <FileText size={18} />
                          </div>
                          <div>
                            <h3 className="font-bold text-base text-[#111827] dark:text-slate-100 group-hover:text-indigo-600 transition-colors line-clamp-1" title={a.title}>
                              {a.title}
                            </h3>
                            <span className="text-xs text-[#4B5563] dark:text-slate-400 font-medium">
                              Max Points: {a.maxMarks || 100}
                            </span>
                          </div>
                        </div>

                        {/* Teacher Submission Count Badge */}
                        {isTeacher && (
                          <span className="badge-status badge-status-submitted">
                            {a.submissionCount || 0} Submissions
                          </span>
                        )}

                        {/* Student Submission Status Badge */}
                        {isStudent && (
                          <span className={`badge-status ${
                            a.hasSubmitted 
                              ? 'badge-status-submitted' 
                              : 'badge-status-pending'
                          }`}>
                            {a.hasSubmitted ? 'Turned In' : 'Pending'}
                          </span>
                        )}
                      </div>

                      {a.description && (
                        <p className="text-xs text-[#1F2937] dark:text-slate-300 line-clamp-2 mt-2 leading-relaxed">
                          {a.description}
                        </p>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t border-[#E5E7EB] dark:border-slate-700 flex items-center justify-between">
                      <div className="text-xs text-[#374151] dark:text-slate-400 font-medium">
                        {a.dueDate ? (
                          <span className={isOverdue ? 'text-rose-600 dark:text-rose-400 font-semibold' : ''}>
                            Due: {new Date(a.dueDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span>No deadline</span>
                        )}
                      </div>

                      <Link
                        to={`/classes/${id}/assignments/${a._id}`}
                        className={isTeacher ? 'btn-secondary text-xs px-3.5 py-1.5' : (a.hasSubmitted ? 'btn-secondary text-xs px-3.5 py-1.5' : 'btn-primary text-xs px-3.5 py-1.5 shadow-xs')}
                      >
                        {isTeacher ? 'Review Submissions' : (a.hasSubmitted ? 'View Submission' : 'View & Turn In')}
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="card-surface p-12 text-center rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3">
                <FileText size={28} />
              </div>
              <h3 className="text-base font-bold text-content mb-1">No assignments created for this course yet</h3>
              <p className="text-xs text-muted max-w-md mb-5">
                {isTeacher 
                  ? 'Assign projects, labs, homework, and problem sets to students in this course.'
                  : 'Your instructor has not posted any assignments for this course yet.'}
              </p>
              {isTeacher && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="btn-primary text-xs px-4 py-2 shadow-xs"
                >
                  + Create Assignment
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. MATERIALS TAB */}
      {/* ============================================================ */}
      {activeTab === 'materials' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <div>
              <h2 className="text-xl font-bold text-content">Study Materials & Notes</h2>
              <p className="text-xs text-muted mt-0.5">
                Course textbooks, lecture slide decks, syllabus, and supplementary documents
              </p>
            </div>

            {isTeacher && (
              <button
                onClick={() => {
                  setEditingMaterial(null);
                  setNewMaterial({ title: '', description: '', file: null });
                  setShowMaterialModal(true);
                }}
                className="btn-primary text-xs flex items-center gap-1.5 px-4 py-2 shadow-xs shrink-0 self-start sm:self-auto"
              >
                <Plus size={16} />
                <span>Upload Material</span>
              </button>
            )}
          </div>

          {materials.length > 0 ? (
            <div className="space-y-3">
              {materials.map((m) => (
                <div
                  key={m._id}
                  className="card-surface p-4 rounded-xl flex items-center justify-between gap-4 hover:shadow-md transition-shadow group border border-border"
                >
                  <div 
                    onClick={() => setViewingMaterial(m)}
                    className="flex items-center gap-3.5 flex-1 min-w-0 cursor-pointer"
                  >
                    <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <BookOpen size={20} />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-content group-hover:text-teal-600 transition-colors truncate">
                        {m.title}
                      </h4>
                      <div className="text-xs text-muted flex items-center gap-3 mt-0.5">
                        <span>Uploaded {new Date(m.createdAt || Date.now()).toLocaleDateString()}</span>
                        {m.description && <span className="truncate max-w-xs">{m.description}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setViewingMaterial(m)}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      View / Open
                    </button>

                    {isTeacher && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleEditMaterial(m)}
                          className="p-1.5 text-muted hover:text-content hover:bg-base rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteMaterial(m._id)}
                          className="p-1.5 text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-surface p-12 text-center rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-3">
                <BookOpen size={28} />
              </div>
              <h3 className="text-base font-bold text-content mb-1">No study materials uploaded for this course yet</h3>
              <p className="text-xs text-muted max-w-md mb-5">
                {isTeacher 
                  ? 'Upload PDF lecture notes, references, and syllabus documents for your students.'
                  : 'Your instructor has not uploaded any study materials for this course yet.'}
              </p>
              {isTeacher && (
                <button
                  onClick={() => {
                    setEditingMaterial(null);
                    setNewMaterial({ title: '', description: '', file: null });
                    setShowMaterialModal(true);
                  }}
                  className="btn-primary text-xs px-4 py-2 shadow-xs"
                >
                  + Upload Material
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. ANNOUNCEMENTS TAB */}
      {/* ============================================================ */}
      {activeTab === 'announcements' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-border pb-4">
            <h2 className="text-xl font-bold text-content">Course Announcements</h2>
            <p className="text-xs text-muted mt-0.5">Real-time announcements and discussions for this class</p>
          </div>

          {/* Teacher Composer */}
          {isTeacher && (
            <div className="card-surface p-5 rounded-2xl border border-border">
              <form onSubmit={handlePostAnnouncement}>
                <textarea
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="Share an announcement with your class..."
                  className="input-field min-h-[90px] text-sm"
                  required
                />
                <div className="flex justify-end gap-2 mt-3">
                  {newAnnouncement.trim() && (
                    <button
                      type="button"
                      onClick={() => setNewAnnouncement('')}
                      className="btn-secondary text-xs px-3 py-1.5"
                    >
                      Clear
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmitting || !newAnnouncement.trim()}
                    className="btn-primary text-xs px-4 py-1.5 shadow-xs"
                  >
                    {isSubmitting ? 'Posting...' : 'Post Announcement'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Announcements List */}
          {announcements.length > 0 ? (
            <div className="space-y-4">
              {announcements.map((ann) => (
                <div key={ann._id} className="card-surface p-5 rounded-2xl border border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-sm shrink-0">
                      {ann.author?.name ? ann.author.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm text-content">{ann.author?.name || 'Class Instructor'}</h4>
                      <span className="text-[11px] text-muted">
                        {new Date(ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-content whitespace-pre-wrap leading-relaxed pl-12">
                    {ann.content || ann.title}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="card-surface p-12 text-center rounded-2xl border border-dashed border-border flex flex-col items-center justify-center">
              <ClipboardList size={36} className="text-muted/60 mb-2" />
              <h3 className="text-base font-bold text-content mb-1">No announcements yet</h3>
              <p className="text-xs text-muted max-w-md">
                {isTeacher 
                  ? 'Use this stream to communicate updates, exam notices, and room changes.'
                  : 'Your instructor has not posted any announcements in this course yet.'}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 6. ATTENDANCE TAB */}
      {/* ============================================================ */}
      {activeTab === 'attendance' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Teacher Attendance Session Manager */}
          {isTeacher ? (
            <div className="card-surface p-6 rounded-2xl border border-border">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border pb-4">
                <div>
                  <h2 className="text-xl font-bold text-content flex items-center gap-2">
                    <Clock size={20} className="text-primary-600" />
                    Attendance Session Manager
                  </h2>
                  <p className="text-xs text-muted mt-0.5">Start a timed OTP session for students currently in your classroom</p>
                </div>
                {!activeSession ? (
                  <button
                    onClick={handleStartAttendance}
                    className="btn-primary flex items-center gap-2 text-xs px-4 py-2 shadow-xs"
                  >
                    <Plus size={16} />
                    <span>Start OTP Session</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-4 bg-primary-50 dark:bg-primary-950/40 px-4 py-2 rounded-xl border border-primary-200 dark:border-primary-800">
                    <div>
                      <span className="text-[11px] text-muted block uppercase tracking-wider">Live OTP</span>
                      <span className="text-2xl font-mono font-bold tracking-widest text-primary-600 dark:text-primary-400">
                        {activeSession.otp}
                      </span>
                    </div>
                    <div className="pl-4 border-l border-primary-200 dark:border-primary-800">
                      <span className="text-[11px] text-muted block uppercase tracking-wider">Expires</span>
                      <span className="text-lg font-bold text-red-500 font-mono">{countdown}s</span>
                    </div>
                    <button
                      onClick={handleCloseAttendance}
                      className="btn-secondary text-xs text-red-600 hover:text-red-700 ml-2 py-1 px-3"
                    >
                      End Early
                    </button>
                  </div>
                )}
              </div>

              {/* Attendance Table */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-content uppercase tracking-wider">
                    Enrolled Students ({attendanceReport?.students?.length || classData.students?.length || 0})
                  </h3>
                  <span className="text-xs text-muted">
                    Total Sessions: {attendanceReport?.totalSessions || 0}
                  </span>
                </div>

                {attendanceReport?.students && attendanceReport.students.length > 0 ? (
                  <div className="overflow-x-auto border border-border rounded-xl">
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
                          <tr key={st.student?._id} className="hover:bg-surface">
                            <td className="p-3 font-medium text-content">
                              <div>{st.student?.name}</div>
                              <div className="text-xs text-muted">{st.student?.email}</div>
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
                  <p className="text-muted text-xs py-4 text-center">No student records to display.</p>
                )}
              </div>
            </div>
          ) : (
            /* Student Attendance View */
            <div className="space-y-6">
              {activeSession && (
                <div className="card-surface p-6 rounded-2xl border-l-4 border-primary-600">
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
                        className="input-field max-w-[140px] text-center font-mono font-semibold text-sm"
                      />
                      <button type="submit" className="btn-primary text-xs py-2 px-4 whitespace-nowrap shadow-xs">
                        Check In
                      </button>
                    </form>
                  </div>
                  {otpMessage.text && (
                    <div className={`mt-3 text-xs p-2 rounded-lg ${otpMessage.isError ? 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400' : 'bg-green-50 text-green-600 dark:bg-green-950/40 dark:text-green-400'}`}>
                      {otpMessage.text}
                    </div>
                  )}
                </div>
              )}

              <div className="card-surface p-6 rounded-2xl border border-border">
                <h3 className="text-base font-bold text-content mb-4 border-b border-border pb-2">
                  My Attendance in this Class
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-base p-4 rounded-xl border border-border">
                    <span className="text-xs text-muted block mb-1">Percentage</span>
                    <span className="text-3xl font-extrabold text-primary-600 dark:text-primary-400">
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
                  <h4 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Attendance History</h4>
                  {attendanceReport?.records && attendanceReport.records.length > 0 ? (
                    <div className="space-y-2">
                      {attendanceReport.records.map(rec => (
                        <div key={rec._id} className="p-3 bg-base rounded-xl border border-border flex justify-between items-center text-xs">
                          <span className="text-content font-medium">Session on {new Date(rec.markedAt || rec.createdAt).toLocaleDateString()}</span>
                          <span className="px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-800 dark:bg-green-950/40 dark:text-green-300">
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

      {/* ============================================================ */}
      {/* 7. PEOPLE TAB */}
      {/* ============================================================ */}
      {activeTab === 'people' && (
        <div className="card-surface p-6 sm:p-8 rounded-2xl max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200 border border-border">
          <div>
            <h3 className="text-lg font-bold text-content border-b border-border pb-3 mb-4">Instructor</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center text-sm shadow-xs">
                {classData.teacher?.name ? classData.teacher.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div>
                <h4 className="font-semibold text-content text-sm">{classData.teacher?.name || 'Faculty Member'}</h4>
                <p className="text-xs text-muted">{classData.teacher?.email || 'instructor@institution.edu'}</p>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
              <h3 className="text-lg font-bold text-content">Enrolled Students</h3>
              <span className="text-xs font-semibold text-muted">
                {classData.students?.length || 0} students
              </span>
            </div>

            {classData.students && classData.students.length > 0 ? (
              <div className="divide-y divide-border">
                {classData.students.map((student) => (
                  <div key={student._id || student} className="py-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-base border border-border text-muted font-bold flex items-center justify-center text-xs">
                      {student?.name ? student.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <h4 className="font-medium text-content text-sm">{student?.name || 'Student'}</h4>
                      {student?.email && <p className="text-xs text-muted">{student.email}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-xs py-4 text-center">No students enrolled yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Create Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-base">
              <h3 className="text-base font-bold text-content flex items-center gap-2">
                <FileText size={18} className="text-primary-600" />
                Create New Assignment
              </h3>
              <button onClick={() => setShowAssignModal(false)} className="text-muted hover:text-content">✕</button>
            </div>
            
            <form id="assign-form" onSubmit={handleCreateAssignment} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newAssign.title}
                  onChange={e => setNewAssign({...newAssign, title: e.target.value})}
                  className="input-field text-sm"
                  placeholder="e.g. Lab 4: Recursion and Backtracking"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">Instructions & Deliverables</label>
                <textarea
                  required
                  value={newAssign.description}
                  onChange={e => setNewAssign({...newAssign, description: e.target.value})}
                  className="input-field min-h-[110px] text-sm"
                  placeholder="Provide detailed instructions, submission format requirements, etc."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={newAssign.dueDate}
                    onChange={e => setNewAssign({...newAssign, dueDate: e.target.value})}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">Max Points</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newAssign.maxMarks}
                    onChange={e => setNewAssign({...newAssign, maxMarks: Number(e.target.value)})}
                    className="input-field text-sm"
                  />
                </div>
              </div>
            </form>

            <div className="px-6 py-4 border-t border-border bg-base flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setShowAssignModal(false)} 
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="assign-form"
                disabled={isAssigning || !newAssign.title.trim()} 
                className="btn-primary text-xs px-4 shadow-xs"
              >
                {isAssigning ? 'Assigning...' : 'Publish Assignment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Material Modal */}
      {showMaterialModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-lg rounded-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-base">
              <h3 className="text-base font-bold text-content flex items-center gap-2">
                <BookOpen size={18} className="text-teal-600" />
                {editingMaterial ? 'Edit Material' : 'Upload Study Material'}
              </h3>
              <button onClick={() => setShowMaterialModal(false)} className="text-muted hover:text-content">✕</button>
            </div>
            
            <form id="material-form" onSubmit={handleCreateMaterial} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newMaterial.title}
                  onChange={e => setNewMaterial({...newMaterial, title: e.target.value})}
                  className="input-field text-sm"
                  placeholder="e.g. Chapter 4 Slide Deck"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">Description (optional)</label>
                <textarea
                  value={newMaterial.description}
                  onChange={e => setNewMaterial({...newMaterial, description: e.target.value})}
                  className="input-field min-h-[80px] text-sm"
                  placeholder="Provide reference details..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                  {editingMaterial ? 'Replace File (optional)' : 'File'}
                </label>
                <input
                  type="file"
                  required={!editingMaterial}
                  onChange={e => setNewMaterial({...newMaterial, file: e.target.files[0]})}
                  className="w-full text-xs text-muted file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100"
                />
              </div>
            </form>

            <div className="px-6 py-4 border-t border-border bg-base flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setShowMaterialModal(false)} 
                className="btn-secondary text-xs"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="material-form"
                disabled={isUploading || !newMaterial.title.trim() || (!editingMaterial && !newMaterial.file)} 
                className="btn-primary text-xs px-4 shadow-xs"
              >
                {isUploading ? (editingMaterial ? 'Saving...' : 'Uploading...') : (editingMaterial ? 'Save Changes' : 'Upload')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Material Viewer Modal */}
      <MaterialModal 
        material={viewingMaterial} 
        onClose={() => setViewingMaterial(null)} 
      />
    </div>
  );
};

export default ClassDetails;
