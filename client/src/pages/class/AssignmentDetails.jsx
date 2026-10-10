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
    return <div className="flex justify-center py-20 text-gray-500">Loading...</div>;
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
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-300 p-6 sm:p-8">
          <div className="flex items-center gap-4 border-b border-primary-600 pb-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
              <ClipboardList size={24} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-medium text-gray-800">{assignment.title}</h1>
              <p className="text-gray-500 mt-1">
                {assignment.teacher?.name} • {new Date(assignment.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-sm font-medium text-gray-600 mb-6 bg-gray-50 p-4 rounded-md">
            <div>
              {assignment.dueDate ? (
                <span className={new Date(assignment.dueDate) < new Date() ? 'text-red-600' : ''}>
                  Due {new Date(assignment.dueDate).toLocaleString()}
                </span>
              ) : (
                <span>No due date</span>
              )}
            </div>
            <div>{assignment.maxMarks} points</div>
          </div>

          <div className="prose max-w-none text-gray-800 whitespace-pre-wrap">
            {assignment.description}
          </div>
        </div>

        {/* Sidebar / Interaction Panel */}
        <div className="w-full md:w-80 space-y-6">
          {!isTeacher && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-300 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-medium text-gray-800">Your work</h2>
                <span className={`text-sm font-medium ${mySubmission?.status === 'Graded' ? 'text-green-600' : mySubmission?.status === 'Submitted' ? 'text-blue-600' : 'text-gray-500'}`}>
                  {mySubmission ? mySubmission.status : 'Assigned'}
                </span>
              </div>
              
              {mySubmission?.status === 'Graded' && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 text-green-800 font-medium mb-1">
                    <CheckCircle size={18} />
                    <span>Graded</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 mb-2">{mySubmission.marks} / {assignment.maxMarks}</div>
                  {mySubmission.feedback && (
                    <div className="text-sm text-gray-700 mt-2 border-t border-green-200 pt-2">
                      <span className="font-medium">Feedback: </span>{mySubmission.feedback}
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmitWork}>
                <label className="block text-sm font-medium text-gray-700 mb-2">Text submission</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[120px] mb-4 text-sm"
                  placeholder="Type your answer here..."
                  disabled={mySubmission?.status === 'Graded'}
                  required
                />
                
                {mySubmission?.status !== 'Graded' && (
                  <button
                    type="submit"
                    disabled={isSubmitting || !content.trim()}
                    className="w-full py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Submitting...' : (mySubmission ? 'Resubmit' : 'Turn in')}
                  </button>
                )}
              </form>
            </div>
          )}

          {isTeacher && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-300 overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gray-50">
                <h2 className="text-lg font-medium text-gray-800">Student Submissions</h2>
                <div className="text-sm text-gray-500 mt-1">{submissions.length} submitted</div>
              </div>
              
              <div className="divide-y divide-gray-200 max-h-[500px] overflow-y-auto">
                {submissions.map(sub => (
                  <div key={sub._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-gray-900">{sub.student?.name || 'Unknown'}</div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${sub.status === 'Graded' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {sub.status}
                      </span>
                    </div>
                    {sub.status === 'Graded' && (
                      <div className="text-sm font-medium text-gray-700 mb-2">Marks: {sub.marks} / {assignment.maxMarks}</div>
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
                  <div className="p-6 text-center text-gray-500 text-sm">
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
              <h3 className="text-lg font-medium text-gray-800">Grading: {gradingSubmission.student?.name}</h3>
              <button onClick={() => setGradingSubmission(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wider">Submission content</h4>
                <div className="bg-gray-50 p-4 rounded-md border border-gray-200 whitespace-pre-wrap text-gray-800 min-h-[100px]">
                  {gradingSubmission.content}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  Submitted at: {new Date(gradingSubmission.createdAt).toLocaleString()}
                </div>
              </div>

              <form id="grading-form" onSubmit={handleGrade} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Marks (out of {assignment.maxMarks})
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={assignment.maxMarks}
                    value={marks}
                    onChange={e => setMarks(e.target.value)}
                    className="w-32 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Feedback (optional)</label>
                  <textarea
                    value={feedback}
                    onChange={e => setFeedback(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[80px]"
                    placeholder="Provide constructive feedback..."
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setGradingSubmission(null)} 
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                form="grading-form"
                disabled={isGrading || marks === ''} 
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors"
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
