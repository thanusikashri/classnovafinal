import React, { useState } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Menu, LogOut, Home, User, BookOpen, Settings, Bell } from 'lucide-react';

const MainLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const getNavLinks = () => {
    const base = [
      { name: 'Dashboard', path: `/${user?.role}-dashboard`, icon: Home },
      { name: 'Classes', path: '/classes', icon: BookOpen },
      { name: 'Profile', path: '/profile', icon: User },
    ];
    if (user?.role === 'admin') {
      base.push({ name: 'User Management', path: '/admin/users', icon: Settings });
    }
    return base;
  };

  const navLinks = getNavLinks();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar (Desktop) */}
      <aside className="hidden md:flex flex-col w-64 bg-white shadow-lg z-10">
        <div className="flex items-center justify-center h-16 border-b border-gray-100">
          <span className="text-xl font-bold text-primary-600">Smart Classroom</span>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.name} to={link.path} className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-primary-50 hover:text-primary-600 transition-colors">
                <Icon size={20} />
                <span className="font-medium">{link.name}</span>
              </Link>
            )
          })}
        </nav>
        <div className="p-4 border-t border-gray-100">
          <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 text-red-600 rounded-xl hover:bg-red-50 transition-colors">
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200">
          <div className="flex items-center md:hidden">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700">
              <Menu size={24} />
            </button>
          </div>
          <div className="flex-1 px-4 flex justify-end items-center gap-4">
            <button className="relative p-2 text-gray-400 hover:text-primary-600 transition-colors">
              <Bell size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex flex-col text-right hidden sm:flex">
                <span className="text-sm font-semibold text-gray-900">{user?.name}</span>
                <span className="text-xs text-gray-500 capitalize">{user?.role}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
          <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white h-full">
            <div className="flex items-center justify-center h-16 border-b border-gray-100">
              <span className="text-xl font-bold text-primary-600">Smart Classroom</span>
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
              {navLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <Link key={link.name} to={link.path} onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-4 py-3 text-gray-700 rounded-xl hover:bg-primary-50 hover:text-primary-600 transition-colors">
                    <Icon size={20} />
                    <span className="font-medium">{link.name}</span>
                  </Link>
                )
              })}
            </nav>
            <div className="p-4 border-t border-gray-100">
              <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 text-red-600 rounded-xl hover:bg-red-50 transition-colors">
                <LogOut size={20} />
                <span className="font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainLayout;
