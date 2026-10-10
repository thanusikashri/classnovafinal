import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, Home, User, BookOpen, Settings, LogOut } from 'lucide-react';

const MainLayout = () => {
  const { user, logout } = useAuth();
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
    <div className="flex h-screen bg-white font-sans text-gray-800">
      {/* Topbar */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-300 flex items-center justify-between px-4 z-30">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)} 
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-200"
            aria-label="Toggle menu"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2">
            <BookOpen size={24} className="text-primary-600" />
            <span className="text-xl text-gray-700 tracking-tight">ClassNova</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Create/Join class placeholder if needed, usually handled on dashboard but we can keep it clean here */}
          <div className="w-9 h-9 rounded-full bg-primary-600 text-white flex items-center justify-center font-medium shadow-sm select-none cursor-pointer hover:bg-primary-700 transition-colors">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
        </div>
      </header>

      {/* Sidebar Overlay (Mobile & Desktop) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 w-72 bg-white z-50 transform transition-transform duration-300 ease-in-out border-r border-gray-200 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-16 flex items-center border-b border-gray-300 px-4">
          <button 
            onClick={() => setSidebarOpen(false)} 
            className="p-2 rounded-full hover:bg-gray-100 text-gray-600 transition-colors"
          >
            <Menu size={24} />
          </button>
          <div className="flex items-center gap-2 ml-4">
            <BookOpen size={24} className="text-primary-600" />
            <span className="text-xl text-gray-700 tracking-tight">ClassNova</span>
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
                    ? 'bg-primary-50 text-primary-700 font-medium' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Icon size={20} className={active ? 'text-primary-700' : 'text-gray-600'} />
                <span>{link.name}</span>
              </Link>
            )
          })}

          <div className="pt-4 mt-4 border-t border-gray-200">
            <button 
              onClick={logout} 
              className="w-full flex items-center gap-4 px-4 py-3 rounded-r-full -ml-3 pl-7 text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <LogOut size={20} className="text-gray-600" />
              <span>Sign out</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 mt-16 overflow-y-auto bg-white">
        <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default MainLayout;
