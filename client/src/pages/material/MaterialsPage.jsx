import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Plus, Download, Trash2, Edit3, BookOpen, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import MaterialModal from '../../components/MaterialModal';

const MaterialsPage = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newMat, setNewMat] = useState({ title: '', description: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingMaterial, setViewingMaterial] = useState(null);

  const fetchMaterialsData = useCallback(async () => {
    try {
      const clsRes = await api.get('/classes');
      const classList = clsRes.data.data || [];
      setClasses(classList);

      if (classList.length > 0) {
        const activeCId = selectedClass || classList[0]._id;
        setSelectedClass(activeCId);
        const matRes = await api.get(`/classes/${activeCId}/materials`);
        setMaterials(matRes.data.data || []);
      }
    } catch (err) {
      console.error('Failed to load study materials', err);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  useEffect(() => {
    fetchMaterialsData();
  }, [fetchMaterialsData]);

  const handleClassChange = async (e) => {
    const classId = e.target.value;
    setSelectedClass(classId);
    setLoading(true);
    try {
      const res = await api.get(`/classes/${classId}/materials`);
      setMaterials(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaterial = async (e) => {
    e.preventDefault();
    if (!newMat.title.trim() || !selectedClass) return;
    setIsSubmitting(true);
    try {
      await api.post(`/classes/${selectedClass}/materials`, {
        title: newMat.title.trim(),
        description: newMat.description.trim()
      });
      setShowUploadModal(false);
      setNewMat({ title: '', description: '' });
      fetchMaterialsData();
    } catch (err) {
      alert(err.response?.data?.message || 'Error uploading study material');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteMaterial = async (matId) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/classes/${selectedClass}/materials/${matId}`);
      setMaterials(prev => prev.filter(m => m._id !== matId));
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting material');
    }
  };

  return (
    <div className="max-w-7xl mx-auto pb-12 font-sans pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Study Materials & Documents</h1>
          <p className="text-sm text-muted mt-1">
            {isTeacher
              ? 'Upload, organize, edit, and distribute course PDF documents and lecture notes'
              : 'Access syllabus, lecture notes, textbook chapters, and downloadable resources'}
          </p>
        </div>

        {isTeacher && selectedClass && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary text-sm flex items-center gap-2 shadow-sm self-start sm:self-auto"
          >
            <Plus size={16} />
            <span>Upload Document</span>
          </button>
        )}
      </div>

      {/* Course Select */}
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
        <div className="flex justify-center py-20 text-muted text-sm">Loading course documents...</div>
      ) : materials.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl">
          <FileText size={48} className="mx-auto text-muted mb-3 opacity-40" />
          <h3 className="text-lg font-medium text-content mb-1">No documents available</h3>
          <p className="text-sm text-muted mb-6">
            {isTeacher
              ? 'Upload your first study document or syllabus PDF for this course.'
              : 'Your instructor has not uploaded materials for this class yet.'}
          </p>
          {isTeacher && selectedClass && (
            <button onClick={() => setShowUploadModal(true)} className="btn-primary text-sm">
              Upload Document
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {materials.map(mat => (
            <div key={mat._id} className="card-surface rounded-2xl p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between text-xs text-muted mb-3">
                  <span className="font-semibold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/40 px-2.5 py-0.5 rounded-full uppercase">
                    {mat.fileType ? mat.fileType.split('/')[1] || 'PDF' : 'PDF'}
                  </span>
                  <span>{new Date(mat.createdAt || Date.now()).toLocaleDateString()}</span>
                </div>

                <h3 className="text-base font-bold text-content tracking-tight line-clamp-1 mb-2">{mat.title}</h3>
                <p className="text-xs text-muted line-clamp-3 mb-4">{mat.description || 'No description provided.'}</p>
              </div>

              <div className="pt-4 border-t border-border flex items-center justify-between">
                <button
                  onClick={() => setViewingMaterial(mat)}
                  className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3"
                >
                  <FileText size={14} />
                  <span>View Material</span>
                </button>

                {isTeacher && (
                  <button
                    onClick={() => handleDeleteMaterial(mat._id)}
                    className="p-1.5 rounded-lg border border-border text-muted hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="card-surface p-6 sm:p-8 rounded-2xl max-w-lg w-full">
            <h2 className="text-xl font-bold text-content mb-1">Upload Study Material</h2>
            <p className="text-xs text-muted mb-6">Attach a study guide or lecture document to this course.</p>

            <form onSubmit={handleCreateMaterial} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chapter 4: Distributed System Architectures"
                  value={newMat.title}
                  onChange={e => setNewMat({ ...newMat, title: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Summary of lecture notes, reading prerequisites..."
                  value={newMat.description}
                  onChange={e => setNewMat({ ...newMat, description: e.target.value })}
                  className="input-field text-sm"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="btn-secondary text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary text-sm shadow-sm"
                >
                  {isSubmitting ? 'Uploading...' : 'Upload Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Material Modal */}
      {viewingMaterial && (
        <MaterialModal
          material={viewingMaterial}
          onClose={() => setViewingMaterial(null)}
        />
      )}
    </div>
  );
};

export default MaterialsPage;
