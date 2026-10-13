import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Plus,
  Users,
  Clock,
  Calendar,
  FileText,
  BookOpen,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ClipboardList,
  Award,
  Download,
  Search,
  Filter,
  Sparkles,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ExternalLink,
  FileCheck
} from 'lucide-react';
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

  // Leave Review State
  const [reviewingLeave, setReviewingLeave] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const [dashboardData, setDashboardData] = useState({
    announcements: [],
    upcomingAssignments: [],
    todaysAttendance: [],
    pendingLeaves: [],
    recentMaterials: []
  });

  // --- QUIZ RESULTS & STUDENT MARKS SECTION STATE ---
  const [selectedResultsClass, setSelectedResultsClass] = useState('');
  const [classQuizzes, setClassQuizzes] = useState([]);
  const [selectedQuizId, setSelectedQuizId] = useState('');
  const [quizAttempts, setQuizAttempts] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(false);
  const [searchStudentQuery, setSearchStudentQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Teacher Inspect & Manual Grading Modal
  const [inspectingAttempt, setInspectingAttempt] = useState(null);
  const [modalMarks, setModalMarks] = useState({});
  const [modalNotes, setModalNotes] = useState('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  // --- ASSIGNMENT SUBMISSIONS OVERVIEW STATE ---
  const [assignmentsOverview, setAssignmentsOverview] = useState([]);
  const [submissionClassFilter, setSubmissionClassFilter] = useState('all');

  const fetchAssignmentsOverview = useCallback(async () => {
    try {
      const res = await api.get('/assignments/teacher-overview');
      setAssignmentsOverview(res.data.data || []);
    } catch (err) {
      console.error('Failed to load assignment submissions overview', err);
    }
  }, []);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/dashboard/teacher');
      const fetchedClasses = res.data.data.classes || [];
      setClasses(fetchedClasses);
      setDashboardData({
        announcements: res.data.data.announcements || [],
        upcomingAssignments: res.data.data.upcomingAssignments || [],
        todaysAttendance: res.data.data.todaysAttendance || [],
        pendingLeaves: res.data.data.pendingLeaves || [],
        recentMaterials: res.data.data.recentMaterials || []
      });

      if (fetchedClasses.length > 0) {
        if (!selectedClassForAttendance) setSelectedClassForAttendance(fetchedClasses[0]._id);
        if (!selectedResultsClass) setSelectedResultsClass(fetchedClasses[0]._id);
      }
      fetchAssignmentsOverview();
    } catch (err) {
      console.error('Failed to load teacher dashboard', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClassForAttendance, selectedResultsClass, fetchAssignmentsOverview]);

  useEffect(() => {
    fetchDashboard();
    const handleFocus = () => fetchDashboard();
    window.addEventListener('focus', handleFocus);
    const interval = setInterval(fetchDashboard, 15000);
    return () => {
      window.removeEventListener('focus', handleFocus);
      clearInterval(interval);
    };
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

  // Load quizzes when course changes in Quiz Results section
  useEffect(() => {
    if (!selectedResultsClass) return;
    const fetchQuizzesForClass = async () => {
      try {
        const res = await api.get(`/classes/${selectedResultsClass}/quizzes`);
        const qList = res.data.data || [];
        setClassQuizzes(qList);
        if (qList.length > 0) {
          setSelectedQuizId(qList[0]._id);
        } else {
          setSelectedQuizId('');
          setQuizAttempts([]);
        }
      } catch (err) {
        console.error('Failed to load quizzes for results', err);
        setClassQuizzes([]);
        setSelectedQuizId('');
        setQuizAttempts([]);
      }
    };
    fetchQuizzesForClass();
  }, [selectedResultsClass]);

  // Load attempts when selected quiz changes
  const fetchAttemptsForQuiz = useCallback(async () => {
    if (!selectedResultsClass || !selectedQuizId) {
      setQuizAttempts([]);
      return;
    }
    setLoadingAttempts(true);
    try {
      const res = await api.get(`/classes/${selectedResultsClass}/quizzes/${selectedQuizId}/attempts`);
      setQuizAttempts(res.data.data || []);
    } catch (err) {
      console.error('Failed to load quiz attempts', err);
      setQuizAttempts([]);
    } finally {
      setLoadingAttempts(false);
    }
  }, [selectedResultsClass, selectedQuizId]);

  useEffect(() => {
    fetchAttemptsForQuiz();
  }, [fetchAttemptsForQuiz]);

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
      alert(err.response?.data?.message || 'Error ending attendance session');
    }
  };

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

  // --- MANUAL GRADING MODAL HANDLERS ---
  const handleOpenInspect = (attempt) => {
    setInspectingAttempt(attempt);
    const marksMap = {};
    if (attempt.evaluation) {
      attempt.evaluation.forEach(e => {
        marksMap[e.questionId] = e.marksAwarded;
      });
    }
    setModalMarks(marksMap);
    setModalNotes(attempt.manualGrading?.teacherNotes || '');
  };

  const handleSaveModalGrade = async () => {
    if (!inspectingAttempt) return;
    setIsSavingGrade(true);
    try {
      const evaluationsPayload = Object.entries(modalMarks).map(([qId, val]) => ({
        questionId: qId,
        marksAwarded: Number(val)
      }));

      const res = await api.put(
        `/classes/${selectedResultsClass}/quizzes/${selectedQuizId}/attempts/${inspectingAttempt._id}/grade`,
        {
          evaluations: evaluationsPayload,
          teacherNotes: modalNotes
        }
      );

      const updated = res.data.data;
      setQuizAttempts(prev => prev.map(a => a._id === updated._id ? updated : a));
      setInspectingAttempt(null);
      alert('Marks and grading adjustments saved successfully.');
    } catch (err) {
      console.error('Error saving manual grade adjustments', err);
      alert(err.response?.data?.message || 'Error saving grade adjustments');
    } finally {
      setIsSavingGrade(false);
    }
  };

  // --- CSV EXPORT HANDLER ---
  const handleExportCSV = () => {
    const activeQuiz = classQuizzes.find(q => q._id === selectedQuizId);
    const activeClass = classes.find(c => c._id === selectedResultsClass);
    if (!quizAttempts || quizAttempts.length === 0) {
      alert('No student attempts to export.');
      return;
    }

    const headers = [
      'Student Name',
      'Student ID',
      'Quiz Title',
      'Course Name',
      'Correct Answers',
      'Incorrect Answers',
      'Unanswered Questions',
      'Marks Obtained',
      'Maximum Marks',
      'Percentage',
      'Evaluation Status',
      'Submission Date Time'
    ];

    const rows = quizAttempts.map(a => {
      const s = a.student || {};
      const maxM = a.maxScore || (activeQuiz?.totalMarks || 10);
      return [
        `"${s.name || a.studentName || 'Student'}"`,
        `"${s.studentId || s.email || a.studentEmail || 'N/A'}"`,
        `"${activeQuiz?.title || 'Quiz'}"`,
        `"${activeClass?.name || 'Course'}"`,
        a.correctCount ?? 0,
        a.incorrectCount ?? 0,
        a.unansweredCount ?? 0,
        a.score ?? 0,
        maxM,
        `"${a.percentage ?? 0}%"`,
        `"${a.evaluationStatus || a.status}"`,
        `"${a.submittedAt ? new Date(a.submittedAt).toLocaleString() : 'In Progress'}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${(activeQuiz?.title || 'Quiz_Results').replace(/\s+/g, '_')}_Student_Marks.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  // Filtered attempts for results table
  const filteredAttempts = quizAttempts.filter(att => {
    const sName = (att.student?.name || att.studentName || '').toLowerCase();
    const sId = (att.student?.studentId || att.student?.email || att.studentEmail || '').toLowerCase();
    const q = searchStudentQuery.toLowerCase().trim();
    const matchesSearch = !q || sName.includes(q) || sId.includes(q);

    const matchesStatus = statusFilter === 'all' || att.evaluationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Selected quiz metadata & analytics
  const activeQuiz = classQuizzes.find(q => q._id === selectedQuizId);
  const activeClass = classes.find(c => c._id === selectedResultsClass);
  const submittedCount = quizAttempts.filter(a => a.status === 'Submitted').length;
  const avgScore = submittedCount > 0
    ? (quizAttempts.filter(a => a.status === 'Submitted').reduce((sum, a) => sum + (a.score || 0), 0) / submittedCount).toFixed(1)
    : 0;
  const highestScore = submittedCount > 0
    ? Math.max(...quizAttempts.filter(a => a.status === 'Submitted').map(a => a.score || 0))
    : 0;
  const passCount = quizAttempts.filter(a => a.status === 'Submitted' && (a.percentage || 0) >= 50).length;
  const passRate = submittedCount > 0 ? Math.round((passCount / submittedCount) * 100) : 0;
  const maxMarks = activeQuiz?.totalMarks || (activeQuiz?.questions || []).reduce((sum, q) => sum + (Number(q.marks) || 1), 0) || 10;

  return (
    <div className="space-y-8 font-sans pb-16">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Professor Dashboard</h1>
          <p className="text-sm text-muted mt-1">Manage your active classes, student assessments, and attendance records</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/quiz-generator"
            className="btn-secondary flex items-center gap-1.5 text-xs font-semibold"
          >
            <Sparkles size={14} className="text-primary-600" />
            <span>AI Quiz Generator</span>
          </Link>
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary flex items-center gap-2 text-sm shadow-sm"
          >
            <Plus size={16} />
            <span>Create Class</span>
          </button>
        </div>
      </div>

      {/* Quick OTP Attendance Launcher Strip */}
      {classes.length > 0 && (
        <div className="card-surface p-4 sm:p-5 rounded-xl border border-border">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-content flex items-center gap-2">
                <Clock size={16} className="text-primary-600" />
                Quick Attendance Check-In (OTP)
              </h3>
              <p className="text-xs text-muted">Generate a 6-digit verification code for students attending your active lecture</p>
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

      {/* ======================================================== */}
      {/* 5. DEDICATED QUIZ RESULTS & STUDENT MARKS SECTION */}
      {/* ======================================================== */}
      <section className="card-surface p-6 sm:p-7 rounded-2xl border border-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <ClipboardList size={20} className="text-primary-600" />
              <h2 className="text-lg font-bold text-content">Quiz Results & Student Performance</h2>
            </div>
            <p className="text-xs text-muted mt-1">
              Live student attempt evaluation, marks breakdown, and instructor grading oversight
            </p>
          </div>

          <div className="flex items-center gap-3">
            {activeQuiz && (
              <button
                onClick={handleExportCSV}
                className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg"
                title="Download CSV report of student marks"
              >
                <Download size={14} />
                <span>Export CSV</span>
              </button>
            )}

            {activeClass && (
              <Link
                to={`/classes/${selectedResultsClass}/quizzes/create`}
                className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg shadow-xs"
              >
                <Plus size={14} />
                <span>New Quiz</span>
              </Link>
            )}
          </div>
        </div>

        {/* Course & Quiz Selectors Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-base p-4 rounded-xl border border-border">
          {/* Course Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
              Course Managed
            </label>
            <select
              value={selectedResultsClass}
              onChange={(e) => setSelectedResultsClass(e.target.value)}
              className="input-field text-xs py-1.5"
            >
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Quiz Selector */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
              Select Assessment Quiz
            </label>
            <select
              value={selectedQuizId}
              onChange={(e) => setSelectedQuizId(e.target.value)}
              disabled={classQuizzes.length === 0}
              className="input-field text-xs py-1.5 disabled:opacity-50"
            >
              {classQuizzes.map(q => (
                <option key={q._id} value={q._id}>
                  {q.title} ({q.questions?.length || 0} Qs) {q.isPublished ? '' : '[Draft]'}
                </option>
              ))}
              {classQuizzes.length === 0 && (
                <option value="">No quizzes in course</option>
              )}
            </select>
          </div>

          {/* Search Student Query */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
              Filter by Student
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchStudentQuery}
                onChange={(e) => setSearchStudentQuery(e.target.value)}
                placeholder="Search name or ID..."
                className="input-field text-xs py-1.5 pl-7"
              />
              <Search size={13} className="absolute left-2.5 top-2.5 text-muted" />
            </div>
          </div>

          {/* Evaluation Status Filter */}
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted block mb-1">
              Evaluation Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field text-xs py-1.5"
            >
              <option value="all">All Submissions</option>
              <option value="Evaluated">Evaluated</option>
              <option value="Pending Review">Pending Review</option>
            </select>
          </div>
        </div>

        {/* Analytics Highlights Ribbon */}
        {activeQuiz && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-base border border-border">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Total Submissions</span>
              <span className="text-2xl font-black text-content">{submittedCount}</span>
              <span className="text-[11px] text-muted block mt-0.5">Students submitted</span>
            </div>

            <div className="p-3.5 rounded-xl bg-base border border-border">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Average Score</span>
              <span className="text-2xl font-black text-primary-600 dark:text-primary-400">
                {avgScore} <span className="text-xs text-muted font-normal">/ {maxMarks}</span>
              </span>
              <span className="text-[11px] text-muted block mt-0.5">Class average</span>
            </div>

            <div className="p-3.5 rounded-xl bg-base border border-border">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Highest Score</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {highestScore} <span className="text-xs text-muted font-normal">/ {maxMarks}</span>
              </span>
              <span className="text-[11px] text-muted block mt-0.5">Top result</span>
            </div>

            <div className="p-3.5 rounded-xl bg-base border border-border">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Pass Rate</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                {passRate}%
              </span>
              <span className="text-[11px] text-muted block mt-0.5">{passCount} scored &ge; 50%</span>
            </div>
          </div>
        )}

        {/* Real Student Submissions Table */}
        <div className="border border-border rounded-xl overflow-hidden">
          {loadingAttempts ? (
            <div className="py-16 text-center text-xs text-muted">
              Loading student results...
            </div>
          ) : !activeQuiz ? (
            <div className="py-16 text-center text-xs text-muted">
              No quizzes created yet for this course. Click "New Quiz" to build or generate one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-base/70 text-[11px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4 text-center">Correct</th>
                    <th className="py-3 px-4 text-center">Incorrect</th>
                    <th className="py-3 px-4 text-center">Unanswered</th>
                    <th className="py-3 px-4 text-center">Marks</th>
                    <th className="py-3 px-4 text-center">Percentage</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredAttempts.map((att) => {
                    const studentObj = att.student || {};
                    const isSubmitted = att.status === 'Submitted';
                    return (
                      <tr key={att._id} className="hover:bg-base/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-content">
                          <div className="text-xs font-bold">{studentObj.name || att.studentName || 'Alex Johnson'}</div>
                          <div className="text-[10px] text-muted font-normal font-mono">
                            {studentObj.studentId || studentObj.email || att.studentEmail || 'CS2026-001'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-emerald-600">
                          {isSubmitted ? (att.correctCount ?? 0) : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-rose-500">
                          {isSubmitted ? (att.incorrectCount ?? 0) : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-amber-500">
                          {isSubmitted ? (att.unansweredCount ?? 0) : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-content">
                          {isSubmitted ? `${att.score}/${att.maxScore || maxMarks}` : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold">
                          {isSubmitted ? (
                            <span className={att.percentage >= 50 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}>
                              {att.percentage}%
                            </span>
                          ) : '-'}
                        </td>

                        <td className="py-3.5 px-4 text-muted text-[11px]">
                          {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : 'In Progress'}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`badge-status ${
                            att.evaluationStatus === 'Evaluated'
                              ? 'badge-status-evaluated'
                              : 'badge-status-pending'
                          }`}>
                            {att.evaluationStatus || att.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {isSubmitted ? (
                            <button
                              onClick={() => handleOpenInspect(att)}
                              className="btn-secondary text-[11px] py-1 px-2.5 rounded-lg font-medium"
                            >
                              Review / Grade
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted italic">In Progress</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredAttempts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted text-xs">
                        {quizAttempts.length === 0
                          ? 'No student submissions recorded yet for this quiz.'
                          : 'No submissions matching your filter criteria.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      {/* ======================================================== */}
      {/* DEDICATED ASSIGNMENT SUBMISSIONS OVERVIEW SECTION */}
      {/* ======================================================== */}
      <section id="assignment-submissions" className="card-surface p-6 sm:p-7 rounded-2xl border border-border shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck size={20} className="text-primary-600" />
              <h2 className="text-lg font-bold text-content">Assignment Submissions Overview</h2>
            </div>
            <p className="text-xs text-muted mt-1">
              Live submission counts, eligible student rosters, and pending review queue for your courses
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted font-medium">Filter Course:</label>
              <select
                value={submissionClassFilter}
                onChange={(e) => setSubmissionClassFilter(e.target.value)}
                className="input-field text-xs py-1.5 px-3"
              >
                <option value="all">All Managed Courses ({classes.length})</option>
                {classes.map(c => (
                  <option key={c._id} value={c._id}>{c.name}</option>
                ))}
              </select>
            </div>
            <Link
              to="/assignments"
              className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 rounded-lg"
            >
              <FileText size={14} />
              <span>Manage Coursework</span>
            </Link>
          </div>
        </div>

        {/* Global stats for filtered assignments */}
        {(() => {
          const filteredList = submissionClassFilter === 'all'
            ? assignmentsOverview
            : assignmentsOverview.filter(a => a.classId === submissionClassFilter || (a.classId?._id === submissionClassFilter));
          
          const totalEligible = filteredList.reduce((sum, a) => sum + (a.stats?.totalEligibleCount || 0), 0);
          const totalSubmitted = filteredList.reduce((sum, a) => sum + (a.stats?.submittedCount || 0), 0);
          const totalNotSubmitted = filteredList.reduce((sum, a) => sum + (a.stats?.notSubmittedCount || 0), 0);
          const totalAwaitingReview = filteredList.reduce((sum, a) => sum + (a.stats?.awaitingReviewCount || 0), 0);
          const totalReviewed = filteredList.reduce((sum, a) => sum + (a.stats?.reviewedCount || 0), 0);
          const totalLate = filteredList.reduce((sum, a) => sum + (a.stats?.lateCount || 0), 0);

          return (
            <div className="space-y-6">
              {/* Metric Highlights Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="p-3 bg-base rounded-xl border border-border">
                  <span className="text-[11px] uppercase tracking-wider text-muted font-bold block">Assignments</span>
                  <span className="text-xl font-bold text-content mt-1 block">{filteredList.length}</span>
                </div>
                <div className="p-3 bg-base rounded-xl border border-border">
                  <span className="text-[11px] uppercase tracking-wider text-muted font-bold block">Total Students</span>
                  <span className="text-xl font-bold text-content mt-1 block">{totalEligible}</span>
                </div>
                <div className="p-3 bg-base rounded-xl border border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-950/20">
                  <span className="text-[11px] uppercase tracking-wider text-emerald-700 dark:text-emerald-400 font-bold block">Submitted</span>
                  <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">{totalSubmitted}</span>
                </div>
                <div className="p-3 bg-base rounded-xl border border-amber-500/20 bg-amber-50/30 dark:bg-amber-950/20">
                  <span className="text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400 font-bold block">Not Submitted</span>
                  <span className="text-xl font-bold text-amber-600 dark:text-amber-400 mt-1 block">{totalNotSubmitted}</span>
                </div>
                <div className="p-3 bg-base rounded-xl border border-blue-500/20 bg-blue-50/30 dark:bg-blue-950/20">
                  <span className="text-[11px] uppercase tracking-wider text-blue-700 dark:text-blue-400 font-bold block">Awaiting Review</span>
                  <span className="text-xl font-bold text-blue-600 dark:text-blue-400 mt-1 block">{totalAwaitingReview}</span>
                </div>
                <div className="p-3 bg-base rounded-xl border border-purple-500/20 bg-purple-50/30 dark:bg-purple-950/20">
                  <span className="text-[11px] uppercase tracking-wider text-purple-700 dark:text-purple-400 font-bold block">Reviewed</span>
                  <span className="text-xl font-bold text-purple-600 dark:text-purple-400 mt-1 block">{totalReviewed}</span>
                </div>
              </div>

              {/* Assignment Cards List */}
              {filteredList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-border rounded-xl">
                  <FileText size={32} className="mx-auto text-muted mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-content">No coursework assignments found</p>
                  <p className="text-xs text-muted mt-1">Create assignments to track student PDF turn-ins and grade submissions</p>
                  <Link to="/assignments" className="btn-primary text-xs mt-4 inline-flex items-center gap-1.5">
                    <Plus size={14} />
                    <span>Create Assignment</span>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredList.map(asgn => {
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
                      <div key={asgn._id} className="p-5 bg-base rounded-xl border border-border hover:border-primary-300 dark:hover:border-primary-700 transition-all space-y-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary-100 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300">
                                {asgn.courseName || 'Course'}
                              </span>
                              {asgn.courseCode && (
                                <span className="badge-course-code text-[10px] py-0 px-2">
                                  {asgn.courseCode}
                                </span>
                              )}
                              <span className="text-xs text-muted">Due: {dueDateStr}</span>
                            </div>
                            <h3 className="text-base font-bold text-content">{asgn.title}</h3>
                            <p className="text-xs text-muted line-clamp-1">{asgn.description || 'No description provided'}</p>
                          </div>

                          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-surface border border-border text-content shrink-0">
                            {asgn.maxMarks || 100} Marks
                          </span>
                        </div>

                        {/* Submission Breakdown Metrics */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                          <div className="p-2 bg-surface rounded-lg border border-border">
                            <span className="text-[10px] text-muted block font-medium">Eligible</span>
                            <span className="text-sm font-bold text-content">{stats.totalEligibleCount}</span>
                          </div>
                          <div className="p-2 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-lg border border-emerald-500/20">
                            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 block font-medium">Submitted</span>
                            <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{stats.submittedCount}</span>
                          </div>
                          <div className="p-2 bg-amber-50/50 dark:bg-amber-950/30 rounded-lg border border-amber-500/20">
                            <span className="text-[10px] text-amber-700 dark:text-amber-400 block font-medium">Not Subm.</span>
                            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">{stats.notSubmittedCount}</span>
                          </div>
                          <div className="p-2 bg-blue-50/50 dark:bg-blue-950/30 rounded-lg border border-blue-500/20">
                            <span className="text-[10px] text-blue-700 dark:text-blue-400 block font-medium">Awaiting</span>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{stats.awaitingReviewCount}</span>
                          </div>
                          <div className="p-2 bg-purple-50/50 dark:bg-purple-950/30 rounded-lg border border-purple-500/20">
                            <span className="text-[10px] text-purple-700 dark:text-purple-400 block font-medium">Reviewed</span>
                            <span className="text-sm font-bold text-purple-600 dark:text-purple-400">{stats.reviewedCount}</span>
                          </div>
                          <div className="p-2 bg-rose-50/50 dark:bg-rose-950/30 rounded-lg border border-rose-500/20">
                            <span className="text-[10px] text-rose-700 dark:text-rose-400 block font-medium">Late</span>
                            <span className="text-sm font-bold text-rose-600 dark:text-rose-400">{stats.lateCount}</span>
                          </div>
                        </div>

                        {/* Progress Bar & Actions */}
                        <div className="space-y-2 pt-2 border-t border-border">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted">Turn-in Completion: <strong className="text-content">{submitPct}%</strong></span>
                            {stats.awaitingReviewCount > 0 && (
                              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                                {stats.awaitingReviewCount} pending review
                              </span>
                            )}
                          </div>
                          <div className="w-full bg-surface h-2 rounded-full overflow-hidden border border-border">
                            <div
                              className="bg-emerald-500 h-full transition-all duration-500 rounded-full"
                              style={{ width: `${Math.min(100, submitPct)}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-muted">
                            {stats.notSubmittedCount > 0 ? `${stats.notSubmittedCount} students haven't submitted` : 'All students submitted!'}
                          </span>
                          <Link
                            to={`/classes/${asgn.classId}/assignments/${asgn._id}`}
                            className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5 shadow-xs"
                          >
                            <span>Inspect & Grade Submissions</span>
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
        })()}
      </section>

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
                    <span className="badge-course-code">
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
                Class Coursework Assignments ({dashboardData.upcomingAssignments.length})
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
              <Link to="/leave-requests" className="text-xs text-primary-600 hover:underline font-medium">
                Manage All ({dashboardData.pendingLeaves.length}) →
              </Link>
            </div>
            {dashboardData.pendingLeaves.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.pendingLeaves.map(leave => (
                  <div key={leave._id} className="p-3 bg-base rounded-lg border border-border flex flex-col gap-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-medium text-content text-sm block">
                          {leave.student?.name}
                          {(leave.student?.studentId || leave.student?._id) && (
                            <span className="text-xs text-muted font-mono ml-1.5 font-normal">
                              ({leave.student?.studentId || leave.student?._id})
                            </span>
                          )}
                        </span>
                        <span className="text-xs text-muted">{leave.classId?.name}</span>
                      </div>
                      <span className="badge-status badge-status-pending">
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
                    <p className="text-[10px] text-muted mt-1">{new Date(ann.createdAt).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-xs text-center py-6">No announcements published yet.</p>
            )}
          </div>
        </div>
      )}

      {/* Teacher Inspect & Manual Grading Modal */}
      {inspectingAttempt && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-border bg-base flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-content">
                  Review Submission: {inspectingAttempt.student?.name || inspectingAttempt.studentName}
                </h3>
                <p className="text-xs text-muted">
                  ID: {inspectingAttempt.student?.studentId || inspectingAttempt.student?.email || inspectingAttempt.studentEmail} • Submitted {new Date(inspectingAttempt.submittedAt || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setInspectingAttempt(null)}
                className="text-muted hover:text-content text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="p-3 bg-base rounded-xl border border-border flex justify-between items-center text-xs">
                <span>Calculated Marks: <strong>{inspectingAttempt.score} / {inspectingAttempt.maxScore || maxMarks}</strong></span>
                <span>Percentage: <strong>{inspectingAttempt.percentage}%</strong></span>
                <span>Status: <strong className="text-primary-600">{inspectingAttempt.evaluationStatus}</strong></span>
              </div>

              {/* Questions Review & Manual Mark Override */}
              <div className="space-y-4">
                {(inspectingAttempt.evaluation || []).map((ev, idx) => (
                  <div key={ev.questionId || idx} className="p-4 rounded-xl border border-border bg-surface space-y-2">
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs font-bold text-content leading-relaxed">
                        {idx + 1}. {ev.questionText}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-[10px] text-muted font-bold">Marks:</label>
                        <input
                          type="number"
                          min="0"
                          max={ev.maxMarks}
                          value={modalMarks[ev.questionId] ?? ev.marksAwarded}
                          onChange={(e) => setModalMarks({ ...modalMarks, [ev.questionId]: e.target.value })}
                          className="input-field w-16 text-center text-xs py-1"
                        />
                        <span className="text-xs text-muted font-bold">/ {ev.maxMarks}</span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1 pt-1">
                      <p><span className="text-muted font-medium">Student's Answer:</span> <strong className="text-content">{ev.selectedOptionText || ev.studentAnswer || '(No answer submitted)'}</strong></p>
                      <p><span className="text-muted font-medium">Expected Key:</span> <strong className="text-emerald-600 dark:text-emerald-400">{ev.correctAnswerText || 'Instructor criteria'}</strong></p>
                      {ev.feedback && <p className="text-[11px] text-muted italic">System / AI Feedback: {ev.feedback}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Teacher Grading Notes */}
              <div>
                <label className="text-xs font-bold text-content block mb-1">Teacher Review Notes / Feedback</label>
                <textarea
                  value={modalNotes}
                  onChange={(e) => setModalNotes(e.target.value)}
                  placeholder="Instructor feedback explaining mark adjustment..."
                  rows={2}
                  className="input-field w-full text-xs p-3"
                ></textarea>
              </div>
            </div>

            <div className="p-4 border-t border-border bg-base flex justify-end gap-3">
              <button
                onClick={() => setInspectingAttempt(null)}
                className="btn-secondary text-xs py-2 px-4 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalGrade}
                disabled={isSavingGrade}
                className="btn-primary text-xs py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSavingGrade ? 'Saving Adjustments...' : 'Save Grade'}
              </button>
            </div>
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
            <form onSubmit={handleCreateClass} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-content mb-1">Class Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS301: Distributed Systems"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  className="input-field text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-content mb-1">Course Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Section details, semester schedule, prerequisites..."
                  value={newClassDesc}
                  onChange={(e) => setNewClassDesc(e.target.value)}
                  className="input-field text-xs resize-none"
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Review Confirmation Modal */}
      {reviewingLeave && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 rounded-xl border border-border shadow-xl">
            <div className="px-6 py-4 border-b border-border bg-base flex justify-between items-center">
              <div>
                <h3 className="text-base font-semibold text-content">
                  {reviewStatus === 'approved' ? 'Approve' : 'Reject'} Leave Application
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Student: {reviewingLeave.student?.name} • {reviewingLeave.classId?.name}
                </p>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                reviewStatus === 'approved'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
              }`}>
                {reviewStatus}
              </span>
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
