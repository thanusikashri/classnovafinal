import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { HelpCircle, Clock, CheckCircle2, ArrowRight, Play, Award, FileQuestion, RefreshCw, Calendar } from 'lucide-react';
import api from '../../services/api';

const Quizzes = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchQuizzes = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      // 1. Fetch courses the student is enrolled in
      const clsRes = await api.get('/classes');
      const classList = clsRes.data.data || [];
      setClasses(classList);

      // 2. Fetch published quizzes for each enrolled class
      const quizPromises = classList.map(async (c) => {
        try {
          const qRes = await api.get(`/classes/${c._id}/quizzes`);
          const list = qRes.data.data || [];
          // Students only receive published quizzes from the backend
          return list.map(q => ({ ...q, classInfo: c }));
        } catch (e) {
          return [];
        }
      });

      const results = await Promise.all(quizPromises);
      setAllQuizzes(results.flat());
    } catch (err) {
      console.error('Failed to load quizzes', err);
    } finally {
      setLoading(false);
      if (isManualRefresh) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchQuizzes();
  }, [fetchQuizzes]);

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Available Quizzes & Assessments</h1>
          <p className="text-sm text-muted mt-1">
            Complete your enrolled course quizzes, review time limits, and check completed attempts
          </p>
        </div>

        <button
          onClick={() => fetchQuizzes(true)}
          disabled={loading || refreshing}
          className="btn-secondary text-xs flex items-center gap-2 self-start sm:self-auto"
          title="Refresh quiz list"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Quizzes'}</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading course quizzes...</div>
      ) : allQuizzes.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl">
          <FileQuestion size={48} className="mx-auto text-muted mb-3 opacity-50" />
          <h3 className="text-lg font-medium text-content mb-1">No quizzes available</h3>
          <p className="text-sm text-muted max-w-md mx-auto">
            Your instructors have not published any quizzes for your classes yet. Check back soon or refresh once published!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allQuizzes.map(quiz => {
            const classTitle = quiz.classInfo?.name || 'Enrolled Course';
            const totalQuestions = quiz.questions ? quiz.questions.length : 'Multiple';
            const isClosed = quiz.endTime && new Date(quiz.endTime) < new Date();

            return (
              <div key={quiz._id} className="card-surface rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between text-xs mb-3">
                    <span className="badge-course-code">
                      {quiz.classInfo?.classCode || quiz.classInfo?.code || 'CS'}
                    </span>
                    <span className="flex items-center gap-1.5 font-medium text-[#4B5563] dark:text-slate-300 text-xs">
                      <Clock size={13} className="text-[#374151] dark:text-slate-400" />
                      {quiz.durationMinutes} Mins
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-[#111827] dark:text-slate-100 tracking-tight line-clamp-1 mb-1">
                    {quiz.title}
                  </h3>
                  <p className="text-xs text-[#374151] dark:text-slate-400 font-semibold mb-3">
                    {classTitle}
                  </p>

                  {/* Availability Status & Deadline */}
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <span className={`badge-status ${isClosed ? 'badge-status-closed' : 'badge-status-available'}`}>
                      {isClosed ? 'Closed' : 'Available'}
                    </span>

                    {quiz.endTime ? (
                      <span className="flex items-center gap-1 text-[11px] text-[#4B5563] dark:text-slate-400 font-medium">
                        <Calendar size={12} className="text-[#374151] dark:text-slate-400" />
                        Due: {new Date(quiz.endTime).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#4B5563] dark:text-slate-400 font-medium">
                        No deadline set
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-[#1F2937] dark:text-slate-300 line-clamp-2 mb-4 leading-relaxed">
                    {quiz.description || 'Timed multiple choice assessment.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#E5E7EB] dark:border-slate-700 flex items-center justify-between">
                  <div className="text-xs text-[#374151] dark:text-slate-400 font-medium">
                    <span>{totalQuestions} {totalQuestions === 1 ? 'Question' : 'Questions'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/classes/${quiz.classInfo?._id}/quizzes/${quiz._id}`}
                      className="link-details"
                    >
                      Details
                    </Link>
                    <Link
                      to={`/classes/${quiz.classInfo?._id}/quizzes/${quiz._id}/take`}
                      className="btn-primary text-xs flex items-center gap-1.5 shadow-xs py-1.5 px-3.5"
                    >
                      <Play size={13} />
                      <span>Take Quiz</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Quizzes;
