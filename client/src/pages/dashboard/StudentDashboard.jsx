import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Plus, MoreVertical, BookOpen } from 'lucide-react';
import api from '../../services/api';

const StudentDashboard = () => {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');

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

  const handleJoinClass = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await api.post('/classes/enroll', { classCode });
      setShowModal(false);
      setClassCode('');
      fetchClasses();
    } catch (err) {
      setError(err.response?.data?.message || 'Error joining class');
    } finally {
      setIsSubmitting(false);
    }
  };

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
          <span>Join class</span>
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
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium">
                      {cls.teacher?.name ? cls.teacher.name.charAt(0).toUpperCase() : 'T'}
                    </div>
                    <span className="truncate">{cls.teacher?.name || 'Unknown Teacher'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {classes.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-500">
              <div className="bg-gray-100 p-6 rounded-full mb-4">
                <BookOpen size={48} className="text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-800 mb-1">Add a class to get started</h3>
              <p className="text-sm mb-6 text-center max-w-md">Join a class using the 6-character code provided by your teacher.</p>
              <button
                onClick={() => setShowModal(true)}
                className="bg-primary-600 text-white px-6 py-2 rounded-md font-medium hover:bg-primary-700 transition-colors"
              >
                Join class
              </button>
            </div>
          )}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4">
              <h3 className="text-lg font-medium text-gray-800">Join class</h3>
              <p className="text-sm text-gray-500 mt-1">Ask your teacher for the class code, then enter it here.</p>
            </div>
            <form onSubmit={handleJoinClass}>
              <div className="px-6 py-4 space-y-4">
                {error && <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">{error}</div>}
                
                <div className="relative">
                  <input 
                    required 
                    type="text" 
                    id="classCode"
                    value={classCode} 
                    onChange={e => setClassCode(e.target.value)} 
                    className="block w-full px-4 pt-6 pb-2 text-base text-gray-900 bg-gray-50 border border-gray-300 rounded-t-md appearance-none focus:outline-none focus:ring-0 focus:border-primary-600 uppercase font-mono peer" 
                    placeholder=" "
                    maxLength={6}
                  />
                  <label htmlFor="classCode" className="absolute text-sm text-gray-500 duration-300 transform -translate-y-3 scale-75 top-4 z-10 origin-[0] left-4 peer-focus:text-primary-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-3">Class code</label>
                  <div className="absolute bottom-0 left-0 h-0.5 w-full bg-primary-600 scale-x-0 peer-focus:scale-x-100 transition-transform duration-300"></div>
                </div>
              </div>
              <div className="px-6 py-4 flex justify-end gap-2 bg-gray-50 border-t border-gray-200">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors">Cancel</button>
                <button type="submit" disabled={classCode.length < 5 || isSubmitting} className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50 transition-colors">
                  {isSubmitting ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
