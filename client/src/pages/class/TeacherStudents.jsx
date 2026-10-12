import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Search, Mail, BookOpen, CheckCircle2 } from 'lucide-react';
import api from '../../services/api';

const TeacherStudents = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('all');
  const [students, setStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStudents = useCallback(async () => {
    try {
      const clsRes = await api.get('/classes');
      const classList = clsRes.data.data || [];
      setClasses(classList);

      // Aggregate students across teacher's classes
      const studentMap = new Map();
      classList.forEach(c => {
        if (c.students) {
          c.students.forEach(s => {
            const sId = typeof s === 'object' ? s._id : s;
            const sName = typeof s === 'object' ? s.name : 'Enrolled Student';
            const sEmail = typeof s === 'object' ? s.email : '';
            if (!studentMap.has(sId)) {
              studentMap.set(sId, {
                _id: sId,
                name: sName,
                email: sEmail,
                enrolledClasses: [c.name]
              });
            } else {
              studentMap.get(sId).enrolledClasses.push(c.name);
            }
          });
        }
      });

      setStudents(Array.from(studentMap.values()));
    } catch (err) {
      console.error('Failed to load students', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
    if (selectedClass === 'all') return matchesSearch;
    return matchesSearch && s.enrolledClasses.includes(selectedClass);
  });

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Enrolled Course Students</h1>
          <p className="text-sm text-muted mt-1">
            Directory of all students enrolled across your classes, their contact emails, and course rosters
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative w-full sm:w-80">
          <Search size={18} className="absolute left-3.5 top-3 text-muted pointer-events-none" />
          <input
            type="text"
            placeholder="Search student by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-10 text-sm"
          />
        </div>

        <select
          value={selectedClass}
          onChange={e => setSelectedClass(e.target.value)}
          className="input-field text-sm w-full sm:w-auto"
        >
          <option value="all">All Enrolled Classes</option>
          {classes.map(c => (
            <option key={c._id} value={c.name}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading student directory...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl">
          <Users size={48} className="mx-auto text-muted mb-3 opacity-40" />
          <h3 className="text-lg font-medium text-content mb-1">No students found</h3>
          <p className="text-sm text-muted">
            {search ? 'Try adjusting your search criteria' : 'Students will appear here once they enroll in your courses.'}
          </p>
        </div>
      ) : (
        <div className="card-surface rounded-2xl overflow-hidden divide-y divide-border">
          {filteredStudents.map(student => (
            <div key={student._id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-base/40 transition-colors">
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center text-sm shadow-xs">
                  {student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-content">{student.name}</h3>
                  <div className="text-xs text-muted mt-0.5 flex items-center gap-1.5">
                    <Mail size={13} />
                    <span>{student.email}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {student.enrolledClasses.map((className, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-full text-xs font-medium bg-base border border-border text-muted"
                  >
                    {className}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TeacherStudents;
