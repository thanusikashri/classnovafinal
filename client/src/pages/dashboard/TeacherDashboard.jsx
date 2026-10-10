import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MoreVertical, Users } from 'lucide-react';
import api from '../../services/api';

const TeacherDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassDesc, setNewClassDesc] = useState('');

  const fetchClasses = useCallback(async () => {
    try {
      const res = await api.get('/classes');
      setClasses(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/classes', { name: newClassName, description: newClassDesc });
      setShowModal(false);
      setNewClassName('');
      setNewClassDesc('');
      fetchClasses();
    } catch (err) {
      console.error(err);
      alert('Error creating class');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Pre-defined banner gradients for visual variety
  const getBannerGradient = (index) => {
    const gradients = [
      'bg-blue-600',
      'bg-indigo-600',
      'bg-teal-600',
      'bg-rose-600',
      'bg-emerald-600',
      'bg-purple-600'
    ];
    return gradients[index % gradients.length];
  };

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md font-medium hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <Plus size={20} />
          <span>Create class</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-gray-500">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {classes.map((cls, idx) => (
            <div key={cls._id} className="bg-white rounded-lg border border-gray-300 overflow-hidden hover:shadow-md transition-shadow flex flex-col h-72 relative group">
              <Link to={`/classes/${cls._id}`} className={`h-24 p-4 text-white relative block ${getBannerGradient(idx)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-medium truncate hover:underline" title={cls.name}>{cls.name}</h3>
                    <p className="text-sm opacity-90 truncate mt-1" title={cls.description}>{cls.description || 'No description'}</p>
                  </div>
                  <button onClick={(e) => { e.preventDefault(); }} className="p-1 rounded-full hover:bg-black/10 transition-colors">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </Link>
              
              <div className="p-4 flex-1 flex flex-col justify-end">
                <div className="text-xs text-gray-500 flex justify-between items-center border-t border-gray-100 pt-3">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-700">Code: {cls.classCode}</span>
                    <span>{cls.students?.length || 0} students</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="bg-gray-100 p-6 rounded-full mb-4">
                <Users size={48} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">Add a class to get started</h3>
              <p className="text-sm">Create a class to communicate with your students.</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-6 bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700 transition-colors"
              >
                Create class
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4">
              <h3 className="text-lg font-medium text-gray-800">Create class</h3>
            </div>
            <form onSubmit={handleCreateClass}>
              <div className="px-6 py-4 space-y-4">
                <div className="relative">
                  <input 
                    required 
                    type="text" 
                    id="className"
                    value={newClassName} 
                    onChange={e => setNewClassName(e.target.value)} 
                    className="block w-full px-4 pt-6 pb-2 text-base text-gray-900 bg-gray-50 border border-gray-300 rounded-t-md appearance-none focus:outline-none focus:ring-0 focus:border-primary-600 peer" 
                    placeholder=" "
                  />
                  <label htmlFor="className" className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-focus:text-primary-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3">Class name (required)</label>
                  <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary-600 scale-x-0 peer-focus:scale-x-100 transition-transform duration-300"></div>
                </div>
                
                <div className="relative">
                  <input 
                    type="text" 
                    id="classDesc"
                    value={newClassDesc} 
                    onChange={e => setNewClassDesc(e.target.value)} 
                    className="block w-full px-4 pt-6 pb-2 text-base text-gray-900 bg-gray-50 border border-gray-300 rounded-t-md appearance-none focus:outline-none focus:ring-0 focus:border-primary-600 peer" 
                    placeholder=" "
                  />
                  <label htmlFor="classDesc" className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-focus:text-primary-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3">Section / Description</label>
                  <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary-600 scale-x-0 peer-focus:scale-x-100 transition-transform duration-300"></div>
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-gray-50 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={!newClassName.trim() || isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDashboard;
