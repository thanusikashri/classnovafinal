import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import MainLayout from './components/layout/MainLayout';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
};

const DashboardRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <Navigate to={`/${user.role}-dashboard`} />;
};

const App = () => {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
            <Route index element={<DashboardRedirect />} />
            <Route path="student-dashboard" element={<div>Student Dashboard</div>} />
            <Route path="teacher-dashboard" element={<div>Teacher Dashboard</div>} />
            <Route path="admin-dashboard" element={<div>Admin Dashboard</div>} />
            <Route path="profile" element={<div>Profile</div>} />
            <Route path="classes" element={<div>Classes</div>} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
};

export default App;
