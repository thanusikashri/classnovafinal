import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Plus, Clock, Calendar, CheckCircle2, AlertCircle, ArrowRight, User } from 'lucide-react';
import api from '../../services/api';

const Assignments = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Teacher Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAssign, setNewAssign] = useState({
    title: '',
    description: '',
    dueDate: '',
    maxMarks: 100
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAssignmentsData = useCallback(async () => {
    try {
      const clsRes = await api.get('/classes');
      const classList = clsRes.data.data || [];
      setClasses(classList);

      if (classList.length > 0) {
        if (isTeacher) {
          const activeClassId = selectedClass || classList[0]._id;
          setSelectedClass(activeClassId);
          const asgnRes = await api.get(`/classes/${activeClassId}/assignments`);
          setAssignments(asgnRes.data.data || []);
        } else {
          // For student, fetch all assignments across all enrolled classes
          const promises = classList.map(async (c) => {
            try {
              const res = await api.get(`/classes/${c._id}/assignments`);
              return (res.data.data || []).map(a => ({ ...a, classInfo: c }));
            } catch (e) {
              return [];
            }
          });
          const all = await Promise.all(promises);
          setAssignments(all.flat());
        }
      }
    } catch (err) {
      console.error('Failed to load assignments', err);
    } finally {
      setLoading(false);
    }
  }, [isTeacher, selectedClass]);

  useEffect(() => {
    fetchAssignmentsData();
  }, [fetchAssignmentsData]);

  const handleTeacherClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setLoading(true);
    try {
      const res = await api.get(`/classes/${classId}/assignments`);
      setAssignments(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssign.title.trim() || !selectedClass) return;
    setIsSubmitting(true);
    try {
      await api.post(`/classes/${selectedClass}/assignments`, {
        title: newAssign.title.trim(),
        description: newAssign.description.trim(),
        dueDate: newAssign.dueDate || new Date(Date.now() + 86400000 * 7).toISOString(),
        maxMarks: Number(newAssign.maxMarks) || 100
      });
      setShowCreateModal(false);
      setNewAssign({ title: '', description: '', dueDate: '', maxMarks: 100 });
      fetchAssignmentsData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating assignment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Assignments & Coursework</h1>
          <p className="text-sm text-muted mt-1">
            {isStudent
              ? 'Review pending coursework, upload solutions, and track grades'
              : 'Create homework tasks, set deadlines, and inspect student submissions'}
          </p>
        </div>

        {isTeacher && selectedClass && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary text-sm flex items-center gap-2 shadow-sm self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Create Assignment</span>
          </button>
        )}
      </div>

      {isTeacher && (
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-semibold text-content">Select Course:</label>
          <select
            value={selectedClass}
            onChange={handleTeacherClassChange}
            className="input-field text-sm max-w-md"
          >
            {classes.map(c => (
              <option key={c._id} value={c._id}>
                {c.name} ({c.classCode || c.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading assignments...</div>
      ) : assignments.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl">
          <FileText size={48} className="mx-auto text-muted mb-3 opacity-50" />
          <h3 className="text-lg font-medium text-content mb-1">No assignments found</h3>
          <p className="text-sm text-muted mb-6">
            {isTeacher
              ? 'Create your first assignment for this class to get started.'
              : 'There are no active assignments due for your courses right now.'}
          </p>
          {isTeacher && selectedClass && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm">
              Create Assignment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map(asgn => {
            const classId = isStudent ? asgn.classInfo?._id : selectedClass;
            const classTitle = isStudent ? asgn.classInfo?.name : classes.find(c => c._id === selectedClass)?.name;
            const dueDateStr = asgn.dueDate ? new Date(asgn.dueDate).toLocaleDateString() : 'No date set';

            return (
              <div key={asgn._id} className="card-surface rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <div className="flex items-center justify-between text-xs text-muted mb-2">
                    <span className="font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-0.5 rounded-full">
                      {asgn.maxMarks || 100} Marks
                    </span>
                    <span className="flex items-center gap-1 text-muted">
                      <Calendar size={13} />
                      Due {dueDateStr}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-content tracking-tight line-clamp-1 mb-1">{asgn.title}</h3>
                  {classTitle && <p className="text-xs text-muted mb-3">{classTitle}</p>}
                  <p className="text-sm text-muted line-clamp-3 mb-4">
                    {asgn.description || 'No description provided.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted">
                    {asgn.submissions ? `${asgn.submissions.length} Submissions` : 'Open'}
                  </span>
                  <Link
                    to={`/classes/${classId}/assignments/${asgn._id}`}
                    className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3.5 shadow-xs"
                  >
                    <span>{isTeacher ? 'Review Submissions' : 'View & Submit'}</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Teacher Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card-surface p-6 sm:p-8 rounded-2xl max-w-lg w-full">
            <h2 className="text-xl font-bold text-content mb-1">Create Assignment</h2>
            <p className="text-xs text-muted mb-6">Publish a new assignment for students in this course.</p>

            <form onSubmit={handleCreateAssignment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                  Assignment Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab 3: Deep Neural Network Architecture"
                  value={newAssign.title}
                  onChange={e => setNewAssign({ ...newAssign, title: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                  Description & Instructions
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail instructions, deliverables, requirements, and grading criteria..."
                  value={newAssign.description}
                  onChange={e => setNewAssign({ ...newAssign, description: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newAssign.dueDate}
                    onChange={e => setNewAssign({ ...newAssign, dueDate: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                    Max Marks
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newAssign.maxMarks}
                    onChange={e => setNewAssign({ ...newAssign, maxMarks: e.target.value })}
                    className="input-field text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-sm shadow-sm"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;
