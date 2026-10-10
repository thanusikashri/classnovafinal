import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, Home, User, BookOpen, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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
