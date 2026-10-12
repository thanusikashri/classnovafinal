// In-memory isolated mock store for ClassNova
// Strictly separated from production MongoDB models.
// Used when DEMO_MODE=true in non-production environments.

const initialDemoData = () => {
  const users = [
    {
      _id: 'user-student-01',
      name: 'Alex Johnson',
      email: 'student@demo.classnova.local',
      role: 'student',
      isActive: true,
      createdAt: '2026-09-01T08:00:00.000Z'
    },
    {
      _id: 'user-teacher-01',
      name: 'Dr. Sarah Williams',
      email: 'teacher@demo.classnova.local',
      role: 'teacher',
      isActive: true,
      createdAt: '2026-08-15T08:00:00.000Z'
    },
    {
      _id: 'user-admin-01',
      name: 'System Administrator',
      email: 'admin@demo.classnova.local',
      role: 'admin',
      isActive: true,
      createdAt: '2026-08-01T08:00:00.000Z'
    }
  ];

  const classes = [
    {
      _id: 'class-cs101',
      name: 'CS101: Introduction to Artificial Intelligence',
      code: 'CS101-AI',
      classCode: 'CS101-AI',
      description: 'Foundations of intelligent agents, neural models, and modern machine learning concepts.',
      teacher: {
        _id: 'user-teacher-01',
        name: 'Dr. Sarah Williams',
        email: 'teacher@demo.classnova.local'
      },
      students: [
        {
          _id: 'user-student-01',
          name: 'Alex Johnson',
          email: 'student@demo.classnova.local'
        }
      ],
      createdAt: '2026-09-01T09:00:00.000Z'
    },
    {
      _id: 'class-se202',
      name: 'SE202: Cloud Architecture & DevOps',
      code: 'SE202-CLOUD',
      classCode: 'SE202-CLOUD',
      description: 'Distributed microservices, containerization, and automated CI/CD deployment pipelines.',
      teacher: {
        _id: 'user-teacher-01',
        name: 'Dr. Sarah Williams',
        email: 'teacher@demo.classnova.local'
      },
      students: [
        {
          _id: 'user-student-01',
          name: 'Alex Johnson',
          email: 'student@demo.classnova.local'
        }
      ],
      createdAt: '2026-09-05T10:00:00.000Z'
    }
  ];

  const announcements = [
    {
      _id: 'ann-01',
      classId: {
        _id: 'class-cs101',
        name: 'CS101: Introduction to Artificial Intelligence'
      },
      title: 'Welcome to CS101: Artificial Intelligence',
      content: 'Welcome students! Please review the syllabus and the first lecture notes in the study materials section.',
      author: {
        _id: 'user-teacher-01',
        name: 'Dr. Sarah Williams',
        role: 'teacher'
      },
      createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      _id: 'ann-02',
      classId: {
        _id: 'class-se202',
        name: 'SE202: Cloud Architecture & DevOps'
      },
      title: 'Upcoming Midterm Project Briefing',
      content: 'The architectural design document for Lab 3 is now published in the Study Materials section.',
      author: {
        _id: 'user-teacher-01',
        name: 'Dr. Sarah Williams',
        role: 'teacher'
      },
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ];

  const assignments = [
    {
      _id: 'asgn-01',
      classId: 'class-cs101',
      teacher: {
        _id: 'user-teacher-01',
        name: 'Dr. Sarah Williams',
        email: 'teacher@demo.classnova.local'
      },
      title: 'Assignment 1: Intelligent Search Algorithms',
      description: 'Implement A* search and evaluate heuristic performance on pathfinding grids. Include runtime benchmarks in your report.',
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
      maxMarks: 100,
      submissions: [],
      createdAt: new Date(Date.now() - 3600000 * 18).toISOString()
    },
    {
      _id: 'asgn-02',
      classId: 'class-se202',
      teacher: {
        _id: 'user-teacher-01',
        name: 'Dr. Sarah Williams',
        email: 'teacher@demo.classnova.local'
      },
      title: 'Lab 2: Microservices Docker Compose Setup',
      description: 'Build a containerized multi-tier web application with Redis cache and API gateway configuration.',
      dueDate: new Date(Date.now() + 86400000 * 8).toISOString(),
      maxMarks: 100,
      submissions: [],
      createdAt: new Date(Date.now() - 3600000 * 40).toISOString()
    }
  ];

  const materials = [
    {
      _id: 'mat-01',
      classId: 'class-cs101',
      title: 'Lecture 1: Foundations of Intelligent Agents',
      description: 'Overview lecture notes explaining agent environments, percepts, and decision algorithms.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'Lecture_1_AI_Foundations.pdf',
      fileType: 'application/pdf',
      teacher: {
        _id: 'user-teacher-01',
        name: 'Dr. Sarah Williams',
        email: 'teacher@demo.classnova.local'
      },
      createdAt: new Date(Date.now() - 3600000 * 48).toISOString()
    },
    {
      _id: 'mat-02',
      classId: 'class-se202',
      title: 'Lab 2: Microservices Architecture Blueprint',
      description: 'System design guidelines for containerized services and API gateways.',
      fileUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: 'Lab_2_Architecture_Guide.pdf',
      fileType: 'application/pdf',
      teacher: {
        _id: 'user-teacher-01',
        name: 'Dr. Sarah Williams',
        email: 'teacher@demo.classnova.local'
      },
      createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
    }
  ];

  const attendanceSessions = [
    {
      _id: 'session-01',
      classId: 'class-cs101',
      teacherId: 'user-teacher-01',
      otp: '482910',
      status: 'active',
      durationMinutes: 15,
      createdAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
      expiresAt: new Date(Date.now() + 1000 * 60 * 12).toISOString()
    }
  ];

  const attendanceRecords = [
    {
      _id: 'att-rec-01',
      sessionId: 'session-01',
      studentId: 'user-student-01',
      status: 'present',
      timestamp: new Date().toISOString()
    }
  ];

  const leaveApplications = [
    {
      _id: 'leave-01',
      classId: {
        _id: 'class-cs101',
        name: 'CS101: Introduction to Artificial Intelligence'
      },
      student: {
        _id: 'user-student-01',
        name: 'Alex Johnson',
        email: 'student@demo.classnova.local'
      },
      reason: 'Attending National Student AI Hackathon competition representing the university.',
      startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      status: 'pending',
      teacherComment: '',
      createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
    }
  ];

  const notifications = [
    {
      _id: 'notif-01',
      recipient: 'user-student-01',
      title: 'Class Update',
      message: 'CS101 announcements and course materials are now accessible on your dashboard.',
      type: 'general',
      link: '/classes/class-cs101',
      isRead: false,
      createdAt: new Date().toISOString()
    },
    {
      _id: 'notif-02',
      recipient: 'user-student-01',
      title: 'Active Attendance Session',
      message: 'CS101 Attendance session is live. Use the OTP displayed by your instructor to check in.',
      type: 'attendance',
      link: '/classes/class-cs101',
      isRead: false,
      createdAt: new Date(Date.now() - 1000 * 180).toISOString()
    },
    {
      _id: 'notif-03',
      recipient: 'user-teacher-01',
      title: 'Pending Leave Request',
      message: 'Alex Johnson submitted a leave application for CS101.',
      type: 'leave',
      link: '/teacher-dashboard',
      isRead: false,
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString()
    }
  ];

  return {
    users,
    classes,
    announcements,
    assignments,
    materials,
    attendanceSessions,
    attendanceRecords,
    leaveApplications,
    notifications
  };
};

class DemoStore {
  constructor() {
    this.reset();
  }

  reset() {
    this.data = initialDemoData();
  }

  getUsers() { return this.data.users; }
  getUserById(id) { return this.data.users.find(u => u._id === id); }
  getUserByEmail(email) { return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()); }

  getClasses(userId, role) {
    if (role === 'admin') return this.data.classes;
    if (role === 'teacher') return this.data.classes.filter(c => c.teacher && (c.teacher._id === userId || c.teacher === userId));
    // For students, return all available teacher-created classes across the platform so all courses are visible
    return this.data.classes;
  }

  getClassById(id) {
    return this.data.classes.find(c => c._id === id);
  }

  enrollStudent(classId, studentId) {
    const cls = this.getClassById(classId);
    if (!cls) return null;
    const student = this.getUserById(studentId);
    if (!student) return null;
    if (!cls.students.some(s => s._id === studentId)) {
      cls.students.push(student);
    }
    return cls;
  }

  createClass(classData, teacher) {
    const code = classData.code || classData.classCode || `CLASS-${Math.floor(1000 + Math.random() * 9000)}`;
    const newClass = {
      _id: `class-${Date.now()}`,
      name: classData.name,
      code,
      classCode: code,
      description: classData.description || '',
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email
      },
      students: [],
      createdAt: new Date().toISOString()
    };
    this.data.classes.push(newClass);
    return newClass;
  }

  // --- ANNOUNCEMENTS ---
  getAnnouncements(classId) {
    if (!classId) return this.data.announcements;
    return this.data.announcements.filter(a => {
      const cId = typeof a.classId === 'object' ? a.classId._id : a.classId;
      return cId === classId;
    });
  }

  createAnnouncement(classId, content, title, author) {
    const cls = this.getClassById(classId);
    const ann = {
      _id: `ann-${Date.now()}`,
      classId: cls ? { _id: cls._id, name: cls.name } : classId,
      title: title || (content ? content.substring(0, 50) : 'Class Announcement'),
      content: content || title,
      author: { 
        _id: author._id, 
        name: author.name,
        role: author.role || 'teacher'
      },
      createdAt: new Date().toISOString()
    };
    this.data.announcements.unshift(ann);

    // Create notification for enrolled students
    if (cls && cls.students) {
      cls.students.forEach(student => {
        const studentId = typeof student === 'object' ? student._id : student;
        this.data.notifications.unshift({
          _id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          recipient: studentId,
          title: `Announcement: ${cls.name}`,
          message: ann.content.substring(0, 100),
          type: 'announcement',
          link: `/classes/${cls._id}`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      });
    }

    return ann;
  }

  // --- ASSIGNMENTS ---
  getAssignments(classId) {
    if (!classId) return this.data.assignments;
    return this.data.assignments.filter(a => a.classId === classId);
  }

  getAssignmentById(id) {
    return this.data.assignments.find(a => a._id === id);
  }

  createAssignment(classId, assignmentData, teacher) {
    const cls = this.getClassById(classId);
    const newAssignment = {
      _id: `asgn-${Date.now()}`,
      classId,
      title: assignmentData.title,
      description: assignmentData.description || '',
      dueDate: assignmentData.dueDate || new Date(Date.now() + 86400000 * 7).toISOString(),
      maxMarks: Number(assignmentData.maxMarks) || 100,
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email
      },
      submissions: [],
      createdAt: new Date().toISOString()
    };
    this.data.assignments.unshift(newAssignment);

    // Notify enrolled students
    if (cls && cls.students) {
      cls.students.forEach(student => {
        const studentId = typeof student === 'object' ? student._id : student;
        this.data.notifications.unshift({
          _id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          recipient: studentId,
          title: `New Assignment in ${cls.name}`,
          message: `${newAssignment.title} (Due: ${new Date(newAssignment.dueDate).toLocaleDateString()})`,
          type: 'assignment',
          link: `/classes/${cls._id}/assignments/${newAssignment._id}`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      });
    }

    return newAssignment;
  }

  // --- STUDY MATERIALS ---
  getMaterials(classId) {
    if (!classId) return this.data.materials;
    return this.data.materials.filter(m => m.classId === classId);
  }

  getMaterialById(id) {
    return this.data.materials.find(m => m._id === id);
  }

  createMaterial(classId, title, description, teacher, fileInfo = {}) {
    const newMat = {
      _id: `mat-${Date.now()}`,
      classId,
      title,
      description: description || '',
      fileUrl: fileInfo.fileUrl || 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
      fileName: fileInfo.fileName || `${title.replace(/\s+/g, '_')}.pdf`,
      fileType: fileInfo.fileType || 'application/pdf',
      teacher: {
        _id: teacher._id,
        name: teacher.name,
        email: teacher.email
      },
      createdAt: new Date().toISOString()
    };
    this.data.materials.unshift(newMat);
    return newMat;
  }

  updateMaterial(id, updates) {
    const mat = this.data.materials.find(m => m._id === id);
    if (!mat) return null;
    if (updates.title) mat.title = updates.title;
    if (updates.description !== undefined) mat.description = updates.description;
    if (updates.fileName) mat.fileName = updates.fileName;
    if (updates.fileUrl) mat.fileUrl = updates.fileUrl;
    if (updates.fileType) mat.fileType = updates.fileType;
    return mat;
  }

  deleteMaterial(id) {
    const idx = this.data.materials.findIndex(m => m._id === id);
    if (idx !== -1) {
      this.data.materials.splice(idx, 1);
      return true;
    }
    return false;
  }

  // --- ATTENDANCE ---
  getActiveAttendanceSession(classId) {
    const now = new Date();
    return this.data.attendanceSessions.find(s => 
      s.classId === classId && 
      s.status === 'active' && 
      new Date(s.expiresAt) > now
    );
  }

  startAttendanceSession(classId, teacherId, durationMinutes = 15) {
    this.data.attendanceSessions.forEach(s => {
      if (s.classId === classId && s.status === 'active') {
        s.status = 'closed';
      }
    });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

    const session = {
      _id: `session-${Date.now()}`,
      classId,
      teacherId,
      otp,
      status: 'active',
      durationMinutes,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };
    this.data.attendanceSessions.unshift(session);
    return session;
  }

  closeAttendanceSession(sessionId) {
    const s = this.data.attendanceSessions.find(sess => sess._id === sessionId);
    if (s) {
      s.status = 'closed';
      return s;
    }
    return null;
  }

  submitAttendance(sessionId, studentId, submittedOtp) {
    const session = this.data.attendanceSessions.find(s => s._id === sessionId);
    if (!session) {
      return { success: false, message: 'Session not found or expired' };
    }
    if (session.status !== 'active' || new Date(session.expiresAt) < new Date()) {
      return { success: false, message: 'Attendance session has expired' };
    }
    if (session.otp !== submittedOtp) {
      return { success: false, message: 'Invalid OTP code entered' };
    }
    const alreadySubmitted = this.data.attendanceRecords.some(r => r.sessionId === sessionId && r.studentId === studentId);
    if (alreadySubmitted) {
      return { success: false, message: 'Attendance already marked for this session' };
    }
    const record = {
      _id: `att-rec-${Date.now()}`,
      sessionId,
      studentId,
      status: 'present',
      timestamp: new Date().toISOString()
    };
    this.data.attendanceRecords.push(record);
    return { success: true, record };
  }

  // --- LEAVE APPLICATIONS ---
  getStudentLeaves(studentId) {
    return this.data.leaveApplications.filter(l => {
      const sId = typeof l.student === 'object' ? l.student._id : l.student;
      return sId === studentId;
    });
  }

  getTeacherLeaves(teacherId) {
    const teacherClasses = this.getClasses(teacherId, 'teacher').map(c => c._id);
    return this.data.leaveApplications.filter(l => {
      const cId = typeof l.classId === 'object' ? l.classId._id : l.classId;
      return teacherClasses.includes(cId);
    });
  }

  applyLeave(classId, student, reason, startDate, endDate) {
    const cls = this.getClassById(classId);
    const leave = {
      _id: `leave-${Date.now()}`,
      classId: cls ? { _id: cls._id, name: cls.name } : classId,
      student: { _id: student._id, name: student.name, email: student.email },
      reason,
      startDate,
      endDate,
      status: 'pending',
      teacherComment: '',
      createdAt: new Date().toISOString()
    };
    this.data.leaveApplications.unshift(leave);
    return leave;
  }

  reviewLeave(leaveId, status, teacherComment) {
    const leave = this.data.leaveApplications.find(l => l._id === leaveId);
    if (!leave) return null;
    leave.status = status;
    leave.teacherComment = teacherComment || '';
    return leave;
  }

  // --- NOTIFICATIONS ---
  getNotifications(userId) {
    return this.data.notifications.filter(n => n.recipient === userId);
  }

  markNotificationRead(notifId) {
    const notif = this.data.notifications.find(n => n._id === notifId);
    if (notif) notif.isRead = true;
    return notif;
  }

  markAllNotificationsRead(userId) {
    this.data.notifications.forEach(n => {
      if (n.recipient === userId) n.isRead = true;
    });
    return true;
  }

  // --- ADMIN STATS ---
  getAdminStats() {
    return {
      users: {
        total: this.data.users.length,
        students: this.data.users.filter(u => u.role === 'student').length,
        teachers: this.data.users.filter(u => u.role === 'teacher').length,
        admins: this.data.users.filter(u => u.role === 'admin').length
      },
      classes: {
        total: this.data.classes.length,
        totalEnrollments: this.data.classes.reduce((sum, c) => sum + (c.students ? c.students.length : 0), 0)
      },
      academic: {
        assignments: this.data.assignments.length,
        materials: this.data.materials.length
      },
      attendance: {
        sessions: this.data.attendanceSessions.length,
        records: this.data.attendanceRecords.length
      },
      leaves: {
        pending: this.data.leaveApplications.filter(l => l.status === 'pending').length,
        total: this.data.leaveApplications.length
      },
      assessments: null
    };
  }
}

const demoStore = new DemoStore();

module.exports = { demoStore };
