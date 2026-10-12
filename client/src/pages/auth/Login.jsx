import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { BookOpen, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      navigate(`/${user.role}-dashboard`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans transition-colors duration-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center items-center text-primary-500 mb-4">
          <BookOpen size={40} className="text-primary-500" />
          <span className="ml-3 text-3xl font-medium text-content tracking-tight">ClassNova</span>
        </div>
        <h2 className="mt-2 text-center text-2xl text-content font-medium">
          Sign in
        </h2>
        <p className="mt-2 text-center text-base text-muted">
          to continue to ClassNova
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-[450px]">
        <div className="card-surface py-10 px-6 sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200 flex items-center gap-2">
                <svg className="h-5 w-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
            
            <div>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type="email"
                  required
                  placeholder="Email or phone"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-content focus:outline-none"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between mt-8">
              <div className="text-sm">
                <Link to="/register" className="font-medium text-primary-600 hover:text-primary-700 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 px-1 py-1 -ml-1">
                  Create account
                </Link>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary"
              >
                {loading ? 'Signing in...' : 'Next'}
              </button>
            </div>
          </form>

          {/* Test Accounts Selection */}
          <div className="mt-8 pt-6 border-t border-border">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted text-center mb-3">
              Quick Sign-In Test Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEmail('student@demo.classnova.local');
                  setPassword('demo123');
                }}
                className="px-2 py-2 text-xs rounded border border-border hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-content text-center transition-colors"
              >
                <div className="font-medium">Student</div>
                <div className="text-[10px] text-muted truncate">Alex Johnson</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('teacher@demo.classnova.local');
                  setPassword('demo123');
                }}
                className="px-2 py-2 text-xs rounded border border-border hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-content text-center transition-colors"
              >
                <div className="font-medium">Professor</div>
                <div className="text-[10px] text-muted truncate">Dr. Williams</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('admin@demo.classnova.local');
                  setPassword('demo123');
                }}
                className="px-2 py-2 text-xs rounded border border-border hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-content text-center transition-colors"
              >
                <div className="font-medium">Administrator</div>
                <div className="text-[10px] text-muted truncate">System</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
