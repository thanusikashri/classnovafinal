import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Award,
  Send,
  HelpCircle,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import api from '../../services/api';

const QuizTake = () => {
  const { id: classId, quizId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [courseName, setCourseName] = useState('');
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Active question index (0 to questions.length - 1)
  const [currentIndex, setCurrentIndex] = useState(0);

  // Answers map: { [questionId]: { selectedOptionIndex: number, textAnswer: string } }
  const [answers, setAnswers] = useState({});

  // Submission & Timer states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Result view state after submission
  const [resultAttempt, setResultAttempt] = useState(null);

  // Load Quiz and Attempt
  const loadQuizAndAttempt = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg('');

      // Fetch class info for course name
      try {
        const clsRes = await api.get(`/classes/${classId}`);
        setCourseName(clsRes.data.data?.name || 'Course');
      } catch (e) {
        // Class lookup fallback
      }

      // Fetch the quiz
      const qRes = await api.get(`/classes/${classId}/quizzes/${quizId}`);
      const fetchedQuiz = qRes.data.data;

      if (!fetchedQuiz) {
        setErrorMsg('Quiz not found.');
        return;
      }

      if (!fetchedQuiz.isPublished && user?.role === 'student') {
        setErrorMsg('This quiz has not been published yet.');
        return;
      }

      setQuiz(fetchedQuiz);

      // Start or resume attempt
      const aRes = await api.post(`/classes/${classId}/quizzes/${quizId}/attempts`);
      const activeAttempt = aRes.data.data;
      setAttempt(activeAttempt);

      // Rehydrate answers if resuming
      const loaded = {};
      if (activeAttempt.answers && Array.isArray(activeAttempt.answers)) {
        activeAttempt.answers.forEach(a => {
          if (a.questionId) {
            loaded[a.questionId] = {
              selectedOptionIndex: a.selectedOptionIndex,
              textAnswer: a.textAnswer || ''
            };
          }
        });
      }
      setAnswers(loaded);

      // If already submitted, show results view directly
      if (activeAttempt.status === 'Submitted') {
        setResultAttempt(activeAttempt);
      }
    } catch (err) {
      console.error('Failed to initialize quiz attempt', err);
      const msg = err.response?.data?.message || 'Error loading quiz. Please ensure you are enrolled and permitted.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [classId, quizId, user]);

  useEffect(() => {
    loadQuizAndAttempt();
  }, [loadQuizAndAttempt]);

  // Countdown timer logic
  useEffect(() => {
    if (!attempt || !quiz || attempt.status === 'Submitted' || resultAttempt) return;

    const timer = setInterval(() => {
      const now = Date.now();
      const startTime = new Date(attempt.startTime).getTime();
      const endTime = startTime + (quiz.durationMinutes || 30) * 60000;
      const left = Math.max(0, Math.floor((endTime - now) / 1000));
      setTimeLeft(left);

      if (left <= 0) {
        clearInterval(timer);
        // Time expired auto-submit
        submitQuiz(true);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, quiz, resultAttempt]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Answer modification handlers
  const handleSelectOption = (questionId, optionIndex) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        selectedOptionIndex: optionIndex
      }
    }));
  };

  const handleTextAnswerChange = (questionId, text) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...(prev[questionId] || {}),
        textAnswer: text
      }
    }));
  };

  const isQuestionAnswered = (q) => {
    if (!q) return false;
    const ans = answers[q._id];
    if (!ans) return false;
    const qType = q.type || 'multiple_choice';
    if (qType === 'multiple_choice' || qType === 'true_false') {
      return ans.selectedOptionIndex !== undefined && ans.selectedOptionIndex !== null && ans.selectedOptionIndex !== -1;
    }
    return ans.textAnswer && ans.textAnswer.trim().length > 0;
  };

  const totalQuestions = quiz?.questions?.length || 0;
  const answeredCount = quiz?.questions?.filter(q => isQuestionAnswered(q)).length || 0;
  const unansweredCount = totalQuestions - answeredCount;

  // Final submission action
  const submitQuiz = async (isAutoSubmit = false) => {
    if (isSubmitting || !attempt) return;
    setIsSubmitting(true);
    setShowConfirmModal(false);

    try {
      const formattedAnswers = (quiz.questions || []).map(q => {
        const userAns = answers[q._id];
        return {
          questionId: q._id,
          selectedOptionIndex: userAns?.selectedOptionIndex !== undefined ? userAns.selectedOptionIndex : -1,
          textAnswer: userAns?.textAnswer || ''
        };
      });

      const res = await api.put(`/classes/${classId}/quizzes/${quizId}/attempts/${attempt._id}`, {
        answers: formattedAnswers
      });

      const updatedAttempt = res.data.data;
      setResultAttempt(updatedAttempt);
      setAttempt(updatedAttempt);
    } catch (err) {
      console.error('Quiz submission error:', err);
      alert(err.response?.data?.message || 'Error submitting quiz. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LOADING & ERROR STATES ---
  if (loading) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mb-4"></div>
        <h2 className="text-lg font-semibold text-content">Loading assessment...</h2>
        <p className="text-xs text-muted mt-1">Preparing quiz questions and attempt session</p>
      </div>
    );
  }

  if (errorMsg || !quiz) {
    return (
      <div className="min-h-screen bg-base flex flex-col items-center justify-center p-6 text-center">
        <div className="p-3 bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 rounded-2xl mb-4">
          <AlertCircle size={32} />
        </div>
        <h2 className="text-xl font-bold text-content mb-2">Quiz Unavailable</h2>
        <p className="text-sm text-muted max-w-md mb-6">{errorMsg || 'Unable to access the quiz at this time.'}</p>
        <button
          onClick={() => navigate(`/classes/${classId}`)}
          className="btn-primary text-sm flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          <span>Return to Class</span>
        </button>
      </div>
    );
  }

  // --- SUBMITTED / RESULTS VIEW ---
  if (resultAttempt) {
    const isPassing = (resultAttempt.percentage || 0) >= 50;
    return (
      <div className="min-h-screen bg-base pb-20 font-sans pt-6 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header Back Button */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(`/classes/${classId}`)}
              className="flex items-center gap-2 text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            >
              <ArrowLeft size={16} />
              <span>Back to Course ({courseName})</span>
            </button>
            <span className="text-xs text-muted">
              Submitted: {new Date(resultAttempt.submittedAt || Date.now()).toLocaleString()}
            </span>
          </div>

          {/* Result Banner Card */}
          <div className="card-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm text-center relative overflow-hidden">
            <div className={`inline-flex p-3 rounded-2xl mb-3 ${isPassing ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'}`}>
              <Award size={36} />
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-content mb-1">
              Quiz Completed!
            </h1>
            <p className="text-sm text-muted mb-6">
              {quiz.title} • {courseName}
            </p>

            {/* Performance Metric Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
              <div className="p-4 rounded-xl bg-base border border-border">
                <span className="text-xs text-muted font-medium uppercase tracking-wider block mb-1">Score</span>
                <span className="text-2xl font-black text-content">
                  {resultAttempt.score} <span className="text-xs text-muted font-normal">/ {resultAttempt.maxScore || quiz.totalMarks}</span>
                </span>
              </div>

              <div className="p-4 rounded-xl bg-base border border-border">
                <span className="text-xs text-muted font-medium uppercase tracking-wider block mb-1">Percentage</span>
                <span className={`text-2xl font-black ${isPassing ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                  {resultAttempt.percentage}%
                </span>
              </div>

              <div className="p-4 rounded-xl bg-base border border-border">
                <span className="text-xs text-muted font-medium uppercase tracking-wider block mb-1">Correct</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {resultAttempt.correctCount ?? 0}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-base border border-border">
                <span className="text-xs text-muted font-medium uppercase tracking-wider block mb-1">Status</span>
                <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
                  {resultAttempt.evaluationStatus || 'Evaluated'}
                </span>
              </div>
            </div>

            {resultAttempt.unansweredCount > 0 && (
              <p className="text-xs text-muted mt-4">
                Note: {resultAttempt.unansweredCount} question(s) were left unanswered.
              </p>
            )}
          </div>

          {/* Question-by-Question Detailed Feedback */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-content flex items-center gap-2">
              <Sparkles size={18} className="text-primary-600" />
              Question Feedback and Evaluation
            </h2>

            {resultAttempt.evaluation && resultAttempt.evaluation.length > 0 ? (
              resultAttempt.evaluation.map((evalItem, idx) => {
                const isCorrect = evalItem.isCorrect;
                return (
                  <div
                    key={evalItem.questionId || idx}
                    className={`card-surface p-5 sm:p-6 rounded-2xl border transition-all ${
                      isCorrect
                        ? 'border-emerald-200 dark:border-emerald-900/50'
                        : evalItem.marksAwarded === 0 && (!evalItem.studentAnswer && evalItem.studentAnswer !== 0)
                        ? 'border-border'
                        : 'border-rose-200 dark:border-rose-900/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCorrect
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-muted uppercase tracking-wider">
                          {evalItem.questionType === 'short_answer' ? 'Short Answer' : 'Multiple Choice'}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          isCorrect
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                        }`}>
                          {evalItem.marksAwarded} / {evalItem.maxMarks} pts
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-semibold text-content mb-3">
                      {evalItem.questionText}
                    </h3>

                    {/* Answers Comparison */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 text-xs">
                      <div className="p-3 rounded-xl bg-base border border-border">
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">
                          Your Answer
                        </span>
                        <span className={`font-semibold ${isCorrect ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'}`}>
                          {evalItem.selectedOptionText || evalItem.studentAnswer || '(No answer provided)'}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-base border border-border">
                        <span className="text-[10px] text-muted uppercase font-bold tracking-wider block mb-1">
                          Correct Answer
                        </span>
                        <span className="font-semibold text-content">
                          {evalItem.correctAnswerText || 'See instructor rubric'}
                        </span>
                      </div>
                    </div>

                    {/* Evaluation Explanation */}
                    {evalItem.feedback && (
                      <div className="p-3 rounded-xl bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/40 text-xs text-content flex items-start gap-2">
                        <HelpCircle size={14} className="text-primary-600 shrink-0 mt-0.5" />
                        <span>{evalItem.feedback}</span>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="card-surface p-6 rounded-2xl text-center text-muted text-sm">
                Answers recorded. Detailed question feedback will be available once instructor finalizes grading.
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex justify-center">
            <button
              onClick={() => navigate(`/classes/${classId}`)}
              className="btn-primary text-sm px-6 py-2.5 rounded-xl shadow-sm"
            >
              Return to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- ACTIVE QUIZ TAKING INTERFACE (Wayground/Quizizz inspired) ---
  const currentQ = quiz.questions[currentIndex];
  const qType = currentQ?.type || 'multiple_choice';
  const currentAnswer = answers[currentQ?._id] || {};

  return (
    <div className="min-h-screen bg-base font-sans pb-28 transition-colors duration-300">
      {/* Wayground / Quizizz Top Sticky Control Bar */}
      <header className="sticky top-0 z-40 bg-surface border-b border-border shadow-sm px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Course & Quiz Info */}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-primary-50 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300 border border-primary-200 dark:border-primary-800 shrink-0">
                {courseName}
              </span>
              <span className="text-xs text-muted hidden sm:inline">•</span>
              <span className="text-xs text-muted font-medium hidden sm:inline">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
            </div>
            <h1 className="text-sm sm:text-base font-bold text-content truncate mt-0.5">
              {quiz.title}
            </h1>
          </div>

          {/* Right: Timer and Quick Submit */}
          <div className="flex items-center gap-3 shrink-0">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm font-bold border transition-colors ${
              timeLeft !== null && timeLeft < 120
                ? 'bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/40 dark:border-rose-800 animate-pulse'
                : 'bg-base text-content border-border'
            }`}>
              <Clock size={16} />
              <span>{formatTime(timeLeft)}</span>
            </div>

            <button
              onClick={() => setShowConfirmModal(true)}
              className="btn-primary text-xs sm:text-sm py-1.5 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              <Send size={15} />
              <span>Submit</span>
            </button>
          </div>
        </div>

        {/* Linear Progress Bar */}
        <div className="max-w-6xl mx-auto mt-2">
          <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-primary-600 h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0}%` }}
            ></div>
          </div>
        </div>
      </header>

      {/* Question Bubbles Navigator (Pill Selector) */}
      <div className="max-w-4xl mx-auto px-4 pt-6">
        <div className="flex items-center justify-between mb-3 text-xs font-semibold text-muted">
          <span>QUESTION NAVIGATION</span>
          <span>{answeredCount} / {totalQuestions} Answered</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {quiz.questions.map((q, idx) => {
            const isCurrent = idx === currentIndex;
            const isAnswered = isQuestionAnswered(q);

            return (
              <button
                key={q._id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  isCurrent
                    ? 'bg-primary-600 text-white ring-2 ring-primary-500 ring-offset-2 ring-offset-surface shadow-md'
                    : isAnswered
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-950/60 dark:text-primary-300 border border-primary-300 dark:border-primary-800'
                    : 'bg-surface text-muted hover:text-content hover:bg-base border border-border'
                }`}
                title={`Question ${idx + 1}: ${isAnswered ? 'Answered' : 'Unanswered'}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Question Canvas */}
      <main className="max-w-4xl mx-auto px-4 pt-4">
        {currentQ && (
          <div className="card-surface p-6 sm:p-8 rounded-2xl border border-border shadow-sm">
            {/* Question Header Meta */}
            <div className="flex items-center justify-between gap-3 mb-4 border-b border-border pb-4">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <span className="text-xs text-muted">
                  {qType === 'short_answer' ? 'Short Answer' : 'Multiple Choice'}
                </span>
              </div>
              <span className="text-xs font-bold text-content bg-base px-3 py-1 rounded-full border border-border">
                {currentQ.marks || 1} {currentQ.marks === 1 ? 'Point' : 'Points'}
              </span>
            </div>

            {/* Question Text */}
            <h2 className="text-base sm:text-lg font-semibold text-content leading-relaxed mb-6">
              {currentQ.text}
            </h2>

            {/* Multiple Choice Options List */}
            {(qType === 'multiple_choice' || qType === 'true_false') && (
              <div className="grid grid-cols-1 gap-3">
                {currentQ.options?.map((opt, optIdx) => {
                  const isSelected = currentAnswer.selectedOptionIndex === optIdx;
                  const letter = String.fromCharCode(65 + optIdx); // A, B, C, D...

                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(currentQ._id, optIdx)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all flex items-center gap-4 ${
                        isSelected
                          ? 'border-primary-600 bg-primary-50/70 dark:bg-primary-950/40 text-primary-900 dark:text-primary-100 shadow-sm'
                          : 'border-border bg-base/50 hover:bg-base hover:border-border text-content'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-primary-600 text-white'
                          : 'bg-surface text-muted border border-border'
                      }`}>
                        {letter}
                      </div>

                      <span className="text-sm font-medium flex-1">
                        {opt}
                      </span>

                      {isSelected && (
                        <CheckCircle2 size={20} className="text-primary-600 shrink-0" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Short Answer Text Area */}
            {qType === 'short_answer' && (
              <div className="space-y-3">
                <textarea
                  value={currentAnswer.textAnswer || ''}
                  onChange={(e) => handleTextAnswerChange(currentQ._id, e.target.value)}
                  placeholder="Type your answer concisely here..."
                  rows={5}
                  className="input-field w-full text-sm leading-relaxed p-4"
                ></textarea>
                <div className="flex justify-between items-center text-xs text-muted">
                  <span>Semantic evaluation will grade key concepts against rubric.</span>
                  <span>{(currentAnswer.textAnswer || '').trim().split(/\s+/).filter(Boolean).length} words</span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom Sticky Navigation Dock */}
      <footer className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 z-40 shadow-lg">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="btn-secondary text-xs sm:text-sm py-2 px-4 rounded-xl flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
            <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="text-xs text-muted font-medium text-center">
            Question <span className="text-content font-bold">{currentIndex + 1}</span> of {totalQuestions}
          </div>

          <div className="flex items-center gap-2">
            {currentIndex < totalQuestions - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => Math.min(totalQuestions - 1, prev + 1))}
                className="btn-primary text-xs sm:text-sm py-2 px-4 rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => setShowConfirmModal(true)}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm py-2 px-5 rounded-xl flex items-center gap-1.5 shadow-sm"
              >
                <Check size={16} />
                <span>Review & Submit</span>
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Submission Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-md rounded-2xl border border-border shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-xl ${unansweredCount > 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-primary-100 text-primary-700 dark:bg-primary-950/60 dark:text-primary-300'}`}>
                  {unansweredCount > 0 ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
                </div>
                <div>
                  <h3 className="text-base font-bold text-content">Submit Quiz?</h3>
                  <p className="text-xs text-muted">Confirm submission of your assessment</p>
                </div>
              </div>

              {/* Progress Summary */}
              <div className="p-4 rounded-xl bg-base border border-border space-y-2 mb-4 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-muted">Total Questions:</span>
                  <span className="font-bold text-content">{totalQuestions}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Answered:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{answeredCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted">Unanswered:</span>
                  <span className={`font-bold ${unansweredCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-content'}`}>
                    {unansweredCount}
                  </span>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-800 dark:text-amber-300 mb-4">
                  Warning: You have <strong>{unansweredCount} unanswered questions</strong>. Once submitted, answers cannot be edited.
                </div>
              )}

              <p className="text-xs text-muted mb-6">
                Are you ready to submit? Your responses will be evaluated and recorded immediately.
              </p>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="btn-secondary text-xs py-2 px-4 rounded-xl"
                >
                  Keep Answering
                </button>
                <button
                  type="button"
                  onClick={() => submitQuiz(false)}
                  disabled={isSubmitting}
                  className="btn-primary text-xs py-2 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2"
                >
                  {isSubmitting ? 'Evaluating...' : 'Confirm Submit'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizTake;
