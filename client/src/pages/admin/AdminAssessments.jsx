import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { ClipboardCheck, FileText, CheckCircle2, Clock, Award, BookOpen, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const AdminAssessments = () => {
  const { user } = useAuth();
  const [classes, setClasses] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  const fetchAssessments = useCallback(async () => {
    try {
      const clsRes = await api.get('/classes');
      const classList = clsRes.data.data || [];
      setClasses(classList);

      const items = [];
      for (const c of classList) {
        try {
          const [asgnRes, quizRes] = await Promise.all([
            api.get(`/classes/${c._id}/assignments`).catch(() => ({ data: { data: [] } })),
            api.get(`/classes/${c._id}/quizzes`).catch(() => ({ data: { data: [] } }))
          ]);

          (asgnRes.data.data || []).forEach(a => {
            items.push({
              ...a,
              type: 'assignment',
              classInfo: c
            });
          });

          (quizRes.data.data || []).forEach(q => {
            items.push({
              ...q,
              type: 'quiz',
              classInfo: c
            });
          });
        } catch (e) {
          // ignore
        }
      }

      setAssessments(items);
    } catch (err) {
      console.error('Failed to load assessment oversight', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssessments();
  }, [fetchAssessments]);

  const filtered = assessments.filter(item => {
    if (activeTab === 'all') return true;
    return item.type === activeTab;
  });

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Quiz & Assignment Oversight</h1>
          <p className="text-sm text-muted mt-1">
            Global evaluation monitoring across all department courses, active quizzes, and coursework
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex items-center gap-2">
        {['all', 'quiz', 'assignment'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold capitalize transition-colors ${
              activeTab === tab
                ? 'bg-primary-600 text-white shadow-xs'
                : 'bg-surface border border-border text-muted hover:text-content'
            }`}
          >
            {tab === 'all' ? 'All Assessments' : `${tab}s`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading assessment records...</div>
      ) : filtered.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl">
          <ClipboardCheck size={48} className="mx-auto text-muted mb-3 opacity-40" />
          <h3 className="text-lg font-medium text-content mb-1">No assessments recorded</h3>
          <p className="text-sm text-muted">Assessments will appear here once teachers publish them.</p>
        </div>
      ) : (
        <div className="card-surface rounded-2xl overflow-hidden divide-y divide-border">
          {filtered.map(item => (
            <div key={item._id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-base/40 transition-colors">
              <div>
                <div className="flex items-center gap-2.5 mb-1">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                    item.type === 'quiz'
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300'
                      : 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                  }`}>
                    {item.type}
                  </span>
                  <h3 className="text-base font-bold text-content">{item.title}</h3>
                </div>
                <div className="text-xs text-muted flex items-center gap-3 mt-1">
                  <span className="font-medium text-content">{item.classInfo?.name}</span>
                  <span>•</span>
                  <span>Instructor: {item.classInfo?.teacher?.name || 'Assigned Professor'}</span>
                  <span>•</span>
                  <span>
                    {item.type === 'quiz'
                      ? `${item.durationMinutes || 30} Mins Duration`
                      : `Due: ${new Date(item.dueDate || Date.now()).toLocaleDateString()}`}
                  </span>
                </div>
              </div>

              <div>
                <Link
                  to={item.type === 'quiz'
                    ? `/classes/${item.classInfo?._id}/quizzes/${item._id}`
                    : `/classes/${item.classInfo?._id}/assignments/${item._id}`}
                  className="btn-secondary text-xs"
                >
                  Inspect Results
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminAssessments;
