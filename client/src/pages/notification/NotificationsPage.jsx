import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Bell, Check, CheckCheck, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const NotificationsPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data || []);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const handleClickNotif = (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id, { stopPropagation: () => {} });
    }
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <div className="max-w-4xl mx-auto pb-12 font-sans pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Notifications & Alerts</h1>
          <p className="text-sm text-muted mt-1">
            Course announcements, attendance alerts, assessment notices, and administrative decisions
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="btn-secondary text-xs flex items-center gap-1.5 self-start sm:self-auto"
          >
            <CheckCheck size={14} />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="card-surface p-12 text-center rounded-2xl">
          <Bell size={48} className="mx-auto text-muted mb-3 opacity-40" />
          <h3 className="text-lg font-medium text-content mb-1">No notifications</h3>
          <p className="text-sm text-muted">You are all caught up with your classes and updates.</p>
        </div>
      ) : (
        <div className="card-surface rounded-2xl overflow-hidden divide-y divide-border">
          {notifications.map(notif => (
            <div
              key={notif._id}
              onClick={() => handleClickNotif(notif)}
              className={`p-5 flex items-start justify-between gap-4 cursor-pointer hover:bg-base/60 transition-colors ${
                !notif.isRead ? 'bg-primary-50/40 dark:bg-primary-950/20' : ''
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className={`p-2 rounded-xl mt-0.5 ${
                  !notif.isRead
                    ? 'bg-primary-100 dark:bg-primary-900/60 text-primary-600 dark:text-primary-300'
                    : 'bg-base text-muted border border-border'
                }`}>
                  <Bell size={18} />
                </div>
                <div>
                  <h4 className={`text-sm ${!notif.isRead ? 'font-bold text-content' : 'font-medium text-content'}`}>
                    {notif.title}
                  </h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed">{notif.message}</p>
                  <span className="text-[10px] text-muted mt-2 block font-mono">
                    {new Date(notif.createdAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {!notif.isRead && (
                <button
                  onClick={e => handleMarkAsRead(notif._id, e)}
                  className="p-1.5 rounded-full hover:bg-primary-100 dark:hover:bg-primary-900/40 text-primary-600 dark:text-primary-400 shrink-0"
                  title="Mark as read"
                >
                  <Check size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
