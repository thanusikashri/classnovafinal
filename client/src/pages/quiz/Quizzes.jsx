import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { HelpCircle, Clock, CheckCircle2, ArrowRight, Play, Award, FileQuestion } from 'lucide-react';
import api from '../../services/api';

const Quizzes = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [allQuizzes, setAllQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchQuizzes = useCallback(async () => {
    try {
      const clsRes = await api.get('/classes');
      const classList = clsRes.data.data || [];
      setClasses(classList);

      const quizPromises = classList.map(async (c) => {
        try {
          const qRes = await api.get(`/classes/${c._id}/quizzes`);
          const list = qRes.data.data || [];
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
            Complete your course quizzes, review time limits, and check completed attempts
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading course quizzes...</div>
      ) : allQuizzes.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl">
          <FileQuestion size={48} className="mx-auto text-muted mb-3 opacity-50" />
          <h3 className="text-lg font-medium text-content mb-1">No quizzes available</h3>
          <p className="text-sm text-muted">
            Your instructors have not published any quizzes for your classes yet. Check back soon!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allQuizzes.map(quiz => {
            const classTitle = quiz.classInfo?.name || 'Enrolled Course';
            const totalQuestions = quiz.questions ? quiz.questions.length : 'Multiple';

            return (
              <div key={quiz._id} className="card-surface rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted mb-2">
                    <span className="font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-0.5 rounded-full">
                      {quiz.classInfo?.classCode || quiz.classInfo?.code || 'CS'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {quiz.durationMinutes} Mins
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-content tracking-tight line-clamp-1 mb-1">{quiz.title}</h3>
                  <p className="text-xs text-muted mb-3">{classTitle}</p>
                  <p className="text-sm text-muted line-clamp-2 mb-4">
                    {quiz.description || 'Timed multiple choice assessment.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <div className="text-xs text-muted">
                    <span>{totalQuestions} Questions</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/classes/${quiz.classInfo?._id}/quizzes/${quiz._id}`}
                      className="text-xs text-muted hover:text-content font-medium px-2.5 py-1.5 rounded-lg hover:bg-base"
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
