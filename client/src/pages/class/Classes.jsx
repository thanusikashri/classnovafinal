import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Plus, Users, User, Clock, ArrowRight, Search, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

const Classes = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Teacher create modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Student enroll state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollCode, setEnrollCode] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch classes', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    setIsCreating(true);
    try {
      await api.post('/classes', {
        name: newClassName.trim(),
        description: newClassDesc.trim()
      });
      setShowCreateModal(false);
      setNewClassName('');
      setNewClassDesc('');
      fetchClasses();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating class');
    } finally {
      setIsCreating(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!enrollCode.trim()) return;
    setIsEnrolling(true);
    setEnrollError('');
    try {
      await api.post('/classes/enroll', { code: enrollCode.trim() });
      setShowEnrollModal(false);
      setEnrollCode('');
      fetchClasses();
    } catch (err) {
      setEnrollError(err.response?.data?.message || 'Failed to enroll');
    } finally {
      setIsEnrolling(false);
    }
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description && c.description.toLowerCase().includes(search.toLowerCase())) ||
    (c.classCode && c.classCode.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans pt-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">
            {user?.role === 'student' ? 'My Classes & Courses' : user?.role === 'teacher' ? 'My Classes' : 'All Platform Classes'}
          </h1>
          <p className="text-sm text-muted mt-1">
            {user?.role === 'student' 
              ? 'Browse your enrolled courses, view materials, assignments, and quizzes' 
              : user?.role === 'teacher' 
                ? 'Manage your created courses, student rosters, and curriculum'
                : 'System-wide view of all courses across departments and professors'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {user?.role === 'student' && (
            <button
              onClick={() => setShowEnrollModal(true)}
              className="btn-secondary text-sm flex items-center gap-2"
            >
              <Plus size={16} />
              <span>Enroll by Code</span>
            </button>
          )}

          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary text-sm flex items-center gap-2 shadow-sm"
            >
              <Plus size={16} />
              <span>Create New Class</span>
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6 relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Filter classes by title, code, or description..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10 py-2.5 text-sm"
        />
      </div>

      {/* Class Grid */}
      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading course catalog...</div>
      ) : filteredClasses.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl">
          <BookOpen size={48} className="mx-auto text-muted mb-3 opacity-50" />
          <h3 className="text-lg font-medium text-content mb-1">No courses found</h3>
          <p className="text-sm text-muted mb-6">
            {search ? 'Try adjusting your search keywords' : 'No courses are available right now.'}
          </p>
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <button onClick={() => setShowCreateModal(true)} className="btn-primary text-sm">
              Create your first course
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((c, index) => {
            const studentCount = c.students ? c.students.length : 0;
            const teacherName = c.teacher?.name || 'Class Instructor';
            const colors = [
              'from-violet-600 to-indigo-600',
              'from-blue-600 to-cyan-600',
              'from-emerald-600 to-teal-600',
              'from-rose-600 to-pink-600',
              'from-amber-600 to-orange-600'
            ];
            const bannerGradient = colors[index % colors.length];

            return (
              <div key={c._id} className="card-surface rounded-2xl overflow-hidden flex flex-col justify-between group hover:shadow-md transition-shadow">
                <div>
                  <div className={`p-6 bg-gradient-to-r ${bannerGradient} text-white`}>
                    <div className="flex items-center justify-between text-xs text-white/80 font-mono mb-2">
                      <span className="bg-white/20 px-2 py-0.5 rounded-full font-semibold">{c.classCode || c.code || 'CODE'}</span>
                      <span className="flex items-center gap-1">
                        <Users size={14} />
                        {studentCount} Students
                      </span>
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-white line-clamp-1">{c.name}</h3>
                    <p className="text-xs text-white/80 mt-1 flex items-center gap-1.5">
                      <User size={13} />
                      <span>{teacherName}</span>
                    </p>
                  </div>

                  <div className="p-6">
                    <p className="text-sm text-muted line-clamp-2 min-h-[40px] mb-3">
                      {c.description || 'No course overview provided.'}
                    </p>
                    <div className="text-xs text-muted font-medium flex items-center gap-3">
                      <span>{(c.quizCount ?? 0)} Quizzes</span>
                      <span>•</span>
                      <span>{(c.assignmentCount ?? 0)} Assignments</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 pt-0 border-t border-border mt-2">
                  <div className="pt-4 flex items-center justify-between">
                    <span className="text-xs text-muted">
                      Created {new Date(c.createdAt || Date.now()).toLocaleDateString()}
                    </span>
                    <Link
                      to={`/classes/${c._id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Enter Class</span>
                      <ArrowRight size={16} />
                    </Link>
                  </div>
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
            <h2 className="text-xl font-bold text-content mb-2">Create New Course</h2>
            <p className="text-xs text-muted mb-6">Create a new class for your students with automated class codes.</p>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-content mb-1">Class Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS101: Introduction to Artificial Intelligence"
                  value={newClassName}
                  onChange={e => setNewClassName(e.target.value)}
                  className="input-field text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-content mb-1">Course Description</label>
                <textarea
                  rows={3}
                  placeholder="Outline topics, weekly lectures, or learning objectives..."
                  value={newClassDesc}
                  onChange={e => setNewClassDesc(e.target.value)}
                  className="input-field text-sm"
                />
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
                  disabled={isCreating}
                  className="btn-primary text-sm"
                >
                  {isCreating ? 'Creating...' : 'Create Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Enroll Modal */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card-surface p-6 sm:p-8 rounded-2xl max-w-md w-full">
            <h2 className="text-xl font-bold text-content mb-2">Enroll in Course</h2>
            <p className="text-xs text-muted mb-6">Enter the enrollment code provided by your course professor.</p>
            {enrollError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs">
                {enrollError}
              </div>
            )}
            <form onSubmit={handleEnroll} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-content mb-1">Class Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS101-AI"
                  value={enrollCode}
                  onChange={e => setEnrollCode(e.target.value)}
                  className="input-field text-sm uppercase tracking-wider font-mono"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isEnrolling}
                  className="btn-primary text-sm"
                >
                  {isEnrolling ? 'Enrolling...' : 'Join Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Classes;
