import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { ClipboardList, ArrowLeft, CheckCircle, FileText } from 'lucide-react';
import api from '../../services/api';

const AssignmentDetails = () => {
  const { id: classId, assignmentId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [assignment, setAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [mySubmission, setMySubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [gradingSubmission, setGradingSubmission] = useState(null);
  const [marks, setMarks] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isGrading, setIsGrading] = useState(false);

  const fetchAssignment = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${classId}/assignments/${assignmentId}`);
      setAssignment(res.data.data);
    } catch (err) {
      console.error(err);
      navigate(`/classes/${classId}`);
    }
  }, [classId, assignmentId, navigate]);

  const fetchSubmissions = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${classId}/assignments/${assignmentId}/submissions`);
      setSubmissions(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [classId, assignmentId]);

  const fetchMySubmission = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${classId}/assignments/${assignmentId}/submissions/me`);
      setMySubmission(res.data.data);
      if (res.data.data) {
        setContent(res.data.data.content);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(err);
      }
    }
  }, [classId, assignmentId]);

  useEffect(() => {
    const init = async () => {
      await fetchAssignment();
      setLoading(false);
    };
    init();
  }, [fetchAssignment]);

  useEffect(() => {
    if (assignment) {
      const isTeacher = user.role === 'admin' || assignment.teacher._id === user._id;
      if (isTeacher) {
        fetchSubmissions();
      } else {
        fetchMySubmission();
      }
    }
  }, [assignment, user, fetchSubmissions, fetchMySubmission]);

  const handleSubmitWork = async (e) => {
    e.preventDefault();
    if (!content.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/classes/${classId}/assignments/${assignmentId}/submissions`, { content });
      await fetchMySubmission();
    } catch (err) {
      console.error(err);
      alert('Error submitting work');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGrade = async (e) => {
    e.preventDefault();
    setIsGrading(true);
    try {
      await api.put(`/classes/${classId}/assignments/${assignmentId}/submissions/${gradingSubmission._id}/grade`, {
        marks: Number(marks),
        feedback
      });
      setGradingSubmission(null);
      fetchSubmissions();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || 'Error grading submission');
    } finally {
      setIsGrading(false);
    }
  };

  if (loading || !assignment) {
    return <div className="flex justify-center py-20 text-muted">Loading...</div>;
  }

  const isTeacher = user.role === 'admin' || assignment.teacher._id === user._id;

  return (
    <div className="max-w-5xl mx-auto pb-12 font-sans pt-4">
      <button 
        onClick={() => navigate(`/classes/${classId}`)}
        className="flex items-center gap-2 text-primary-700 hover:text-primary-800 font-medium mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>Back to Class</span>
      </button>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Main Assignment Info */}
        <div className="flex-1 card-surface p-6 sm:p-8">
          <div className="flex items-center gap-4 border-b border-primary-600 dark:border-primary-500 pb-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary-100 dark:bg-primary-900/50 flex items-center justify-center text-primary-700 dark:text-primary-400">
              <ClipboardList size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-medium text-content">{assignment.title}</h1>
              <p className="text-muted mt-1">
                {assignment.teacher?.name} • {new Date(assignment.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm font-medium text-muted mb-6 bg-surface p-4 rounded-md border border-border">
            <div>
              {assignment.dueDate ? (
                <span className={new Date(assignment.dueDate) < new Date() ? 'text-red-500' : ''}>
                  Due {new Date(assignment.dueDate).toLocaleString()}
                </span>
              ) : (
                <span>No due date</span>
              )}
            </div>
            <div>{assignment.maxMarks} points</div>
          </div>

          <div className="prose max-w-none text-content whitespace-pre-wrap">
            {assignment.description}
          </div>
        </div>

        {/* Sidebar / Interaction Panel */}
        <div className="w-full md:w-80 space-y-6">
          {!isTeacher && (
            <div className="card-surface p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-content">Your work</h2>
                <span className={`text-sm font-medium ${mySubmission?.status === 'Graded' ? 'text-green-600 dark:text-green-400' : mySubmission?.status === 'Submitted' ? 'text-blue-600 dark:text-blue-400' : 'text-muted'}`}>
                  {mySubmission ? mySubmission.status : 'Assigned'}
                </span>
              </div>
              
              {mySubmission?.status === 'Graded' && (
                <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50 rounded-md">
                  <div className="flex items-center gap-2 text-green-800 dark:text-green-400 font-medium mb-1">
                    <CheckCircle size={18} />
                    <span>Graded</span>
                  </div>
                  <div className="text-2xl font-bold text-content mb-2">{mySubmission.marks} / {assignment.maxMarks}</div>
                  {mySubmission.feedback && (
                    <div className="text-sm text-content mt-2 border-t border-green-200 dark:border-green-800/50 pt-2">
                      <span className="font-medium">Feedback: </span>{mySubmission.feedback}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmitWork}>
                <label className="block text-sm font-medium text-content mb-2">Text submission</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="input-field min-h-[120px] mb-4 text-sm"
                  placeholder="Type your answer here..."
                  disabled={mySubmission?.status === 'Graded'}
                  required
                />
                
                {mySubmission?.status !== 'Graded' && (
                  <button
                    type="submit"
                    disabled={isSubmitting || !content.trim()}
                    className="w-full btn-primary"
                  >
                    {isSubmitting ? 'Submitting...' : (mySubmission ? 'Resubmit' : 'Turn in')}
                  </button>
                )}
              </form>
            </div>
          )}

          {isTeacher && (
            <div className="card-surface overflow-hidden">
              <div className="p-4 border-b border-border bg-base">
                <h2 className="text-lg font-medium text-content">Student Submissions</h2>
                <div className="text-sm text-muted mt-1">{submissions.length} submitted</div>
              </div>
              
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {submissions.map(sub => (
                  <div key={sub._id} className="p-4 hover:bg-surface transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-content">{sub.student?.name || 'Unknown'}</div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${sub.status === 'Graded' ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400'}`}>
                        {sub.status}
                      </span>
                    </div>
                    {sub.status === 'Graded' && (
                      <div className="text-sm font-medium text-muted mb-2">Marks: {sub.marks} / {assignment.maxMarks}</div>
                    )}
                    <button
                      onClick={() => {
                        setGradingSubmission(sub);
                        setMarks(sub.marks ?? '');
                        setFeedback(sub.feedback || '');
                      }}
                      className="text-sm text-primary-600 font-medium hover:underline flex items-center gap-1"
                    >
                      <FileText size={16} />
                      View & Grade
                    </button>
                  </div>
                ))}
                {submissions.length === 0 && (
                  <div className="p-6 text-center text-muted text-sm">
                    No submissions yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Grading Modal */}
      {gradingSubmission && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card-surface w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-border flex justify-between items-center bg-base">
              <h3 className="text-lg font-medium text-content">Grading: {gradingSubmission.student?.name}</h3>
              <button onClick={() => setGradingSubmission(null)} className="text-muted hover:text-content">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <h4 className="text-sm font-medium text-muted mb-2 uppercase tracking-wider">Submission content</h4>
                <div className="bg-surface p-4 rounded-md border border-border whitespace-pre-wrap text-content min-h-[100px]">
                  {gradingSubmission.content}
                </div>
                <div className="text-xs text-muted mt-2">
                  Submitted at: {new Date(gradingSubmission.createdAt).toLocaleString()}
                </div>
              </div>

              <form id="grading-form" onSubmit={handleGrade} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-content mb-1">
                    Marks (out of {assignment.maxMarks})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={assignment.maxMarks}
                    value={marks}
                    onChange={e => setMarks(e.target.value)}
                    className="input-field w-32"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-content mb-1">Feedback (optional)</label>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    className="input-field min-h-[80px]"
                    placeholder="Provide constructive feedback..."
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-border bg-base flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setGradingSubmission(null)} 
                className="btn-secondary"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="grading-form"
                disabled={isGrading || marks === ''} 
                className="btn-primary"
              >
                {isGrading ? 'Saving...' : 'Return Grade'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentDetails;
