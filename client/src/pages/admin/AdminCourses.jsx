import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Users, User, Search, Trash2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const AdminCourses = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.data || []);
    } catch (err) {
      console.error('Failed to load courses', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const filtered = classes.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.teacher?.name && c.teacher.name.toLowerCase().includes(search.toLowerCase())) ||
    (c.classCode && c.classCode.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Course Management</h1>
          <p className="text-sm text-muted mt-1">
            System-wide oversight of all active courses across departments, faculty, and enrollments
          </p>
        </div>
      </div>

      <div className="mb-6 relative max-w-md">
        <Search size={18} className="absolute left-3.5 top-3 text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Filter courses by name, instructor, or code..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input-field pl-10 text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading course directory...</div>
      ) : filtered.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl">
          <BookOpen size={48} className="mx-auto text-muted mb-3 opacity-40" />
          <h3 className="text-lg font-medium text-content mb-1">No courses found</h3>
        </div>
      ) : (
        <div className="card-surface rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-base text-muted text-xs uppercase font-semibold">
                <tr>
                  <th className="px-6 py-4 text-left">Course Name</th>
                  <th className="px-6 py-4 text-left">Class Code</th>
                  <th className="px-6 py-4 text-left">Assigned Instructor</th>
                  <th className="px-6 py-4 text-left">Enrolled Students</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(cls => (
                  <tr key={cls._id} className="hover:bg-base/40 transition-colors">
                    <td className="px-6 py-4 font-semibold text-content">{cls.name}</td>
                    <td className="px-6 py-4 font-mono text-xs text-primary-600 dark:text-primary-400 font-bold">
                      {cls.classCode || cls.code || 'CODE'}
                    </td>
                    <td className="px-6 py-4 text-muted">{cls.teacher?.name || 'Unassigned'}</td>
                    <td className="px-6 py-4 text-muted">{cls.students ? cls.students.length : 0} Students</td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/classes/${cls._id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-primary-600 dark:text-primary-400 hover:underline"
                      >
                        <span>Open Details</span>
                        <ArrowRight size={14} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCourses;
