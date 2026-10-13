import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Award,
  BookOpen,
  Calendar,
  AlertCircle,
  HelpCircle,
  Users,
  BarChart3,
  Check,
  Edit3,
  ExternalLink,
  Sparkles,
  FileText
} from 'lucide-react';
import api from '../../services/api';

const QuizDetails = () => {
  const { id: classId, quizId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [attempts, setAttempts] = useState([]); // for teacher
  const [myAttempts, setMyAttempts] = useState([]); // for student
  const [loading, setLoading] = useState(true);

  // Teacher manual grading / inspection modal state
  const [inspectingAttempt, setInspectingAttempt] = useState(null);
  const [adjustingMarks, setAdjustingMarks] = useState({});
  const [teacherNotes, setTeacherNotes] = useState('');
  const [isSavingGrade, setIsSavingGrade] = useState(false);

  const fetchQuizAndCourse = useCallback(async () => {
    try {
      try {
        const clsRes = await api.get(`/classes/${classId}`);
        setCourseName(clsRes.data.data?.name || 'Course');
      } catch (e) {
        // Fallback
      }

      const res = await api.get(`/classes/${classId}/quizzes/${quizId}`);
      setQuiz(res.data.data);
    } catch (err) {
      console.error(err);
      navigate(`/classes/${classId}`);
    }
  }, [classId, quizId, navigate]);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${classId}/quizzes/${quizId}/attempts`);
      setAttempts(res.data.data || []);
    } catch (err) {
      console.error('Failed to load teacher quiz attempts', err);
    }
  }, [classId, quizId]);

  const fetchMyAttempts = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${classId}/quizzes/${quizId}/attempts/me`);
      setMyAttempts(res.data.data || []);
    } catch (err) {
      console.error('Failed to load student quiz attempts', err);
    }
  }, [classId, quizId]);

  useEffect(() => {
    const init = async () => {
      await fetchQuizAndCourse();
      setLoading(false);
    };
    init();
  }, [fetchQuizAndCourse]);

  useEffect(() => {
    if (quiz) {
      const isTeacher = user?.role === 'admin' || quiz.teacher === user?._id || user?.role === 'teacher';
      if (isTeacher) {
        fetchAnalytics();
      } else {
        fetchMyAttempts();
      }
    }
  }, [quiz, user, fetchAnalytics, fetchMyAttempts]);

  // Open modal to inspect or adjust student attempt marks
  const handleOpenInspect = (att) => {
    setInspectingAttempt(att);
    const initialMarks = {};
    if (att.evaluation) {
      att.evaluation.forEach(e => {
        initialMarks[e.questionId] = e.marksAwarded;
      });
    }
    setAdjustingMarks(initialMarks);
    setTeacherNotes(att.manualGrading?.teacherNotes || '');
  };

  const handleSaveGrading = async () => {
    if (!inspectingAttempt) return;
    setIsSavingGrade(true);
    try {
      const evaluationsPayload = Object.entries(adjustingMarks).map(([qId, marks]) => ({
        questionId: qId,
        marksAwarded: Number(marks)
      }));

      const res = await api.put(`/classes/${classId}/quizzes/${quizId}/attempts/${inspectingAttempt._id}/grade`, {
        evaluations: evaluationsPayload,
        teacherNotes
      });

      const updated = res.data.data;
      setAttempts(prev => prev.map(a => a._id === updated._id ? updated : a));
      setInspectingAttempt(null);
      alert('Marks and evaluation adjustments saved successfully.');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error updating marks');
    } finally {
      setIsSavingGrade(false);
    }
  };

  if (loading || !quiz) {
    return <div className="flex justify-center py-20 text-muted text-sm">Loading quiz details...</div>;
  }

  const isTeacher = user?.role === 'admin' || quiz.teacher === user?._id || user?.role === 'teacher';
  const submittedAttempts = attempts.filter(a => a.status === 'Submitted');
  const avgScore = submittedAttempts.length > 0
    ? (submittedAttempts.reduce((sum, a) => sum + (a.score || 0), 0) / submittedAttempts.length).toFixed(1)
    : 0;
  const highestScore = submittedAttempts.length > 0
    ? Math.max(...submittedAttempts.map(a => a.score || 0))
    : 0;
  const maxQuizScore = quiz.totalMarks || (quiz.questions || []).reduce((t, q) => t + (Number(q.marks) || 1), 0);

  // Latest attempt for student
  const latestStudentAttempt = myAttempts.length > 0 ? myAttempts[0] : null;

  return (
    <div className="max-w-6xl mx-auto pb-16 font-sans pt-2 px-4">
      {/* Back button */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate(`/classes/${classId}`)}
          className="flex items-center gap-2 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Back to Class</span>
        </button>

        {isTeacher && (
          <button
            onClick={() => navigate(`/classes/${classId}/quizzes/${quiz._id}/edit`)}
            className="btn-secondary text-xs flex items-center gap-1.5"
          >
            <Edit3 size={14} />
            <span>Edit Quiz</span>
          </button>
        )}
      </div>

      {/* Quiz Overview Header Card */}
      <div className="card-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-content">{quiz.title}</h1>
              <span className={`badge-status ${
                quiz.isPublished
                  ? 'badge-status-available'
                  : 'badge-status-draft'
              }`}>
                {quiz.isPublished ? 'Published' : 'Draft'}
              </span>
            </div>
            <p className="text-xs text-muted">
              Course: <span className="font-semibold text-content">{courseName}</span> • Total Questions: <span className="font-semibold text-content">{quiz.questions?.length || 0}</span>
            </p>
          </div>

          {!isTeacher && (!latestStudentAttempt || latestStudentAttempt.status !== 'Submitted') && (
            <button
              onClick={() => navigate(`/classes/${classId}/quizzes/${quiz._id}/take`)}
              className="btn-primary text-sm py-2.5 px-6 rounded-xl shadow-md self-start sm:self-auto"
            >
              {latestStudentAttempt?.status === 'In Progress' ? 'Resume Quiz' : 'Start Quiz'}
            </button>
          )}
        </div>

        <p className="text-sm text-content/80 mb-6">{quiz.description || 'No description provided.'}</p>

        {/* Quiz Metadata Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-base p-4 rounded-xl border border-border text-xs">
          <div>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Duration</span>
            <span className="font-bold text-content">{quiz.durationMinutes || 30} Minutes</span>
          </div>
          <div>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Max Score</span>
            <span className="font-bold text-content">{maxQuizScore} Points</span>
          </div>
          <div>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Available From</span>
            <span className="font-semibold text-content">{quiz.startTime ? new Date(quiz.startTime).toLocaleDateString() : 'Now'}</span>
          </div>
          <div>
            <span className="text-[10px] text-muted font-bold uppercase tracking-wider block mb-0.5">Deadline</span>
            <span className="font-semibold text-content">{quiz.endTime ? new Date(quiz.endTime).toLocaleDateString() : 'Open'}</span>
          </div>
        </div>
      </div>

      {/* TEACHER VIEW: Submissions Table & Analytics */}
      {isTeacher && (
        <div className="space-y-6">
          {/* Analytics Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card-surface p-5 rounded-2xl border border-border">
              <span className="text-xs text-muted uppercase font-bold tracking-wider block mb-1">Submissions</span>
              <span className="text-3xl font-black text-content">{submittedAttempts.length}</span>
              <span className="text-xs text-muted block mt-1">Students completed</span>
            </div>

            <div className="card-surface p-5 rounded-2xl border border-border">
              <span className="text-xs text-muted uppercase font-bold tracking-wider block mb-1">Average Score</span>
              <span className="text-3xl font-black text-primary-600 dark:text-primary-400">
                {avgScore} <span className="text-sm font-normal text-muted">/ {maxQuizScore}</span>
              </span>
              <span className="text-xs text-muted block mt-1">Mean class performance</span>
            </div>

            <div className="card-surface p-5 rounded-2xl border border-border">
              <span className="text-xs text-muted uppercase font-bold tracking-wider block mb-1">Highest Score</span>
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">
                {highestScore} <span className="text-sm font-normal text-muted">/ {maxQuizScore}</span>
              </span>
              <span className="text-xs text-muted block mt-1">Top result</span>
            </div>
          </div>

          {/* Submissions Table */}
          <div className="card-surface rounded-2xl border border-border overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-base flex items-center justify-between">
              <h3 className="text-sm font-bold text-content">Student Submissions ({attempts.length})</h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-base/50 text-[11px] font-bold text-muted uppercase tracking-wider">
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
                  {attempts.map(att => {
                    const studentObj = att.student || {};
                    const isSubmitted = att.status === 'Submitted';
                    return (
                      <tr key={att._id} className="hover:bg-base/40 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-content">
                          <div>{studentObj.name || att.studentName || 'Student'}</div>
                          <div className="text-[10px] text-muted font-normal font-mono">
                            {studentObj.studentId || studentObj.email || att.studentEmail}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-emerald-600">
                          {isSubmitted ? (att.correctCount ?? '-') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-rose-500">
                          {isSubmitted ? (att.incorrectCount ?? '-') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-amber-500">
                          {isSubmitted ? (att.unansweredCount ?? '-') : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-content">
                          {isSubmitted ? `${att.score}/${att.maxScore || maxQuizScore}` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold">
                          {isSubmitted ? (
                            <span className={att.percentage >= 50 ? 'text-emerald-600' : 'text-amber-600'}>
                              {att.percentage}%
                            </span>
                          ) : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-muted">
                          {att.submittedAt ? new Date(att.submittedAt).toLocaleDateString() : 'In Progress'}
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
                          {isSubmitted && (
                            <button
                              onClick={() => handleOpenInspect(att)}
                              className="btn-secondary text-[11px] py-1 px-3 rounded-lg"
                            >
                              Review / Grade
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {attempts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-muted">
                        No student attempts submitted yet for this quiz.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* STUDENT VIEW: Latest Results & Detailed Question Review */}
      {!isTeacher && latestStudentAttempt && latestStudentAttempt.status === 'Submitted' && (
        <div className="space-y-6">
          <div className="card-surface p-6 rounded-2xl border border-border shadow-sm">
            <h3 className="text-base font-bold text-content mb-4 flex items-center gap-2">
              <Award size={18} className="text-emerald-600" />
              Your Performance Summary
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center mb-6">
              <div className="p-3 bg-base rounded-xl border border-border">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Total Marks</span>
                <span className="text-xl font-black text-content">
                  {latestStudentAttempt.score} / {latestStudentAttempt.maxScore || maxQuizScore}
                </span>
              </div>
              <div className="p-3 bg-base rounded-xl border border-border">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Percentage</span>
                <span className="text-xl font-black text-emerald-600">
                  {latestStudentAttempt.percentage}%
                </span>
              </div>
              <div className="p-3 bg-base rounded-xl border border-border">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Correct</span>
                <span className="text-xl font-black text-emerald-600">
                  {latestStudentAttempt.correctCount ?? 0}
                </span>
              </div>
              <div className="p-3 bg-base rounded-xl border border-border">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Incorrect</span>
                <span className="text-xl font-black text-rose-500">
                  {latestStudentAttempt.incorrectCount ?? 0}
                </span>
              </div>
              <div className="p-3 bg-base rounded-xl border border-border">
                <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">Unanswered</span>
                <span className="text-xl font-black text-amber-500">
                  {latestStudentAttempt.unansweredCount ?? 0}
                </span>
              </div>
            </div>

            {/* Question Breakdown */}
            <div className="space-y-4 pt-2">
              <h4 className="text-xs font-bold text-muted uppercase tracking-wider">
                Question Breakdown
              </h4>

              {(latestStudentAttempt.evaluation || []).map((ev, i) => (
                <div
                  key={ev.questionId || i}
                  className={`p-4 rounded-xl border ${
                    ev.isCorrect
                      ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20'
                      : 'border-rose-200 dark:border-rose-900/40 bg-rose-50/20'
                  }`}
                >
                  <div className="flex justify-between items-start gap-3 mb-2">
                    <span className="font-semibold text-xs text-content">
                      {i + 1}. {ev.questionText}
                    </span>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      ev.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}>
                      {ev.marksAwarded} / {ev.maxMarks} pts
                    </span>
                  </div>

                  <div className="text-xs space-y-1 text-content/90 mt-2">
                    <div>
                      <span className="text-muted">Your Answer: </span>
                      <span className="font-semibold">{ev.selectedOptionText || ev.studentAnswer || '(None)'}</span>
                    </div>
                    <div>
                      <span className="text-muted">Correct Answer: </span>
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">{ev.correctAnswerText}</span>
                    </div>
                    {ev.feedback && (
                      <div className="text-[11px] text-muted mt-1 italic">
                        Feedback: {ev.feedback}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
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
                  Submitted {new Date(inspectingAttempt.submittedAt || Date.now()).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setInspectingAttempt(null)}
                className="text-muted hover:text-content text-xs font-semibold p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="p-3 bg-base rounded-xl border border-border flex justify-between text-xs">
                <span>Calculated Marks: <strong>{inspectingAttempt.score} / {inspectingAttempt.maxScore}</strong></span>
                <span>Percentage: <strong>{inspectingAttempt.percentage}%</strong></span>
                <span>Status: <strong>{inspectingAttempt.evaluationStatus}</strong></span>
              </div>

              {/* Questions Review & Manual Mark Override */}
              <div className="space-y-4">
                {(inspectingAttempt.evaluation || []).map((ev, idx) => (
                  <div key={ev.questionId || idx} className="p-4 rounded-xl border border-border bg-surface space-y-2">
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-xs font-bold text-content">
                        {idx + 1}. {ev.questionText}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <label className="text-[10px] text-muted font-bold">Marks:</label>
                        <input
                          type="number"
                          min="0"
                          max={ev.maxMarks}
                          value={adjustingMarks[ev.questionId] ?? ev.marksAwarded}
                          onChange={(e) => setAdjustingMarks({ ...adjustingMarks, [ev.questionId]: e.target.value })}
                          className="input-field w-16 text-center text-xs py-1"
                        />
                        <span className="text-xs text-muted">/ {ev.maxMarks}</span>
                      </div>
                    </div>

                    <div className="text-xs space-y-1">
                      <p><span className="text-muted">Student's Answer:</span> <strong className="text-content">{ev.selectedOptionText || ev.studentAnswer || '(No answer)'}</strong></p>
                      <p><span className="text-muted">Expected Key:</span> <strong className="text-emerald-600">{ev.correctAnswerText}</strong></p>
                      {ev.feedback && <p className="text-[11px] text-muted italic">System Feedback: {ev.feedback}</p>}
                    </div>
                  </div>
                ))}
              </div>

              {/* Teacher Grading Notes */}
              <div>
                <label className="text-xs font-bold text-content block mb-1">Instructor Review Notes</label>
                <textarea
                  value={teacherNotes}
                  onChange={(e) => setTeacherNotes(e.target.value)}
                  placeholder="Optional instructor comments or feedback..."
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
                onClick={handleSaveGrading}
                disabled={isSavingGrade}
                className="btn-primary text-xs py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isSavingGrade ? 'Saving...' : 'Save Grade Adjustments'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizDetails;
