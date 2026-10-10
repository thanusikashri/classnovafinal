import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import MainLayout from './components/layout/MainLayout';
import Profile from './pages/profile/Profile';
import AdminUsers from './pages/admin/AdminUsers';
import TeacherDashboard from './pages/dashboard/TeacherDashboard';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import ClassDetails from './pages/class/ClassDetails';
import AssignmentDetails from './pages/class/AssignmentDetails';
import QuizBuilder from './pages/class/QuizBuilder';
import QuizTake from './pages/class/QuizTake';
import QuizDetails from './pages/class/QuizDetails';

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
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route index element={<DashboardRedirect />} />
              <Route path="student-dashboard" element={<ProtectedRoute roles={['student']}><StudentDashboard /></ProtectedRoute>} />
              <Route path="teacher-dashboard" element={<ProtectedRoute roles={['teacher']}><TeacherDashboard /></ProtectedRoute>} />
              <Route path="admin-dashboard" element={<ProtectedRoute roles={['admin']}><div>Admin Dashboard</div></ProtectedRoute>} />
              <Route path="admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
              <Route path="profile" element={<Profile />} />
              <Route path="classes/:id" element={<ClassDetails />} />
              <Route path="classes/:id/assignments/:assignmentId" element={<AssignmentDetails />} />
              <Route path="classes/:id/quizzes/create" element={<QuizBuilder />} />
              <Route path="classes/:id/quizzes/:quizId/edit" element={<QuizBuilder />} />
              <Route path="classes/:id/quizzes/:quizId/take" element={<QuizTake />} />
              <Route path="classes/:id/quizzes/:quizId" element={<QuizDetails />} />
              <Route path="classes" element={<div>Classes Page</div>} />
            </Route>
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
