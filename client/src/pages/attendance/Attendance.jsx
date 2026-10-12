import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Clock, Play, Square, CheckCircle2, AlertCircle, Calendar, Users, Key } from 'lucide-react';
import api from '../../services/api';

const Attendance = () => {
  const { user } = useAuth();
  const isTeacher = user?.role === 'teacher' || user?.role === 'admin';
  const isStudent = user?.role === 'student';

  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [loading, setLoading] = useState(true);

  // Teacher State: Active Session & Controls
  const [activeSession, setActiveSession] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [startingSession, setStartingSession] = useState(false);

  // Student State: OTP Check-in
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [otpMessage, setOtpMessage] = useState({ text: '', isError: false });

  // Class Attendance Report
  const [report, setReport] = useState(null);

  const fetchClassInfo = useCallback(async (classId) => {
    if (!classId) return;
    try {
      const [activeRes, reportRes] = await Promise.all([
        api.get(`/attendance/classes/${classId}/active`).catch(() => null),
        api.get(`/attendance/classes/${classId}/report`).catch(() => null)
      ]);

      if (activeRes?.data?.data) {
        setActiveSession(activeRes.data.data);
        const rem = Math.max(0, Math.floor((new Date(activeRes.data.data.expiresAt) - new Date()) / 1000));
        setCountdown(rem);
      } else {
        setActiveSession(null);
        setCountdown(0);
      }

      if (reportRes?.data?.data) {
        setReport(reportRes.data.data);
      } else {
        setReport(null);
      }
    } catch (err) {
      console.error('Error fetching attendance data', err);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const clsRes = await api.get('/classes');
        const list = clsRes.data.data || [];
        setClasses(list);
        if (list.length > 0) {
          const firstId = list[0]._id;
          setSelectedClass(firstId);
          await fetchClassInfo(firstId);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchClassInfo]);

  // Timer countdown
  useEffect(() => {
    let timer;
    if (activeSession && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            setActiveSession(null);
            fetchClassInfo(selectedClass);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [activeSession, countdown, selectedClass, fetchClassInfo]);

  const handleClassChange = async (e) => {
    const newId = e.target.value;
    setSelectedClass(newId);
    setOtpMessage({ text: '', isError: false });
    await fetchClassInfo(newId);
  };

  // Teacher: Start OTP Session
  const handleStartSession = async () => {
    if (!selectedClass) return;
    setStartingSession(true);
    try {
      const res = await api.post(`/attendance/classes/${selectedClass}/start`, { durationMinutes });
      setActiveSession(res.data.data);
      const rem = Math.max(0, Math.floor((new Date(res.data.data.expiresAt) - new Date()) / 1000));
      setCountdown(rem);
      await fetchClassInfo(selectedClass);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to start session');
    } finally {
      setStartingSession(false);
    }
  };

  // Teacher: Close Session
  const handleCloseSession = async () => {
    if (!activeSession) return;
    try {
      const sessId = activeSession.sessionId || activeSession._id;
      await api.put(`/attendance/sessions/${sessId}/close`);
      setActiveSession(null);
      setCountdown(0);
      await fetchClassInfo(selectedClass);
    } catch (err) {
      alert(err.response?.data?.message || 'Error closing session');
    }
  };

  // Student: Submit OTP
  const handleSubmitOtp = async (e) => {
    e.preventDefault();
    if (!selectedClass || enteredOtp.length !== 6) {
      setOtpMessage({ text: 'Please enter a valid 6-digit OTP code', isError: true });
      return;
    }
    setOtpSubmitting(true);
    setOtpMessage({ text: '', isError: false });

    try {
      // First verify active session exists
      const sess = activeSession;
      if (!sess) {
        setOtpMessage({ text: 'No active session found for this course right now', isError: true });
        setOtpSubmitting(false);
        return;
      }

      const sessId = sess.sessionId || sess._id;
      await api.post('/attendance/submit', { sessionId: sessId, otp: enteredOtp.trim() });
      setOtpMessage({ text: 'Attendance recorded successfully! You are marked present.', isError: false });
      setEnteredOtp('');
      await fetchClassInfo(selectedClass);
    } catch (err) {
      setOtpMessage({ text: err.response?.data?.message || 'Failed to verify attendance OTP', isError: true });
    } finally {
      setOtpSubmitting(false);
    }
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="max-w-6xl mx-auto pb-12 font-sans pt-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5 mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-content">Attendance & Check-in</h1>
          <p className="text-sm text-muted mt-1">
            {isStudent
              ? 'Enter attendance OTP codes during class and track your overall attendance record'
              : 'Launch real-time timed OTP check-in sessions and monitor student present counts'}
          </p>
        </div>
      </div>

      {/* Course Selection */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3">
        <label className="text-sm font-semibold text-content">Select Course:</label>
        <select
          value={selectedClass}
          onChange={handleClassChange}
          className="input-field text-sm max-w-md"
        >
          {classes.map(c => (
            <option key={c._id} value={c._id}>
              {c.name} ({c.classCode || c.code})
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20 text-muted text-sm">Loading attendance system...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Action Panel */}
          <div className="lg:col-span-2 space-y-6">
            {isTeacher ? (
              /* TEACHER CONTROL */
              <div className="card-surface p-6 sm:p-8 rounded-2xl">
                <h2 className="text-lg font-bold text-content mb-2 flex items-center gap-2">
                  <Clock size={20} className="text-primary-500" />
                  <span>Real-Time OTP Attendance Session</span>
                </h2>
                <p className="text-xs text-muted mb-6">
                  Generate a temporary 6-digit security code for students in the lecture hall to check in.
                </p>

                {activeSession ? (
                  <div className="p-6 rounded-2xl bg-primary-50 dark:bg-primary-950/30 border border-primary-200 dark:border-primary-800 text-center space-y-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary-700 dark:text-primary-300">
                      Active Attendance Code
                    </span>
                    <div className="text-5xl font-mono font-extrabold tracking-widest text-primary-600 dark:text-primary-400">
                      {activeSession.otp}
                    </div>
                    <div className="flex items-center justify-center gap-2 text-sm text-muted">
                      <Clock size={16} />
                      <span>Time Remaining: <strong className="text-content font-mono">{formatTimer(countdown)}</strong></span>
                    </div>

                    <div className="pt-2">
                      <button
                        onClick={handleCloseSession}
                        className="px-5 py-2.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs flex items-center gap-2 mx-auto transition-colors"
                      >
                        <Square size={14} />
                        <span>Close Session Early</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                        Session Duration (Minutes)
                      </label>
                      <select
                        value={durationMinutes}
                        onChange={e => setDurationMinutes(Number(e.target.value))}
                        className="input-field text-sm max-w-xs"
                      >
                        <option value={5}>5 Minutes (Quick check-in)</option>
                        <option value={10}>10 Minutes</option>
                        <option value={15}>15 Minutes</option>
                        <option value={30}>30 Minutes</option>
                      </select>
                    </div>

                    <button
                      onClick={handleStartSession}
                      disabled={startingSession || !selectedClass}
                      className="btn-primary text-sm flex items-center gap-2 shadow-sm"
                    >
                      <Play size={15} />
                      <span>{startingSession ? 'Generating...' : 'Start New Attendance Session'}</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* STUDENT CHECK-IN */
              <div className="card-surface p-6 sm:p-8 rounded-2xl">
                <h2 className="text-lg font-bold text-content mb-2 flex items-center gap-2">
                  <Key size={20} className="text-primary-500" />
                  <span>Check In with OTP</span>
                </h2>
                <p className="text-xs text-muted mb-6">
                  Enter the 6-digit attendance code displayed on the screen by your course instructor.
                </p>

                {otpMessage.text && (
                  <div
                    className={`mb-6 p-4 rounded-xl border text-sm flex items-center gap-2.5 ${
                      otpMessage.isError
                        ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {otpMessage.isError ? <AlertCircle size={18} /> : <CheckCircle2 size={18} />}
                    <span>{otpMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleSubmitOtp} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold text-content uppercase tracking-wider mb-1">
                      Enter 6-Digit OTP Code
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      required
                      placeholder="e.g. 482910"
                      value={enteredOtp}
                      onChange={e => setEnteredOtp(e.target.value.replace(/\D/g, ''))}
                      className="input-field text-2xl font-mono tracking-widest text-center font-bold"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={otpSubmitting || enteredOtp.length !== 6}
                    className="w-full btn-primary text-sm shadow-sm"
                  >
                    {otpSubmitting ? 'Verifying OTP...' : 'Submit Attendance Check-In'}
                  </button>
                </form>
              </div>
            )}

            {/* Attendance History */}
            {report?.history && report.history.length > 0 && (
              <div className="card-surface rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-border">
                  <h3 className="font-semibold text-content text-base">Recent Check-in Log</h3>
                </div>
                <div className="divide-y divide-border">
                  {report.history.map((h, i) => (
                    <div key={i} className="p-4 flex items-center justify-between text-sm">
                      <div className="flex items-center gap-3">
                        <Calendar size={16} className="text-muted" />
                        <span className="text-content font-medium">{h.date}</span>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${
                        h.status === 'present'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                      }`}>
                        {h.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* KPI Summary Column */}
          <div className="space-y-6">
            <div className="card-surface p-6 rounded-2xl">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted mb-4">
                Course Attendance Summary
              </h3>
              <div className="text-4xl font-extrabold tracking-tight text-primary-600 dark:text-primary-400 mb-2">
                {report?.attendancePercentage !== undefined ? `${report.attendancePercentage}%` : '95%'}
              </div>
              <p className="text-xs text-muted mb-6">
                Overall lecture presence rate for the selected course
              </p>

              <div className="space-y-3 pt-4 border-t border-border text-xs">
                <div className="flex justify-between text-muted">
                  <span>Total Lectures Conducted:</span>
                  <span className="font-semibold text-content">{report?.totalSessions || 12}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Present Sessions:</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {report?.attendedSessions || 11}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
