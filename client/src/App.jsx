import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import MainLayout from './components/layout/MainLayout';
import Profile from './pages/profile/Profile';
import Settings from './pages/settings/Settings';
import Classes from './pages/class/Classes';
import ClassDetails from './pages/class/ClassDetails';
import AssignmentDetails from './pages/class/AssignmentDetails';
import Assignments from './pages/assignment/Assignments';
import QuizBuilder from './pages/class/QuizBuilder';
import QuizTake from './pages/class/QuizTake';
import QuizDetails from './pages/class/QuizDetails';
import Quizzes from './pages/quiz/Quizzes';
import QuizGenerator from './pages/quiz/QuizGenerator';
import QuizManagement from './pages/quiz/QuizManagement';
import LeaveRequests from './pages/leave/LeaveRequests';
import Attendance from './pages/attendance/Attendance';
import NotificationsPage from './pages/notification/NotificationsPage';
import TeacherStudents from './pages/class/TeacherStudents';
import MaterialsPage from './pages/material/MaterialsPage';
import AnnouncementsPage from './pages/announcement/AnnouncementsPage';

// Dashboards
import StudentDashboard from './pages/dashboard/StudentDashboard';
import TeacherDashboard from './pages/dashboard/TeacherDashboard';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import TeacherAssignmentSubmissions from './pages/teacher/TeacherAssignmentSubmissions';

// Admin specific pages
import AdminUsers from './pages/admin/AdminUsers';
import AdminCourses from './pages/admin/AdminCourses';
import AdminAssessments from './pages/admin/AdminAssessments';
import AdminReports from './pages/admin/AdminReports';

import NotFound from './pages/NotFound';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted text-sm font-sans">
        Loading ClassNova session...
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const DashboardRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={`/${user.role}-dashboard`} replace />;
};

const App = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Authenticated Application with Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardRedirect />} />

              {/* 1. Student Routes */}
              <Route
                path="student-dashboard"
                element={
                  <ProtectedRoute roles={['student']}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="quizzes"
                element={
                  <ProtectedRoute roles={['student', 'admin']}>
                    <Quizzes />
                  </ProtectedRoute>
                }
              />

              {/* 2. Teacher Routes */}
              <Route
                path="teacher-dashboard"
                element={
                  <ProtectedRoute roles={['teacher']}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="teacher/students"
                element={
                  <ProtectedRoute roles={['teacher', 'admin']}>
                    <TeacherStudents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="quiz-generator"
                element={
                  <ProtectedRoute roles={['teacher', 'admin']}>
                    <QuizGenerator />
                  </ProtectedRoute>
                }
              />
              <Route
                path="quiz-management"
                element={
                  <ProtectedRoute roles={['teacher', 'admin']}>
                    <QuizManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="materials"
                element={
                  <ProtectedRoute roles={['teacher', 'admin', 'student']}>
                    <MaterialsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="teacher/assignment-submissions"
                element={
                  <ProtectedRoute roles={['teacher', 'admin']}>
                    <TeacherAssignmentSubmissions />
                  </ProtectedRoute>
                }
              />

              {/* 3. Admin Routes */}
              <Route
                path="admin-dashboard"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/courses"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminCourses />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/students"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminUsers initialRole="student" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/teachers"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminUsers initialRole="teacher" />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/assessments"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminAssessments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/reports"
                element={
                  <ProtectedRoute roles={['admin']}>
                    <AdminReports />
                  </ProtectedRoute>
                }
              />

              {/* 4. Common & Course-Related Routes */}
              <Route path="classes" element={<Classes />} />
              <Route path="classes/:id" element={<ClassDetails />} />
              <Route path="classes/:id/assignments/:assignmentId" element={<AssignmentDetails />} />
              <Route path="classes/:id/quizzes/create" element={<QuizBuilder />} />
              <Route path="classes/:id/quizzes/:quizId/edit" element={<QuizBuilder />} />
              <Route path="classes/:id/quizzes/:quizId/take" element={<QuizTake />} />
              <Route path="classes/:id/quizzes/:quizId" element={<QuizDetails />} />
              <Route path="assignments" element={<Assignments />} />
              <Route path="leave-requests" element={<LeaveRequests />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />

              {/* 404 Catch-All inside layout */}
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* Top-level wildcard */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
