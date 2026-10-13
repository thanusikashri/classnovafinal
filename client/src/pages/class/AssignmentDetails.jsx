import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ClipboardList,
  ArrowLeft,
  CheckCircle,
  Clock,
  Calendar,
  Upload,
  FileText,
  Download,
  Eye,
  AlertCircle,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Award,
  Users,
  Edit3,
  X,
  FileCheck,
  Send,
  RotateCcw
} from 'lucide-react';
import api from '../../services/api';

const AssignmentDetails = () => {
  const { id: classId, assignmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [loading, setLoading] = useState(true);

  // Teacher State: submissions & eligible student roster
  const [submissions, setSubmissions] = useState([]);
  const [eligibleStudents, setEligibleStudents] = useState([]);
  const [stats, setStats] = useState({
    totalEligibleCount: 0,
    submittedCount: 0,
    notSubmittedCount: 0,
    awaitingReviewCount: 0,
    reviewedCount: 0,
    lateCount: 0
  });
  const [filterTab, setFilterTab] = useState('all'); // 'all', 'submitted', 'not_submitted', 'awaiting_review', 'reviewed', 'late'
  const [searchQuery, setSearchQuery] = useState('');

  // Student State: own submission & PDF upload
  const [mySubmission, setMySubmission] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [studentComment, setStudentComment] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  // PDF Preview Modal State
  const [pdfPreview, setPdfPreview] = useState(null); // { url, filename }

  // Teacher Grading Modal State
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);

  const fetchAssignmentData = useCallback(async () => {
    try {
      try {
        const clsRes = await api.get(`/classes/${classId}`);
        setCourseName(clsRes.data.data?.name || 'Course');
      } catch (e) {
        // Fallback
      }

      const res = await api.get(`/classes/${classId}/assignments/${assignmentId}`);
      setAssignment(res.data.data);
    } catch (err) {
      console.error(err);
      navigate(`/classes/${classId}`);
    }
  }, [classId, assignmentId, navigate]);

  const fetchSubmissionsData = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${classId}/assignments/${assignmentId}/submissions`);
      setSubmissions(res.data.data?.submissions || res.data.data || []);
      setEligibleStudents(res.data.data?.eligibleStudents || []);
      if (res.data.data?.stats) {
        setStats(res.data.data.stats);
      }
    } catch (err) {
      console.error('Failed to load assignment submissions', err);
    }
  }, [classId, assignmentId]);

  const fetchMySubmissionData = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${classId}/assignments/${assignmentId}/submissions/me`);
      const sub = res.data.data;
      setMySubmission(sub);
      if (sub && sub.content) {
        setStudentComment(sub.content);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(err);
      }
      setMySubmission(null);
    }
  }, [classId, assignmentId]);

  useEffect(() => {
    const init = async () => {
      await fetchAssignmentData();
      setLoading(false);
    };
    init();
  }, [fetchAssignmentData]);

  useEffect(() => {
    if (assignment) {
      const isTeacher = user?.role === 'admin' ||
                        (assignment.teacher && (assignment.teacher._id === user?._id || assignment.teacher === user?._id)) ||
                        user?.role === 'teacher';
      if (isTeacher) {
        fetchSubmissionsData();
      } else {
        fetchMySubmissionData();
      }
    }
  }, [assignment, user, fetchSubmissionsData, fetchMySubmissionData]);

  // --- PDF UPLOADER HANDLERS (STUDENT) ---
  const handleFileSelect = (file) => {
    setUploadError('');
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadError('Only PDF documents (.pdf) are supported for assignment submissions.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds maximum allowed size of 10 MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    setUploadError('');

    if (!selectedFile && !mySubmission) {
      setUploadError('Please select or drag-and-drop your assignment PDF file.');
      return;
    }

    if (isSubmitting) return; // Prevent double submission
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      if (studentComment) {
        formData.append('content', studentComment);
      }

      const res = await api.post(`/classes/${classId}/assignments/${assignmentId}/submissions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMySubmission(res.data.data);
      setSelectedFile(null);
      alert('Assignment turned in successfully!');
      fetchMySubmissionData();
    } catch (err) {
      console.error(err);
      setUploadError(err.response?.data?.message || 'Failed to submit assignment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- TEACHER GRADING HANDLERS ---
  const handleOpenGradeModal = (sub) => {
    setGradingSubmission(sub);
    setMarks(sub.marks !== undefined && sub.marks !== null ? sub.marks : '');
    setFeedback(sub.feedback || '');
  };

  const handleSaveGrade = async (e) => {
    e.preventDefault();
    if (!gradingSubmission) return;
    setIsGrading(true);

    try {
      await api.put(`/classes/${classId}/assignments/${assignmentId}/submissions/${gradingSubmission._id}/grade`, {
        marks: Number(marks),
        feedback
      });

      setGradingSubmission(null);
      alert('Submission graded successfully!');
      fetchSubmissionsData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error saving grade review');
    } finally {
      setIsGrading(false);
    }
  };

  // --- PDF VIEW / DOWNLOAD HANDLERS ---
  const handleViewPdf = (submission) => {
    const fileEndpoint = `/classes/${classId}/assignments/${assignmentId}/submissions/${submission._id}/file?action=view`;
    const fullUrl = `${api.defaults.baseURL || '/api'}${fileEndpoint}`;
    setPdfPreview({
      url: fullUrl,
      fileName: submission.fileName || 'Submission_Document.pdf',
      studentName: submission.student?.name || submission.studentName || 'Student',
      submission
    });
  };

  const handleDownloadPdf = (submission) => {
    const fileEndpoint = `/classes/${classId}/assignments/${assignmentId}/submissions/${submission._id}/file?action=download`;
    const fullUrl = `${api.defaults.baseURL || '/api'}${fileEndpoint}`;
    const token = localStorage.getItem('token');

    // Trigger download
    const link = document.createElement('a');
    link.href = fullUrl;
    link.setAttribute('download', submission.fileName || 'submission.pdf');
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '240 KB';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading || !assignment) {
    return <div className="flex justify-center py-20 text-muted text-sm">Loading assignment details...</div>;
  }

  const isTeacher = user?.role === 'admin' ||
                    (assignment.teacher && (assignment.teacher._id === user?._id || assignment.teacher === user?._id)) ||
                    user?.role === 'teacher';

  const isPastDue = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;

  // Filter roster for teacher view
  const filteredRoster = eligibleStudents.filter(item => {
    const sName = (item.name || '').toLowerCase();
    const sId = (item.studentId || item.email || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || sName.includes(q) || sId.includes(q);

    if (!matchesSearch) return false;

    if (filterTab === 'submitted') return item.isSubmitted;
    if (filterTab === 'not_submitted') return !item.isSubmitted;
    if (filterTab === 'awaiting_review') return item.isSubmitted && item.submission?.status === 'Submitted';
    if (filterTab === 'reviewed') return item.isSubmitted && (item.submission?.status === 'Graded' || item.submission?.status === 'Reviewed');
    if (filterTab === 'late') return item.isSubmitted && item.submission?.isLate;

    return true;
  });

  return (
    <div className="max-w-6xl mx-auto pb-16 font-sans pt-2 px-4">
      {/* Back button */}
      <button
        onClick={() => navigate(`/classes/${classId}`)}
        className="flex items-center gap-2 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        <span>Back to Course ({courseName})</span>
      </button>

      {/* Main Assignment Banner */}
      <div className="card-surface p-6 sm:p-8 rounded-2xl border border-border shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-950/60 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
              <ClipboardList size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-content">{assignment.title}</h1>
              <p className="text-xs text-muted mt-0.5">
                Instructor: <span className="font-semibold text-content">{assignment.teacher?.name || 'Instructor'}</span> • Course: <span className="font-semibold text-content">{courseName}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="badge-course-code">
              {assignment.maxMarks} Points
            </span>
            {isPastDue && (
              <span className="badge-status badge-status-closed">
                Past Deadline
              </span>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="prose max-w-none text-content/90 text-sm whitespace-pre-wrap mb-6 bg-base/50 p-4 rounded-xl border border-border">
          {assignment.description}
        </div>

        {/* Due Date & Deadline Notice */}
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-medium text-muted border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-primary-600" />
            <span>
              Deadline: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : 'No strict deadline'}
            </span>
          </div>
          <div>
            Posted: {new Date(assignment.createdAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* STUDENT VIEW: PDF UPLOADER & SUBMISSION HISTORY */}
      {/* ======================================================== */}
      {!isTeacher && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Column: Submission Status & Turned In Deliverables */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-surface p-6 sm:p-7 rounded-2xl border border-border shadow-xs">
              <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
                <h2 className="text-base font-bold text-content flex items-center gap-2">
                  <FileCheck size={18} className="text-primary-600" />
                  Your Submission Deliverable
                </h2>
                <span className={`badge-status ${
                  mySubmission?.status === 'Graded'
                    ? 'badge-status-evaluated'
                    : mySubmission?.status === 'Submitted'
                    ? 'badge-status-submitted'
                    : 'badge-status-pending'
                }`}>
                  {mySubmission ? mySubmission.status : 'Not Submitted'}
                </span>
              </div>

              {/* If Already Submitted: Show file card, timestamp, and actions */}
              {mySubmission ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-base border border-border flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 shrink-0">
                        <FileText size={22} />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-content truncate" title={mySubmission.fileName}>
                          {mySubmission.fileName}
                        </h4>
                        <p className="text-[11px] text-muted mt-0.5">
                          {formatFileSize(mySubmission.fileSize)} • Submitted {new Date(mySubmission.submittedAt || Date.now()).toLocaleString()}
                          {mySubmission.isLate && (
                            <span className="text-rose-600 dark:text-rose-400 font-bold ml-1.5">(Late)</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleViewPdf(mySubmission)}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg"
                        title="Preview PDF"
                      >
                        <Eye size={14} />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleDownloadPdf(mySubmission)}
                        className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg"
                        title="Download PDF"
                      >
                        <Download size={14} />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>

                  {/* Submission note if provided */}
                  {mySubmission.content && (
                    <div className="text-xs text-muted p-3 bg-base/50 rounded-lg border border-border italic">
                      "{mySubmission.content}"
                    </div>
                  )}

                  {/* Instructor Grading Result */}
                  {mySubmission.status === 'Graded' && (
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 size={16} />
                          Instructor Evaluation
                        </span>
                        <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300">
                          {mySubmission.marks} / {assignment.maxMarks} Points
                        </span>
                      </div>
                      {mySubmission.feedback && (
                        <p className="text-xs text-content pt-2 border-t border-emerald-200 dark:border-emerald-800/40">
                          <strong>Instructor Note:</strong> {mySubmission.feedback}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted text-xs">
                  You have not submitted work for this assignment yet. Upload your PDF deliverable below.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: PDF Uploader Box */}
          <div className="card-surface p-6 rounded-2xl border border-border shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-content flex items-center gap-2">
              <Upload size={16} className="text-primary-600" />
              {mySubmission ? 'Resubmit Assignment' : 'Turn In Your Work'}
            </h3>

            <form onSubmit={handleSubmitWork} className="space-y-4">
              {/* Drag and Drop Box */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDragging
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/30'
                    : selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/20'
                    : 'border-border hover:border-primary-400 bg-base/50 hover:bg-base'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={(e) => handleFileSelect(e.target.files[0])}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className={`p-3 rounded-full ${selectedFile ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' : 'bg-primary-100 text-primary-600 dark:bg-primary-950/50 dark:text-primary-400'}`}>
                    {selectedFile ? <FileText size={24} /> : <Upload size={24} />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-content block">
                      {selectedFile ? selectedFile.name : 'Click to select or drag PDF file here'}
                    </span>
                    <span className="text-[11px] text-muted mt-0.5 block">
                      {selectedFile ? formatFileSize(selectedFile.size) : 'PDF documents only (up to 10 MB)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Error notice */}
              {uploadError && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-700 dark:text-rose-300 rounded-xl flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              {/* Optional comments */}
              <div>
                <label className="text-[11px] font-bold text-muted uppercase tracking-wider block mb-1">
                  Optional Student Notes
                </label>
                <textarea
                  value={studentComment}
                  onChange={(e) => setStudentComment(e.target.value)}
                  placeholder="Optional remarks for instructor..."
                  rows={2}
                  className="input-field text-xs resize-none"
                ></textarea>
              </div>

              {/* Turn In Action */}
              <button
                type="submit"
                disabled={isSubmitting || (!selectedFile && !mySubmission)}
                className="w-full btn-primary text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <Send size={15} />
                <span>{isSubmitting ? 'Uploading & Turning In...' : mySubmission ? 'Resubmit Assignment' : 'Turn In Assignment'}</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TEACHER VIEW: SUBMISSION OVERVIEW, ROSTER & GRADING */}
      {/* ======================================================== */}
      {isTeacher && (
        <div className="space-y-6">
          {/* Summary Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="card-surface p-4 rounded-xl border border-border">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Eligible Students</span>
              <span className="text-2xl font-black text-content">{stats.totalEligibleCount}</span>
              <span className="text-[11px] text-muted block mt-0.5">Enrolled class roster</span>
            </div>

            <div className="card-surface p-4 rounded-xl border border-border">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Submitted</span>
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{stats.submittedCount}</span>
              <span className="text-[11px] text-muted block mt-0.5">Work turned in</span>
            </div>

            <div className="card-surface p-4 rounded-xl border border-border">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Not Submitted</span>
              <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{stats.notSubmittedCount}</span>
              <span className="text-[11px] text-muted block mt-0.5">Missing deliverables</span>
            </div>

            <div className="card-surface p-4 rounded-xl border border-border">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Awaiting Review</span>
              <span className="text-2xl font-black text-primary-600 dark:text-primary-400">{stats.awaitingReviewCount}</span>
              <span className="text-[11px] text-muted block mt-0.5">Pending evaluation</span>
            </div>

            <div className="card-surface p-4 rounded-xl border border-border">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Reviewed</span>
              <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">{stats.reviewedCount}</span>
              <span className="text-[11px] text-muted block mt-0.5">Graded by teacher</span>
            </div>

            <div className="card-surface p-4 rounded-xl border border-border">
              <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Late Turn-Ins</span>
              <span className="text-2xl font-black text-rose-500">{stats.lateCount}</span>
              <span className="text-[11px] text-muted block mt-0.5">Past deadline</span>
            </div>
          </div>

          {/* Roster Controls: Search & Tabs */}
          <div className="card-surface p-4 rounded-xl border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              <button
                onClick={() => setFilterTab('all')}
                className={`py-1 px-3 rounded-lg transition-colors ${filterTab === 'all' ? 'bg-primary-600 text-white shadow-xs' : 'text-muted hover:text-content hover:bg-base'}`}
              >
                All ({eligibleStudents.length})
              </button>
              <button
                onClick={() => setFilterTab('submitted')}
                className={`py-1 px-3 rounded-lg transition-colors ${filterTab === 'submitted' ? 'bg-primary-600 text-white shadow-xs' : 'text-muted hover:text-content hover:bg-base'}`}
              >
                Submitted ({stats.submittedCount})
              </button>
              <button
                onClick={() => setFilterTab('not_submitted')}
                className={`py-1 px-3 rounded-lg transition-colors ${filterTab === 'not_submitted' ? 'bg-primary-600 text-white shadow-xs' : 'text-muted hover:text-content hover:bg-base'}`}
              >
                Not Submitted ({stats.notSubmittedCount})
              </button>
              <button
                onClick={() => setFilterTab('awaiting_review')}
                className={`py-1 px-3 rounded-lg transition-colors ${filterTab === 'awaiting_review' ? 'bg-primary-600 text-white shadow-xs' : 'text-muted hover:text-content hover:bg-base'}`}
              >
                Awaiting Review ({stats.awaitingReviewCount})
              </button>
              <button
                onClick={() => setFilterTab('reviewed')}
                className={`py-1 px-3 rounded-lg transition-colors ${filterTab === 'reviewed' ? 'bg-primary-600 text-white shadow-xs' : 'text-muted hover:text-content hover:bg-base'}`}
              >
                Reviewed ({stats.reviewedCount})
              </button>
            </div>

            <div className="relative max-w-xs w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student by name or ID..."
                className="input-field text-xs py-1.5 pl-8 w-full"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-muted" />
            </div>
          </div>

          {/* Submission Roster Table */}
          <div className="card-surface rounded-2xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-base/60 text-[11px] font-bold text-muted uppercase tracking-wider">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4">Uploaded PDF File</th>
                    <th className="py-3 px-4">Submitted Date</th>
                    <th className="py-3 px-4 text-center">Review Status</th>
                    <th className="py-3 px-4 text-center">Marks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredRoster.map(item => {
                    const sub = item.submission;
                    return (
                      <tr key={item._id} className="hover:bg-base/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-content">
                          <div className="text-xs font-bold">{item.name}</div>
                          <div className="text-[10px] text-muted font-normal font-mono">
                            {item.studentId || item.email}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`badge-status ${
                            item.isSubmitted
                              ? 'badge-status-submitted'
                              : 'badge-status-pending'
                          }`}>
                            {item.isSubmitted ? 'Submitted' : 'Not Submitted'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {sub ? (
                            <div className="flex items-center gap-1.5 text-content">
                              <FileText size={14} className="text-rose-500 shrink-0" />
                              <span className="font-medium truncate max-w-[180px]" title={sub.fileName}>
                                {sub.fileName}
                              </span>
                              <span className="text-[10px] text-muted">({formatFileSize(sub.fileSize)})</span>
                            </div>
                          ) : (
                            <span className="text-muted italic">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-muted text-[11px]">
                          {sub ? (
                            <div>
                              <span>{new Date(sub.submittedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                              {sub.isLate && (
                                <span className="ml-1 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded">
                                  Late
                                </span>
                              )}
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {sub ? (
                            <span className={`badge-status ${
                              sub.status === 'Graded' || sub.status === 'Reviewed'
                                ? 'badge-status-evaluated'
                                : 'badge-status-pending'
                            }`}>
                              {sub.status === 'Graded' ? 'Graded' : 'Awaiting Review'}
                            </span>
                          ) : (
                            <span>—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center font-bold text-content">
                          {sub && sub.marks !== undefined && sub.marks !== null ? (
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {sub.marks} / {assignment.maxMarks}
                            </span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {sub ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleViewPdf(sub)}
                                className="btn-secondary text-[11px] py-1 px-2.5 rounded-lg flex items-center gap-1"
                                title="View PDF Document"
                              >
                                <Eye size={13} />
                                <span>View</span>
                              </button>

                              <button
                                onClick={() => handleDownloadPdf(sub)}
                                className="btn-secondary text-[11px] py-1 px-2.5 rounded-lg flex items-center gap-1"
                                title="Download PDF"
                              >
                                <Download size={13} />
                                <span>Download</span>
                              </button>

                              <button
                                onClick={() => handleOpenGradeModal(sub)}
                                className="btn-primary text-[11px] py-1 px-2.5 rounded-lg flex items-center gap-1 shadow-xs"
                              >
                                <Award size={13} />
                                <span>Grade</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-muted italic">Pending Turn In</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRoster.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-muted text-xs">
                        No students found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PDF PREVIEW MODAL */}
      {/* ======================================================== */}
      {pdfPreview && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-4xl h-[88vh] flex flex-col rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="p-4 border-b border-border bg-base flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText size={20} className="text-rose-500 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-content truncate">{pdfPreview.fileName}</h3>
                  <p className="text-[11px] text-muted">Student: {pdfPreview.studentName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDownloadPdf(pdfPreview.submission)}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 rounded-lg"
                >
                  <Download size={14} />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setPdfPreview(null)}
                  className="p-1.5 rounded-lg text-muted hover:text-content hover:bg-base transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Embedded Viewer Canvas */}
            <div className="flex-1 bg-slate-900/5 dark:bg-black/40 p-2 overflow-hidden flex flex-col">
              <iframe
                src={pdfPreview.url}
                title={pdfPreview.fileName}
                className="w-full h-full rounded-xl border border-border bg-white"
              />
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TEACHER REVIEW & GRADING MODAL */}
      {/* ======================================================== */}
      {gradingSubmission && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-5 border-b border-border bg-base flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-content">Grade Submission</h3>
                <p className="text-xs text-muted">
                  Student: {gradingSubmission.student?.name || gradingSubmission.studentName}
                </p>
              </div>
              <button
                onClick={() => setGradingSubmission(null)}
                className="p-1 rounded-lg text-muted hover:text-content"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveGrade}>
              <div className="p-6 space-y-4">
                <div className="p-3 bg-base rounded-xl border border-border text-xs flex justify-between items-center">
                  <span className="text-muted truncate max-w-[200px]">{gradingSubmission.fileName}</span>
                  <button
                    type="button"
                    onClick={() => handleViewPdf(gradingSubmission)}
                    className="text-primary-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <Eye size={12} />
                    <span>View PDF</span>
                  </button>
                </div>

                <div>
                  <label className="text-xs font-bold text-content block mb-1">
                    Marks Awarded (Max {assignment.maxMarks})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={assignment.maxMarks}
                    required
                    value={marks}
                    onChange={(e) => setMarks(e.target.value)}
                    placeholder={`e.g. ${Math.round(assignment.maxMarks * 0.9)}`}
                    className="input-field text-sm font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-content block mb-1">
                    Instructor Review Notes & Feedback
                  </label>
                  <textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide constructive feedback, suggestions, or critique..."
                    rows={3}
                    className="input-field text-xs resize-none p-3"
                  ></textarea>
                </div>
              </div>

              <div className="p-4 border-t border-border bg-base flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setGradingSubmission(null)}
                  className="btn-secondary text-xs py-2 px-4 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGrading}
                  className="btn-primary text-xs py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isGrading ? 'Saving Grade...' : 'Save & Post Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetails;
