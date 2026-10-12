import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { Settings as SettingsIcon, Bell, Moon, Sun, Shield, Lock, CheckCircle2 } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [inAppAlerts, setInAppAlerts] = useState(true);
  const [compactView, setCompactView] = useState(false);
  const [savedMessage, setSavedMessage] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto pb-12 font-sans pt-2">
      <div className="flex items-center gap-3 border-b border-border pb-5 mb-8">
        <div className="p-2.5 rounded-xl bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400">
          <SettingsIcon size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Account & Preferences</h1>
          <p className="text-sm text-muted mt-0.5">Customize interface appearance, notifications, and security settings</p>
        </div>
      </div>

      {savedMessage && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2.5 text-sm">
          <CheckCircle2 size={18} />
          <span>Settings saved successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance Section */}
        <div className="card-surface p-6 rounded-2xl">
          <h2 className="text-base font-semibold text-content mb-4 flex items-center gap-2">
            <span>Appearance & Theme</span>
          </h2>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <div className="text-sm font-medium text-content">Color Theme</div>
              <div className="text-xs text-muted mt-0.5">Switch between dark slate mode and clean light theme</div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-base text-content hover:bg-gray-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-600" />}
              <span>{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-content">Compact Layout</div>
              <div className="text-xs text-muted mt-0.5">Reduce padding and spacing across tables and lists</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={compactView}
                onChange={e => setCompactView(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="card-surface p-6 rounded-2xl">
          <h2 className="text-base font-semibold text-content mb-4 flex items-center gap-2">
            <Bell size={18} className="text-primary-500" />
            <span>Notification Preferences</span>
          </h2>
          <div className="flex items-center justify-between py-3 border-b border-border">
            <div>
              <div className="text-sm font-medium text-content">In-App Live Alerts</div>
              <div className="text-xs text-muted mt-0.5">Receive instant popups for assignments, quizzes, and leave decisions</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={inAppAlerts}
                onChange={e => setInAppAlerts(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <div className="text-sm font-medium text-content">Email Digest</div>
              <div className="text-xs text-muted mt-0.5">Send a summary of upcoming deadlines and attendance reports to {user?.email}</div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={e => setEmailNotifications(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>

        {/* Account Info Section */}
        <div className="card-surface p-6 rounded-2xl">
          <h2 className="text-base font-semibold text-content mb-4 flex items-center gap-2">
            <Shield size={18} className="text-emerald-500" />
            <span>Security & Role Info</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="p-3.5 rounded-xl bg-base border border-border">
              <span className="text-xs text-muted block mb-1">User Identifier</span>
              <span className="font-mono text-content text-xs">{user?._id || 'demo-user'}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-base border border-border">
              <span className="text-xs text-muted block mb-1">Assigned System Role</span>
              <span className="capitalize font-medium text-primary-600 dark:text-primary-400">{user?.role || 'student'}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
