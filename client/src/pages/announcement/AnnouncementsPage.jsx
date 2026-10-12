import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Megaphone, Plus, Calendar, User, BookOpen } from 'lucide-react';
import api from '../../services/api';

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchAnnouncementsData = useCallback(async () => {
    try {
      const clsRes = await api.get('/classes');
      const classList = clsRes.data.data || [];
      setClasses(classList);

      if (classList.length > 0) {
        if (isTeacher) {
          const activeClassId = selectedClass || classList[0]._id;
          setSelectedClass(activeClassId);
          const annRes = await api.get(`/classes/${activeClassId}/announcements`);
          setAnnouncements(annRes.data.data || []);
        } else {
          // Platform or across enrolled classes
          const annRes = await api.get('/announcements').catch(async () => {
            const promises = classList.map(c => api.get(`/classes/${c._id}/announcements`).then(r => r.data.data || []).catch(() => []));
            const all = await Promise.all(promises);
            return { data: { data: all.flat() } };
          });
          setAnnouncements(annRes.data.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load announcements', err);
    } finally {
      setLoading(false);
    }
  }, [isTeacher, selectedClass]);

  useEffect(() => {
    fetchAnnouncementsData();
  }, [fetchAnnouncementsData]);

  const handleClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setLoading(true);
    try {
      const res = await api.get(`/classes/${classId}/announcements`);
      setAnnouncements(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    if (!content.trim() || !selectedClass) return;
    setIsSubmitting(true);
    try {
      await api.post(`/classes/${selectedClass}/announcements`, {
        title: title.trim() || 'Class Announcement',
        content: content.trim()
      });
      setShowModal(false);
      setTitle('');
      setContent('');
      fetchAnnouncementsData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error publishing announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 font-sans pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Course Announcements</h1>
          <p className="text-sm text-muted mt-1">
            {isTeacher
              ? 'Post updates, syllabus notices, and scheduling changes to students'
              : 'Stay up to date with class briefings and instructor messages'}
          </p>
        </div>

        {isTeacher && selectedClass && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-primary text-sm flex items-center gap-2 shadow-sm self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Post Announcement</span>
          </button>
        )}
      </div>

      {isTeacher && (
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
      )}

      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl">
          <Megaphone size={48} className="mx-auto text-muted mb-3 opacity-40" />
          <h3 className="text-lg font-medium text-content mb-1">No announcements published</h3>
          <p className="text-sm text-muted mb-6">
            {isTeacher ? 'Post an update to keep your students informed.' : 'No announcements have been shared yet.'}
          </p>
          {isTeacher && selectedClass && (
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
              Post Announcement
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map(ann => (
            <div key={ann._id} className="card-surface p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center text-sm shadow-xs">
                    {ann.author?.name ? ann.author.name.charAt(0).toUpperCase() : 'T'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-content">{ann.title || 'Course Announcement'}</h3>
                    <div className="text-xs text-muted flex items-center gap-2 mt-0.5">
                      <span>{ann.author?.name || 'Course Instructor'}</span>
                      <span>•</span>
                      <span>{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-sm text-content leading-relaxed pl-13">
                <p>{ann.content}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Post Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card-surface p-6 sm:p-8 rounded-2xl max-w-lg w-full">
            <h2 className="text-xl font-bold text-content mb-1">Post Announcement</h2>
            <p className="text-xs text-muted mb-6">This message will notify all students enrolled in this class.</p>

            <form onSubmit={handleCreateAnnouncement} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                  Announcement Title
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule Update for Week 4 Lab"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                  Message Content
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Write your announcement message here..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="input-field text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-sm shadow-sm"
                >
                  {isSubmitting ? 'Posting...' : 'Publish Announcement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnnouncementsPage;
