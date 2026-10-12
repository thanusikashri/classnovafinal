import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const QuizTake = () => {
  const { id: classId, quizId } = useParams();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState(null);
  const [attempt, setAttempt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);

  const [answers, setAnswers] = useState({}); // questionId -> optionIndex

  const startOrResumeAttempt = useCallback(async () => {
    try {
      // First fetch the quiz details
      const qRes = await api.get(`/classes/${classId}/quizzes/${quizId}`);
      setQuiz(qRes.data.data);

      // Start or resume attempt
      const aRes = await api.post(`/classes/${classId}/quizzes/${quizId}/attempts`);
      const att = aRes.data.data;
      setAttempt(att);
      
      // Load existing answers if resuming
      const loadedAnswers = {};
      if (att.answers) {
        att.answers.forEach(a => {
          loadedAnswers[a.questionId] = a.selectedOptionIndex;
        });
      }
      setAnswers(loadedAnswers);

      if (att.status === 'Submitted') {
        navigate(`/classes/${classId}/quizzes/${quizId}`);
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error loading quiz');
      navigate(`/classes/${classId}`);
    } finally {
      setLoading(false);
    }
  }, [classId, quizId, navigate]);

  useEffect(() => {
    startOrResumeAttempt();
  }, [startOrResumeAttempt]);

  useEffect(() => {
    if (!attempt || !quiz || attempt.status === 'Submitted') return;

    const timer = setInterval(() => {
      const now = Date.now();
      const end = new Date(attempt.startTime).getTime() + quiz.durationMinutes * 60000;
      const left = Math.max(0, Math.floor((end - now) / 1000));
      setTimeLeft(left);

      if (left <= 0) {
        clearInterval(timer);
        handleSubmit(); // auto submit
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [attempt, quiz]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);

    const formattedAnswers = Object.entries(answers).map(([questionId, selectedOptionIndex]) => ({
      questionId,
      selectedOptionIndex
    }));

    try {
      await api.put(`/classes/${classId}/quizzes/${quizId}/attempts/${attempt._id}`, { answers: formattedAnswers });
      navigate(`/classes/${classId}/quizzes/${quizId}`);
    } catch (err) {
      console.error(err);
      alert('Error submitting quiz');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectOption = (questionId, optionIndex) => {
    setAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  if (loading || !quiz || !attempt) return <div className="flex justify-center py-20 text-muted">Loading...</div>;

  const formatTime = (seconds) => {
    if (seconds === null) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-base font-sans pb-24 transition-colors duration-300">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-surface border-b border-border shadow-sm px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-medium text-content truncate pr-4">{quiz.title}</h1>
        <div className={`flex items-center gap-2 font-mono text-lg font-bold ${timeLeft < 60 ? 'text-red-500' : 'text-content'}`}>
          <Clock size={20} />
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="max-w-3xl mx-auto pt-8 px-4 space-y-8">
        {quiz.questions.map((q, qIndex) => (
          <div key={q._id} className="card-surface p-6 sm:p-8">
            <div className="flex justify-between items-start mb-6 gap-4">
              <h3 className="text-lg font-medium text-content">
                <span className="text-muted mr-2">{qIndex + 1}.</span>
                {q.text}
              </h3>
              <span className="text-sm font-medium text-muted whitespace-nowrap bg-base px-3 py-1 rounded-full border border-border">{q.marks} pts</span>
            </div>

            <div className="space-y-3">
              {q.options.map((opt, oIndex) => {
                const isSelected = answers[q._id] === oIndex;
                return (
                  <label 
                    key={oIndex} 
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                      isSelected ? 'border-secondary-500 bg-secondary-50 dark:bg-secondary-900/20' : 'border-border hover:bg-surface'
                    }`}
                  >
                    <input 
                      type="radio" 
                      name={`question-${q._id}`} 
                      value={oIndex} 
                      checked={isSelected} 
                      onChange={() => handleSelectOption(q._id, oIndex)} 
                      className="sr-only" 
                    />
                    <div className="pt-0.5">
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-secondary-600 bg-secondary-600 dark:border-secondary-500 dark:bg-secondary-500' : 'border-muted'}`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-base"></div>}
                      </div>
                    </div>
                    <span className={`text-base ${isSelected ? 'text-secondary-900 dark:text-secondary-300 font-medium' : 'text-content'}`}>{opt}</span>
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-surface border-t border-border p-4 flex justify-between items-center z-50">
        <div className="text-sm text-muted font-medium">
          Answered: {Object.keys(answers).length} / {quiz.questions.length}
        </div>
        <button 
          onClick={() => {
            if (window.confirm('Are you sure you want to submit your quiz? You cannot change answers after submission.')) {
              handleSubmit();
            }
          }}
          disabled={isSubmitting}
          className="flex items-center gap-2 bg-secondary-600 text-white px-8 py-3 rounded-md font-medium hover:bg-secondary-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          <CheckCircle size={20} />
          {isSubmitting ? 'Submitting...' : 'Submit Quiz'}
        </button>
      </div>
    </div>
  );
};

export default QuizTake;
