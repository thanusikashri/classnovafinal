import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { MoreVertical, ClipboardList } from 'lucide-react';
import api from '../../services/api';

const ClassDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [classData, setClassData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [activeTab, setActiveTab] = useState('stream');
  const [newAnnouncement, setNewAnnouncement] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchClassData = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${id}`);
      setClassData(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [id]);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const res = await api.get(`/classes/${id}/announcements`);
      setAnnouncements(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchClassData();
    fetchAnnouncements();
  }, [fetchClassData, fetchAnnouncements]);

  const handlePostAnnouncement = async (e) => {
    e.preventDefault();
    if (!newAnnouncement.trim()) return;
    setIsSubmitting(true);
    try {
      await api.post(`/classes/${id}/announcements`, { content: newAnnouncement });
      setNewAnnouncement('');
      fetchAnnouncements();
    } catch (err) {
      console.error(err);
      alert('Error posting announcement');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || !classData) {
    return <div className="flex justify-center py-20 text-gray-500">Loading...</div>;
  }

  const isTeacher = user.role === 'admin' || (user.role === 'teacher' && classData.teacher._id === user._id);

  // Randomize a nice gradient based on ID length
  const gradientClass = 'bg-gradient-to-r from-primary-700 to-indigo-600';

  return (
    <div className="max-w-5xl mx-auto pb-12 font-sans">
      
      {/* Tabs */}
      <div className="flex border-b border-gray-300 mb-6">
        {['stream', 'classwork', 'people'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 font-medium capitalize transition-colors relative ${
              activeTab === tab 
                ? 'text-primary-700' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-t-lg'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 w-full h-1 bg-primary-600 rounded-t-md"></span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'stream' && (
        <div className="space-y-6">
          {/* Banner */}
          <div className={`${gradientClass} rounded-xl h-48 sm:h-64 relative flex flex-col justify-end p-6 text-white shadow-sm overflow-hidden`}>
            {/* Pattern overlay */}
            <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
            <div className="relative z-10">
              <h1 className="text-3xl sm:text-4xl font-medium mb-1 drop-shadow-md">{classData.name}</h1>
              {classData.description && <p className="text-lg opacity-90 drop-shadow-md">{classData.description}</p>}
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar info block (left) */}
            <div className="hidden md:block w-64 space-y-4 shrink-0">
              {isTeacher && (
                <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Class code</h3>
                  <div className="text-2xl text-primary-600 font-mono tracking-wider">{classData.classCode}</div>
                </div>
              )}
              <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Upcoming</h3>
                <p className="text-sm text-gray-500 mb-4">No work due soon</p>
                <button className="text-sm text-primary-600 font-medium hover:underline focus:outline-none">View all</button>
              </div>
            </div>

            {/* Main Stream Column (right) */}
            <div className="flex-1 space-y-4">
              
              {/* Teacher Announcement Input */}
              {isTeacher && (
                <div className="bg-white border border-gray-300 rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-medium shrink-0 shadow-sm">
                      {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <form onSubmit={handlePostAnnouncement} className="flex-1">
                      <textarea
                        value={newAnnouncement}
                        onChange={(e) => setNewAnnouncement(e.target.value)}
                        placeholder="Announce something to your class"
                        className="w-full bg-gray-50 hover:bg-gray-100 focus:bg-white px-4 py-3 border-b-2 border-transparent focus:border-primary-600 outline-none resize-none transition-colors duration-200 min-h-[50px]"
                        rows={newAnnouncement.length > 50 ? 3 : 1}
                        required
                      ></textarea>
                      {newAnnouncement.trim().length > 0 && (
                        <div className="flex justify-end mt-3 gap-2">
                          <button 
                            type="button" 
                            onClick={() => setNewAnnouncement('')} 
                            className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            disabled={isSubmitting}
                            className="px-6 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 transition-colors shadow-sm disabled:opacity-50"
                          >
                            {isSubmitting ? 'Posting...' : 'Post'}
                          </button>
                        </div>
                      )}
                    </form>
                  </div>
                </div>
              )}

              {/* Feed */}
              <div className="space-y-4">
                {announcements.map((ann) => (
                  <div key={ann._id} className="bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium shadow-sm">
                          {ann.author?.name ? ann.author.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">{ann.author?.name || 'Unknown User'}</h4>
                          <p className="text-xs text-gray-500">
                            {new Date(ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <button className="p-2 rounded-full hover:bg-gray-100 text-gray-500 transition-colors">
                        <MoreVertical size={20} />
                      </button>
                    </div>
                    <div className="px-4 pb-4">
                      <p className="text-gray-800 whitespace-pre-wrap">{ann.content}</p>
                    </div>
                  </div>
                ))}
                
                {announcements.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center border border-gray-300 rounded-lg bg-gray-50/50">
                    <ClipboardList size={48} className="text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-700 mb-1">This is where you'll see updates</h3>
                    <p className="text-sm text-gray-500 max-w-md">
                      {isTeacher 
                        ? "Use the stream to communicate with your class and post announcements." 
                        : "Your teacher hasn't posted any announcements yet."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'classwork' && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="bg-primary-50 p-6 rounded-full mb-4">
            <ClipboardList size={48} className="text-primary-400" />
          </div>
          <h2 className="text-xl font-medium text-gray-800 mb-2">Classwork coming soon</h2>
          <p className="text-gray-500 max-w-md">
            This feature is currently under development. Check back later for assignments and materials.
          </p>
        </div>
      )}

      {activeTab === 'people' && (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg border border-gray-300 shadow-sm mt-4">
          <div className="mb-10">
            <div className="flex items-center justify-between border-b border-primary-600 pb-3 mb-6">
              <h2 className="text-2xl font-medium text-primary-700">Teacher</h2>
            </div>
            <div className="flex items-center gap-4 px-2">
              <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium shadow-sm">
                {classData.teacher?.name ? classData.teacher.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <span className="text-gray-800">{classData.teacher?.name || 'Unknown Teacher'}</span>
            </div>
          </div>
          
          <div>
            <div className="flex items-center justify-between border-b border-primary-600 pb-3 mb-6">
              <h2 className="text-2xl font-medium text-primary-700">Students</h2>
              <span className="text-primary-700 font-medium">{classData.students.length} students</span>
            </div>
            {classData.students.length === 0 ? (
              <p className="text-gray-500 text-center py-6">No students are enrolled in this class yet.</p>
            ) : (
              <ul className="space-y-1">
                {classData.students.map((student) => (
                  <li key={student._id} className="flex items-center gap-4 p-3 hover:bg-gray-50 rounded-lg transition-colors border-b border-gray-100 last:border-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-medium shadow-sm shrink-0">
                      {student?.name ? student.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <span className="text-gray-800 font-medium">{student?.name || 'Unknown Student'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetails;
