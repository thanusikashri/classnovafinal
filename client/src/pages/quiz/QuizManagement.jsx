import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ClipboardList, Plus, Trash2, Edit3, Users, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

const QuizManagement = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchClassesAndQuizzes = useCallback(async () => {
    try {
      const clsRes = await api.get('/classes');
      const classList = clsRes.data.data || [];
      setClasses(classList);

      if (classList.length > 0) {
        const activeCId = selectedClass || classList[0]._id;
        setSelectedClass(activeCId);
        const qRes = await api.get(`/classes/${activeCId}/quizzes`);
        setQuizzes(qRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load quiz management data', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchClassesAndQuizzes();
  }, [fetchClassesAndQuizzes]);

  const handleClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setLoading(true);
    try {
      const qRes = await api.get(`/classes/${classId}/quizzes`);
      setQuizzes(qRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Are you sure you want to delete this quiz? All attempts will be removed.')) return;
    try {
      await api.delete(`/classes/${selectedClass}/quizzes/${quizId}`);
      setQuizzes(prev => prev.filter(q => q._id !== quizId));
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting quiz');
    }
  };

  const handleTogglePublish = async (quiz) => {
    try {
      const updated = await api.put(`/classes/${selectedClass}/quizzes/${quiz._id}`, {
        isPublished: !quiz.isPublished
      });
      setQuizzes(prev => prev.map(q => q._id === quiz._id ? { ...q, isPublished: !quiz.isPublished } : q));
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating publish status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Quiz Management</h1>
          <p className="text-sm text-muted mt-1">
            Oversee existing class quizzes, toggle visibility, and inspect student score analytics
          </p>
        </div>

        {selectedClass && (
          <Link
            to={`/classes/${selectedClass}/quizzes/create`}
            className="btn-primary text-sm flex items-center gap-2 shadow-sm self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Create New Quiz</span>
          </Link>
        )}
      </div>

      {/* Class Selector */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-semibold text-content">Select Course:</label>
        <select
          value={selectedClass}
          onChange={handleClassChange}
          className="input-field text-sm max-w-md"
        >
          {classes.map(c => (
            <option key={c._id} value={c._id}>
              {c.name} ({c.classCode || c.code})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading quizzes...</div>
      ) : quizzes.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl">
          <ClipboardList size={48} className="mx-auto text-muted mb-3 opacity-50" />
          <h3 className="text-lg font-medium text-content mb-1">No quizzes in this class</h3>
          <p className="text-sm text-muted mb-6">
            Get started by creating your first quiz or generating one with the Quiz Generator.
          </p>
          {selectedClass && (
            <Link to={`/classes/${selectedClass}/quizzes/create`} className="btn-primary text-sm">
              Create Quiz
            </Link>
          )}
        </div>
      ) : (
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="divide-y divide-border">
            {quizzes.map(quiz => (
              <div key={quiz._id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-base/40 transition-colors">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-base font-bold text-content">{quiz.title}</h3>
                    <button
                      onClick={() => handleTogglePublish(quiz)}
                      className={`badge-status cursor-pointer transition-colors ${
                        quiz.isPublished
                          ? 'badge-status-available'
                          : 'badge-status-draft'
                      }`}
                    >
                      {quiz.isPublished ? 'Published' : 'Draft (Click to Publish)'}
                    </button>
                  </div>
                  <p className="text-xs text-muted mb-2 line-clamp-1">{quiz.description || 'No description provided'}</p>
                  <div className="flex items-center gap-4 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <Clock size={13} />
                      {quiz.durationMinutes} Minutes
                    </span>
                    <span>•</span>
                    <span>{quiz.questions ? quiz.questions.length : 0} Questions</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start md:self-auto">
                  <Link
                    to={`/classes/${selectedClass}/quizzes/${quiz._id}`}
                    className="p-2 rounded-lg border border-border text-muted hover:text-content hover:bg-base transition-colors flex items-center gap-1.5 text-xs font-medium"
                    title="View Analytics"
                  >
                    <BarChart3 size={15} />
                    <span>Analytics</span>
                  </Link>

                  <Link
                    to={`/classes/${selectedClass}/quizzes/${quiz._id}/edit`}
                    className="p-2 rounded-lg border border-border text-muted hover:text-primary-600 hover:bg-base transition-colors flex items-center gap-1.5 text-xs font-medium"
                    title="Edit Quiz"
                  >
                    <Edit3 size={15} />
                    <span>Edit</span>
                  </Link>

                  <button
                    onClick={() => handleDeleteQuiz(quiz._id)}
                    className="p-2 rounded-lg border border-border text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1.5 text-xs font-medium"
                    title="Delete Quiz"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default QuizManagement;
