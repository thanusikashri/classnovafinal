import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Clock, CheckCircle, XCircle, Award } from 'lucide-react';
import api from '../../services/api';

const QuizDetails = () => {
  const { id: classId, quizId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [attempts, setAttempts] = useState([]); // for teacher
  const [myAttempts, setMyAttempts] = useState([]); // for student
  const [loading, setLoading] = useState(true);

  const fetchQuiz = useCallback(async () => {
    try {
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
      setAttempts(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [classId, quizId]);

  const fetchMyAttempts = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${classId}/quizzes/${quizId}/attempts/me`);
      setMyAttempts(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [classId, quizId]);

  useEffect(() => {
    const init = async () => {
      await fetchQuiz();
      setLoading(false);
    };
    init();
  }, [fetchQuiz]);

  useEffect(() => {
    if (quiz) {
      const isTeacher = user.role === 'admin' || quiz.teacher === user._id;
      if (isTeacher) {
        fetchAnalytics();
      } else {
        fetchMyAttempts();
      }
    }
  }, [quiz, user, fetchAnalytics, fetchMyAttempts]);

  if (loading || !quiz) return <div className="flex justify-center py-20 text-muted">Loading...</div>;

  const isTeacher = user.role === 'admin' || quiz.teacher === user._id;
  
  // Calculate analytics
  const submittedAttempts = attempts.filter(a => a.status === 'Submitted');
  const avgScore = submittedAttempts.length > 0 
    ? (submittedAttempts.reduce((sum, a) => sum + a.score, 0) / submittedAttempts.length).toFixed(1) 
    : 0;

  return (
    <div className="max-w-5xl mx-auto pb-12 font-sans pt-4">
      <button 
        onClick={() => navigate(`/classes/${classId}`)}
        className="flex items-center gap-2 text-primary-700 hover:text-primary-800 font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Class</span>
      </button>

      <div className="card-surface p-6 sm:p-8 mb-8">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl sm:text-3xl font-medium text-content">{quiz.title}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${quiz.isPublished ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400'}`}>
            {quiz.isPublished ? 'Published' : 'Draft'}
          </span>
        </div>
        
        <p className="text-muted mb-6">{quiz.description}</p>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-surface p-4 rounded-md border border-border">
          <div>
            <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Duration</div>
            <div className="font-medium text-content">{quiz.durationMinutes} minutes</div>
          </div>
          <div>
            <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Total Points</div>
            <div className="font-medium text-content">{quiz.totalMarks || quiz.questions?.reduce((t,q)=>t+q.marks,0)} pts</div>
          </div>
          <div>
            <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">Start Time</div>
            <div className="font-medium text-content">{quiz.startTime ? new Date(quiz.startTime).toLocaleString() : 'Anytime'}</div>
          </div>
          <div>
            <div className="text-xs text-muted font-medium uppercase tracking-wider mb-1">End Time</div>
            <div className="font-medium text-content">{quiz.endTime ? new Date(quiz.endTime).toLocaleString() : 'No limit'}</div>
          </div>
        </div>

        {!isTeacher && myAttempts.length === 0 && (
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => navigate(`/classes/${classId}/quizzes/${quiz._id}/take`)}
              className="bg-secondary-600 text-white px-8 py-3 rounded-full font-medium hover:bg-secondary-700 transition-colors shadow-md text-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
            >
              Start Quiz
            </button>
          </div>
        )}
      </div>

      {isTeacher && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="card-surface p-6 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-content mb-2">{submittedAttempts.length}</div>
              <div className="text-sm text-muted font-medium uppercase tracking-wider">Submissions</div>
            </div>
            <div className="card-surface p-6 flex flex-col items-center justify-center">
              <div className="text-4xl font-bold text-secondary-600 dark:text-secondary-400 mb-2">{avgScore}</div>
              <div className="text-sm text-muted font-medium uppercase tracking-wider">Average Score</div>
            </div>
            <div className="card-surface p-6 flex items-center justify-center gap-4">
               <button onClick={() => navigate(`/classes/${classId}/quizzes/${quiz._id}/edit`)} className="btn-secondary w-full max-w-[200px]">
                 Edit Quiz
               </button>
            </div>
          </div>

          <div className="card-surface overflow-hidden">
            <div className="px-6 py-4 border-b border-border bg-base">
              <h3 className="text-lg font-medium text-content">Student Results</h3>
            </div>
            <div className="divide-y divide-border">
              {attempts.map(att => (
                <div key={att._id} className="p-6 flex items-center justify-between hover:bg-surface">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-400 font-medium">
                      {att.student?.name ? att.student.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <div className="font-medium text-content">{att.student?.name || 'Unknown Student'}</div>
                      <div className="text-sm text-muted">Submitted: {att.submittedAt ? new Date(att.submittedAt).toLocaleString() : 'In Progress'}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {att.status === 'Submitted' ? (
                      <div className="flex items-center gap-2 text-xl font-bold text-content">
                        {att.score} <span className="text-sm text-muted font-normal">/ {quiz.totalMarks}</span>
                      </div>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400 rounded-full text-xs font-medium uppercase tracking-wider">In Progress</span>
                    )}
                  </div>
                </div>
              ))}
              {attempts.length === 0 && (
                <div className="p-8 text-center text-muted">No attempts yet.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {!isTeacher && myAttempts.length > 0 && (
        <div className="card-surface overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-base">
            <h3 className="text-lg font-medium text-content">Your Results</h3>
          </div>
          <div className="divide-y divide-border">
            {myAttempts.map((att, idx) => (
              <div key={att._id} className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <span className="text-sm font-medium text-muted uppercase tracking-wider">Attempt {myAttempts.length - idx}</span>
                    <div className="text-sm text-muted mt-1">{new Date(att.startTime).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    {att.status === 'Submitted' ? (
                      <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-400 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800/50">
                        <Award size={24} className="text-green-600 dark:text-green-500" />
                        <span className="text-2xl font-bold">{att.score}</span>
                        <span className="text-sm font-medium">/ {quiz.totalMarks}</span>
                      </div>
                    ) : (
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400 rounded-full text-sm font-medium">In Progress</span>
                    )}
                  </div>
                </div>
                
                {att.status === 'In Progress' && (
                  <button 
                    onClick={() => navigate(`/classes/${classId}/quizzes/${quiz._id}/take`)}
                    className="w-full bg-secondary-600 text-white px-4 py-2 rounded-md font-medium hover:bg-secondary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500"
                  >
                    Resume Quiz
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizDetails;
