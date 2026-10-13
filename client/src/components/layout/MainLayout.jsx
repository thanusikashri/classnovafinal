import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Menu,
  X,
  Home,
  User,
  BookOpen,
  Settings,
  LogOut,
  Sun,
  Moon,
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  FileText,
  Calendar,
  Clock,
  Sparkles,
  ClipboardList,
  Users,
  FileCheck,
  Megaphone,
  BarChart3,
  Shield,
  GraduationCap,
  UploadCloud
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import api from '../../services/api';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Desktop sidebar: true = expanded (w-64), false = collapsed icon rail (w-20)
  const [sidebarExpanded, setSidebarExpanded] = useState(true);
  // Mobile drawer: true = drawer open
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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
      const interval = setInterval(fetchUnreadCount, 30000);
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

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

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

  // Role-specific Sidebar Menus
  const getRoleNavLinks = () => {
    const role = user?.role;

    if (role === 'student') {
      return [
        { name: 'Dashboard', path: '/student-dashboard', icon: Home },
        { name: 'My Classes', path: '/classes', icon: BookOpen },
        { name: 'Quizzes', path: '/quizzes', icon: HelpCircle },
        { name: 'Assignments', path: '/assignments', icon: FileText },
        { name: 'Leave Requests', path: '/leave-requests', icon: Calendar },
        { name: 'Attendance', path: '/attendance', icon: Clock },
        { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];
    }

    if (role === 'teacher') {
      return [
        { name: 'Dashboard', path: '/teacher-dashboard', icon: Home },
        { name: 'My Classes', path: '/classes', icon: BookOpen },
        { name: 'Students', path: '/teacher/students', icon: Users },
        { name: 'Quiz Generator', path: '/quiz-generator', icon: Sparkles },
        { name: 'Quiz Management', path: '/quiz-management', icon: ClipboardList },
        { name: 'Assignments', path: '/assignments', icon: FileText },
        { name: 'Assignment Submissions', path: '/teacher/assignment-submissions', icon: UploadCloud },
        { name: 'Leave Requests', path: '/leave-requests', icon: Calendar },
        { name: 'Attendance', path: '/attendance', icon: Clock },
        { name: 'Materials', path: '/materials', icon: FileCheck },
        { name: 'Announcements', path: '/announcements', icon: Megaphone },
        { name: 'Notifications', path: '/notifications', icon: Bell, badge: unreadCount },
        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];
    }

    if (role === 'admin') {
      return [
        { name: 'Dashboard', path: '/admin-dashboard', icon: Home },
        { name: 'User Management', path: '/admin/users', icon: Users },
        { name: 'Course Management', path: '/admin/courses', icon: BookOpen },
        { name: 'Student Management', path: '/admin/students', icon: GraduationCap },
        { name: 'Teacher Management', path: '/admin/teachers', icon: Shield },
        { name: 'Quiz and Assignment Oversight', path: '/admin/assessments', icon: ClipboardList },
        { name: 'Announcements', path: '/announcements', icon: Megaphone },
        { name: 'Reports and Analytics', path: '/admin/reports', icon: BarChart3 },
        { name: 'Profile', path: '/profile', icon: User },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];
    }

    return [
      { name: 'Dashboard', path: '/', icon: Home },
      { name: 'Profile', path: '/profile', icon: User }
    ];
  };

  const navLinks = getRoleNavLinks();

  const isActive = (path) => {
    if (location.pathname === path) return true;
    if (path !== '/' && path !== `/${user?.role}-dashboard` && location.pathname.startsWith(path)) {
      return true;
    }
    return false;
  };

  return (
    <div className="flex h-screen bg-base font-sans text-content transition-colors duration-300 overflow-hidden">
      {/* Top Navbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-surface border-b border-border flex items-center justify-between px-4 sm:px-6 z-30 transition-colors duration-300">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileDrawerOpen(prev => !prev)}
            className="md:hidden p-2 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Toggle mobile navigation"
          >
            {mobileDrawerOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          {/* Desktop collapse / expand button */}
          <button
            onClick={() => setSidebarExpanded(prev => !prev)}
            className="hidden md:flex p-2 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
            title={sidebarExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <Menu size={20} />
          </button>

          <Link to={`/${user?.role}-dashboard`} className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
              <BookOpen size={20} />
            </div>
            <span className="text-xl text-content tracking-tight font-bold">ClassNova</span>
          </Link>
        </div>

        {/* Topbar Right Profile & Quick Actions */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Role badge */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-base border border-border text-xs">
            <span className="text-muted">Role:</span>
            <span className="font-semibold capitalize text-primary-600 dark:text-primary-400">
              {user?.role || 'Guest'}
            </span>
          </div>

          {/* Dark / Light Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full text-muted hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Toggle Theme"
          >
            {theme === 'dark' ? <Sun size={19} className="text-amber-400" /> : <Moon size={19} className="text-indigo-600" />}
          </button>

          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full text-muted hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 transition-colors relative focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Notifications"
            >
              <Bell size={19} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-surface border border-border rounded-2xl shadow-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="p-3.5 border-b border-border flex justify-between items-center bg-base/50">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-content text-sm">Notifications</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary-100 text-primary-700 dark:bg-primary-900/60 dark:text-primary-300">
                        {unreadCount} unread
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-xs text-primary-600 dark:text-primary-400 hover:underline font-medium"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-border">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-sm text-muted">No notifications right now</div>
                  ) : (
                    notifications.map(notif => (
                      <div
                        key={notif._id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-3.5 hover:bg-blue-50/60 dark:hover:bg-blue-950/30 cursor-pointer transition-colors ${
                          !notif.isRead ? 'bg-primary-50/50 dark:bg-primary-950/20' : ''
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <p className={`text-xs ${!notif.isRead ? 'font-bold text-content' : 'font-medium text-muted'}`}>
                              {notif.title}
                            </p>
                            <p className="text-xs text-muted mt-0.5 line-clamp-2 leading-relaxed">{notif.message}</p>
                            <p className="text-[10px] text-muted mt-1 font-mono">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
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

                <div className="p-2 border-t border-border bg-base/30 text-center">
                  <Link
                    to="/notifications"
                    onClick={() => setShowNotifications(false)}
                    className="text-xs text-primary-600 dark:text-primary-400 font-semibold hover:underline block py-1"
                  >
                    View all notifications
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Name & Avatar */}
          <Link to="/profile" className="flex items-center gap-2 pl-2 border-l border-border hover:opacity-80 transition-opacity">
            <div className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center font-bold text-sm shadow-xs select-none">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="hidden lg:block text-left">
              <span className="text-xs font-bold text-content block line-clamp-1">{user?.name || 'User'}</span>
              <span className="text-[10px] text-muted capitalize block leading-tight">{user?.role || 'User'}</span>
            </div>
          </Link>
        </div>
      </header>

      {/* =========================================================================
          DESKTOP SIDEBAR (Static flex child, NEVER covers content with grey overlay)
          ========================================================================= */}
      <aside
        className={`hidden md:flex flex-col mt-16 bg-surface border-r border-border shrink-0 transition-all duration-300 ease-in-out select-none z-20 ${
          sidebarExpanded ? 'w-64' : 'w-20'
        }`}
      >
        {/* User Card when expanded */}
        <div className={`p-4 border-b border-border transition-opacity duration-200 ${sidebarExpanded ? 'opacity-100' : 'hidden'}`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-sm shadow-xs shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-content truncate">{user?.name || 'ClassNova User'}</h4>
              <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/40">
                {user?.role} Portal
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Nav Links */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);

            return (
              <Link
                key={link.name}
                to={link.path}
                title={!sidebarExpanded ? link.name : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-all group relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white font-semibold shadow-xs'
                    : 'text-[#374151] dark:text-slate-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300'
                } ${!sidebarExpanded ? 'justify-center' : ''}`}
              >
                <Icon
                  size={20}
                  className={`shrink-0 transition-colors ${
                    active ? 'text-white' : 'text-[#4B5563] dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300'
                  }`}
                />

                {sidebarExpanded && (
                  <span className="truncate flex-1 text-left">{link.name}</span>
                )}

                {sidebarExpanded && link.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white shrink-0">
                    {link.badge > 9 ? '9+' : link.badge}
                  </span>
                )}

                {/* Tooltip for collapsed mode */}
                {!sidebarExpanded && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 font-sans font-normal">
                    {link.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Sign Out & Collapse Footer */}
        <div className="p-3 border-t border-border space-y-1">
          <button
            onClick={logout}
            title={!sidebarExpanded ? 'Sign Out' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm text-muted hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 transition-colors group relative ${
              !sidebarExpanded ? 'justify-center' : ''
            }`}
          >
            <LogOut size={20} className="shrink-0 text-muted group-hover:text-rose-600" />
            {sidebarExpanded && <span>Sign Out</span>}
            {!sidebarExpanded && (
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 font-sans font-normal">
                Sign Out
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* =========================================================================
          MOBILE DRAWER (Overlay ONLY on mobile screens < 768px)
          ========================================================================= */}
      {mobileDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      <aside
        className={`md:hidden fixed top-0 left-0 bottom-0 w-72 bg-surface z-50 transform transition-transform duration-300 ease-in-out border-r border-border flex flex-col ${
          mobileDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-4 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
              <BookOpen size={20} />
            </div>
            <span className="text-xl text-content tracking-tight font-bold">ClassNova</span>
          </div>
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1.5 rounded-full hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 text-muted transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User preview */}
        <div className="p-4 border-b border-border bg-base/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <h4 className="text-sm font-bold text-content truncate">{user?.name}</h4>
              <span className="text-xs text-muted capitalize font-medium">{user?.role} Portal</span>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);

            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setMobileDrawerOpen(false)}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                  active
                    ? 'bg-blue-600 text-white dark:bg-blue-600 dark:text-white font-semibold shadow-xs'
                    : 'text-[#374151] dark:text-slate-400 hover:bg-blue-50 hover:text-blue-700 dark:hover:bg-blue-950/40 dark:hover:text-blue-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={19}
                    className={`shrink-0 transition-colors ${
                      active ? 'text-white' : 'text-[#4B5563] dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-300'
                    }`}
                  />
                  <span>{link.name}</span>
                </div>
                {link.badge > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-red-500 text-white">
                    {link.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Mobile Sign out */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => {
              setMobileDrawerOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm text-muted hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 transition-colors"
          >
            <LogOut size={19} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 mt-16 overflow-y-auto bg-base transition-colors duration-300">
        <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
