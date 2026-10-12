import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, Home, User, BookOpen, Settings, LogOut, Sun, Moon, Bell, Check } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread');
      setUnreadCount(res.data.data.count);
    } catch (err) {
      console.error('Failed to fetch unread count', err);
    }
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.data);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [user, fetchUnreadCount]);

  useEffect(() => {
    if (showNotifications) {
      fetchNotifications();
    }
  }, [showNotifications]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await api.put(`/notifications/${id}/read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setUnreadCount(0);
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all read', err);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id, { stopPropagation: () => {} });
    }
    setShowNotifications(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const getNavLinks = () => {
    const base = [
      { name: 'Classes', path: `/${user?.role}-dashboard`, icon: Home },
      { name: 'Profile', path: '/profile', icon: User },
    ];
    if (user?.role === 'admin') {
      base.push({ name: 'User Management', path: '/admin/users', icon: Settings });
    }
    return base;
  };

  const navLinks = getNavLinks();

  const isActive = (path) => {
    if (path === `/${user?.role}-dashboard` && location.pathname === `/${user?.role}-dashboard`) return true;
    if (path !== `/${user?.role}-dashboard` && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="flex h-screen bg-base font-sans text-content transition-colors duration-300">
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border flex items-center justify-between px-4 z-30 transition-colors duration-300">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-muted transition-colors focus:outline-none focus:ring-2 focus:ring-primary-200"
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen size={24} className="text-primary-500" />
            <span className="text-xl text-content tracking-tight font-semibold">ClassNova</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-muted hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full text-muted hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors relative"
              aria-label="Notifications"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-surface border border-border rounded-lg shadow-lg overflow-hidden z-50">
                <div className="p-3 border-b border-border flex justify-between items-center bg-base">
                  <h3 className="font-medium text-content">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted">No notifications</div>
                  ) : (
                    notifications.map(notif => (
                      <div 
                        key={notif._id} 
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3 border-b border-border hover:bg-base cursor-pointer transition-colors ${!notif.isRead ? 'bg-primary-50 dark:bg-primary-900/10' : ''}`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className={`text-sm ${!notif.isRead ? 'font-medium text-content' : 'text-muted'}`}>{notif.title}</p>
                            <p className="text-xs text-muted mt-1 line-clamp-2">{notif.message}</p>
                            <p className="text-[10px] text-muted opacity-70 mt-1">{new Date(notif.createdAt).toLocaleString()}</p>
                          </div>
                          {!notif.isRead && (
                            <button 
                              onClick={(e) => handleMarkAsRead(notif._id, e)}
                              className="p-1 rounded-full text-primary-600 hover:bg-primary-100 dark:hover:bg-primary-900 shrink-0"
                              title="Mark as read"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="w-9 h-9 rounded-full bg-primary-500 text-white flex items-center justify-center font-medium shadow-sm select-none cursor-pointer hover:bg-primary-600 transition-colors">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </header>

      {/* Sidebar Overlay (Mobile & Desktop) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-72 bg-surface z-50 transform transition-all duration-300 ease-in-out border-r border-border ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center border-b border-border px-4 transition-colors">
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-slate-700 text-muted transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 ml-4">
            <BookOpen size={24} className="text-primary-500" />
            <span className="text-xl text-content tracking-tight font-semibold">ClassNova</span>
          </div>
        </div>

        <nav className="p-3 space-y-1 overflow-y-auto h-[calc(100vh-64px)] pb-20">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link 
                key={link.name} 
                to={link.path} 
                onClick={() => setSidebarOpen(false)} 
                className={`flex items-center gap-4 px-4 py-3 rounded-r-full -ml-3 pl-7 transition-colors ${
                  active 
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900/40 dark:text-primary-300 font-medium' 
                    : 'text-muted hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-content'
                }`}
              >
                <Icon size={20} className={active ? 'text-primary-600 dark:text-primary-400' : 'text-muted'} />
                <span>{link.name}</span>
              </Link>
            )
          })}

          <div className="pt-4 mt-4 border-t border-border">
            <button 
              onClick={logout} 
              className="w-full flex items-center gap-4 px-4 py-3 rounded-r-full -ml-3 pl-7 text-muted hover:bg-gray-100 dark:hover:bg-slate-700/50 hover:text-red-500 transition-colors"
            >
              <LogOut size={20} />
              <span>Sign out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 mt-16 overflow-y-auto bg-base transition-colors duration-300">
        <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
