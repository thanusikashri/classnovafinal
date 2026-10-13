// In-memory isolated mock store for ClassNova
// Strictly separated from production MongoDB models.
// Used when DEMO_MODE=true in non-production environments.

const { evaluateDescriptiveAnswer } = require('./aiGenerator.service');

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
      _id: 'user-teacher-02',
      name: 'Prof. Marcus Vance',
      email: 'teacher2@demo.classnova.local',
      role: 'teacher',
      isActive: true,
      createdAt: '2026-08-20T08:00:00.000Z'
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
    },
    {
      _id: 'class-ds303',
      name: 'DS303: Distributed Systems Architecture',
      code: 'DS303-DIST',
      classCode: 'DS303-DIST',
      description: 'Consensus protocols, event-driven architectures, and scalable cloud storage engines.',
      teacher: {
        _id: 'user-teacher-02',
        name: 'Prof. Marcus Vance',
        email: 'teacher2@demo.classnova.local'
      },
      students: [
        {
          _id: 'user-student-01',
          name: 'Alex Johnson',
          email: 'student@demo.classnova.local'
        }
      ],
      createdAt: '2026-09-08T10:00:00.000Z'
    },
    {
      _id: 'class-algo404',
      name: 'ALGO404: Advanced Algorithmic Design',
      code: 'ALGO404-ADV',
      classCode: 'ALGO404-ADV',
      description: 'NP-completeness, approximation algorithms, and randomized graph structures.',
      teacher: {
        _id: 'user-teacher-02',
        name: 'Prof. Marcus Vance',
        email: 'teacher2@demo.classnova.local'
      },
      students: [],
      createdAt: '2026-09-10T10:00:00.000Z'
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
      teacher: {
        _id: 'user-teacher-01',
        name: 'Dr. Sarah Williams',
        email: 'teacher@demo.classnova.local'
      },
      reason: 'Attending National Student AI Hackathon competition representing the university.',
      startDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      endDate: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      status: 'pending',
      teacherComment: '',
      reviewNote: '',
      reviewedBy: null,
      reviewedAt: null,
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

  const quizzes = [
    {
      _id: 'quiz-01',
      classId: 'class-cs101',
      title: 'Quiz 1: Intelligent Search Fundamentals',
      description: 'Multiple choice assessment covering heuristics, tree search, and graph algorithms.',
      durationMinutes: 30,
      isPublished: true,
      startTime: new Date(Date.now() - 3600000 * 24).toISOString(),
      endTime: new Date(Date.now() + 86400000 * 5).toISOString(),
      teacher: 'user-teacher-01',
      questions: [
        {
          _id: 'q-1',
          text: 'What algorithm is guaranteed to find the shortest path in a graph with non-negative edge weights?',
          options: ["Dijkstra's Algorithm", "Depth First Search", "Breadth First Search", "Bellman-Ford"],
          correctOptionIndex: 0,
          marks: 5
        },
        {
          _id: 'q-2',
          text: 'Which heuristic property guarantees that A* tree search is optimal?',
          options: ['Admissibility', 'Consistency', 'Completeness', 'Monotonicity'],
          correctOptionIndex: 0,
          marks: 5
        }
      ],
      createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
    }
  ];

  const quizAttempts = [
    {
      _id: 'attempt-01',
      quizId: 'quiz-01',
      classId: 'class-cs101',
      studentId: 'user-student-01',
      studentName: 'Alex Johnson',
      studentEmail: 'student@demo.classnova.local',
      student: {
        _id: 'user-student-01',
        name: 'Alex Johnson',
        email: 'student@demo.classnova.local',
        studentId: 'CS2026-001'
      },
      score: 10,
      maxScore: 10,
      percentage: 100,
      correctCount: 2,
      incorrectCount: 0,
      unansweredCount: 0,
      status: 'Submitted',
      evaluationStatus: 'Evaluated',
      startTime: new Date(Date.now() - 3600000 * 2).toISOString(),
      submittedAt: new Date(Date.now() - 3600000 * 1.5).toISOString(),
      answers: [
        { questionId: 'q-1', selectedOptionIndex: 0 },
        { questionId: 'q-2', selectedOptionIndex: 0 }
      ],
      evaluation: [
        {
          questionId: 'q-1',
          questionText: 'What algorithm is guaranteed to find the shortest path in a graph with non-negative edge weights?',
          questionType: 'multiple_choice',
          studentAnswer: 0,
          selectedOptionText: "Dijkstra's Algorithm",
          correctOptionIndex: 0,
          correctAnswerText: "Dijkstra's Algorithm",
          isCorrect: true,
          marksAwarded: 5,
          maxMarks: 5,
          feedback: 'Correct! Full marks awarded.',
          needsManualReview: false
        },
        {
          questionId: 'q-2',
          questionText: 'Which heuristic property guarantees that A* tree search is optimal?',
          questionType: 'multiple_choice',
          studentAnswer: 0,
          selectedOptionText: 'Admissibility',
          correctOptionIndex: 0,
          correctAnswerText: 'Admissibility',
          isCorrect: true,
          marksAwarded: 5,
          maxMarks: 5,
          feedback: 'Correct! Full marks awarded.',
          needsManualReview: false
        }
      ]
    }
  ];

  const submissions = [
    {
      _id: 'sub-01',
      assignmentId: 'asgn-01',
      classId: 'class-cs101',
      studentId: 'user-student-01',
      studentName: 'Alex Johnson',
      studentEmail: 'student@demo.classnova.local',
      student: {
        _id: 'user-student-01',
        name: 'Alex Johnson',
        email: 'student@demo.classnova.local',
        studentId: 'CS2026-001'
      },
      teacher: 'user-teacher-01',
      fileName: 'Alex_Johnson_AStar_Report.pdf',
      fileUrl: '/api/classes/class-cs101/assignments/asgn-01/submissions/sub-01/file',
      fileSize: 245760, // 240 KB
      fileType: 'application/pdf',
      isLate: false,
      submittedAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      status: 'Submitted',
      content: 'Attached research write-up and runtime heuristic benchmark results for A* algorithm.',
      marks: null,
      feedback: '',
      gradedBy: null,
      gradedAt: null
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
    notifications,
    quizzes,
    quizAttempts,
    submissions
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

  getClasses(userId, role, enrolledOnly = false) {
    if (role === 'admin') return this.data.classes;
    if (role === 'teacher') return this.data.classes.filter(c => c.teacher && (c.teacher._id === userId || c.teacher === userId));
    if (role === 'student') {
      if (enrolledOnly) {
        return this.data.classes.filter(c => c.students && c.students.some(s => (typeof s === 'object' ? s._id : s) === userId));
      }
      return this.data.classes;
    }
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

  // --- ASSIGNMENT SUBMISSIONS ---
  getSubmissions(assignmentId) {
    if (!this.data.submissions) return [];
    return this.data.submissions
      .filter(s => s.assignmentId === assignmentId)
      .map(s => {
        const student = this.getUserById(s.studentId) || s.student;
        return {
          ...s,
          student: student ? {
            _id: student._id,
            name: student.name,
            email: student.email,
            studentId: student.studentId || (student._id ? 'CS2026-' + student._id.slice(-2) : 'STU-01')
          } : null
        };
      });
  }

  getAssignmentStats(classId, assignmentId) {
    if (!this.data.submissions) this.data.submissions = [];
    const assignment = this.getAssignmentById(assignmentId);
    if (!assignment) return null;

    const cls = this.getClassById(classId || assignment.classId);
    const enrolledStudents = (cls && cls.students) ? cls.students : [];
    const totalEligibleCount = enrolledStudents.length;

    const assignmentSubs = this.data.submissions.filter(s => s.assignmentId === assignmentId);

    const submittedStudentIds = new Set(assignmentSubs.map(s => s.studentId || (s.student && s.student._id)));
    const submittedCount = submittedStudentIds.size;
    const notSubmittedCount = Math.max(0, totalEligibleCount - submittedCount);
    const awaitingReviewCount = assignmentSubs.filter(s => s.status === 'Submitted').length;
    const reviewedCount = assignmentSubs.filter(s => s.status === 'Graded' || s.status === 'Reviewed').length;
    const lateCount = assignmentSubs.filter(s => s.isLate).length;

    const eligibleStudents = enrolledStudents.map(st => {
      const sId = typeof st === 'object' ? st._id : st;
      const sUser = this.getUserById(sId) || (typeof st === 'object' ? st : { _id: sId, name: 'Student' });
      const sub = assignmentSubs.find(s => (s.studentId === sId || (s.student && s.student._id === sId)));
      return {
        _id: sUser._id,
        name: sUser.name,
        email: sUser.email,
        studentId: sUser.studentId || (sUser._id ? 'CS2026-' + sUser._id.slice(-2) : 'STU-01'),
        isSubmitted: !!sub,
        submission: sub ? {
          ...sub,
          student: {
            _id: sUser._id,
            name: sUser.name,
            email: sUser.email,
            studentId: sUser.studentId || (sUser._id ? 'CS2026-' + sUser._id.slice(-2) : 'STU-01')
          }
        } : null
      };
    });

    const populatedSubmissions = assignmentSubs.map(s => {
      const sUser = this.getUserById(s.studentId) || s.student || {};
      return {
        ...s,
        student: {
          _id: sUser._id || s.studentId,
          name: sUser.name || s.studentName || 'Student',
          email: sUser.email || s.studentEmail || '',
          studentId: sUser.studentId || (sUser._id ? 'CS2026-' + sUser._id.slice(-2) : 'STU-01')
        }
      };
    });

    return {
      stats: {
        totalEligibleCount,
        submittedCount,
        notSubmittedCount,
        awaitingReviewCount,
        reviewedCount,
        lateCount
      },
      submissions: populatedSubmissions,
      eligibleStudents
    };
  }

  getMySubmission(assignmentId, studentId) {
    if (!this.data.submissions) return null;
    return this.data.submissions.find(s => s.assignmentId === assignmentId && (s.studentId === studentId || (s.student && s.student._id === studentId))) || null;
  }

  getSubmissionById(submissionId) {
    if (!this.data.submissions) return null;
    return this.data.submissions.find(s => s._id === submissionId) || null;
  }

  submitAssignment(classId, assignmentId, student, fileInfo = {}, content = '') {
    if (!this.data.submissions) this.data.submissions = [];
    const assignment = this.getAssignmentById(assignmentId);
    if (!assignment) return null;

    const cls = this.getClassById(classId || assignment.classId);
    const teacherId = (assignment.teacher && (assignment.teacher._id || assignment.teacher.id)) || (cls && cls.teacher && (cls.teacher._id || cls.teacher)) || 'user-teacher-01';

    const isLate = assignment.dueDate ? new Date() > new Date(assignment.dueDate) : false;

    let existing = this.data.submissions.find(s => s.assignmentId === assignmentId && (s.studentId === student._id || (s.student && s.student._id === student._id)));

    const now = new Date().toISOString();
    const submissionId = existing ? existing._id : `sub-${Date.now()}`;
    const fileUrl = fileInfo.fileUrl || `/api/classes/${classId}/assignments/${assignmentId}/submissions/${submissionId}/file`;

    if (existing) {
      existing.fileName = fileInfo.fileName || existing.fileName || 'assignment_submission.pdf';
      existing.fileUrl = fileUrl;
      existing.fileSize = fileInfo.fileSize || existing.fileSize || 102400;
      existing.fileType = fileInfo.fileType || 'application/pdf';
      existing.filePath = fileInfo.filePath || existing.filePath || '';
      existing.content = content !== undefined ? content : existing.content;
      existing.isLate = isLate;
      existing.submittedAt = now;
      existing.status = 'Submitted';
      existing.teacher = teacherId;
      return existing;
    }

    const newSub = {
      _id: submissionId,
      assignmentId,
      classId: cls ? cls._id : classId,
      studentId: student._id,
      studentName: student.name,
      studentEmail: student.email,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        studentId: student.studentId || (student._id ? 'CS2026-' + student._id.slice(-2) : 'STU-01')
      },
      teacher: teacherId,
      fileName: fileInfo.fileName || 'Assignment_Submission.pdf',
      fileUrl,
      fileSize: fileInfo.fileSize || 102400,
      fileType: fileInfo.fileType || 'application/pdf',
      filePath: fileInfo.filePath || '',
      content: content || '',
      isLate,
      submittedAt: now,
      status: 'Submitted',
      marks: null,
      feedback: '',
      gradedBy: null,
      gradedAt: null
    };

    this.data.submissions.unshift(newSub);

    // Notify responsible teacher
    const teacherRecipient = typeof teacherId === 'object' ? teacherId._id : teacherId;
    this.data.notifications.unshift({
      _id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipient: teacherRecipient,
      title: `Assignment Turned In: ${assignment.title}`,
      message: `${student.name} turned in ${newSub.fileName}`,
      type: 'assignment',
      link: `/classes/${classId}/assignments/${assignmentId}`,
      isRead: false,
      createdAt: now
    });

    return newSub;
  }

  gradeSubmission(assignmentId, submissionId, teacherId, updates = {}) {
    if (!this.data.submissions) return null;
    const sub = this.data.submissions.find(s => s._id === submissionId && s.assignmentId === assignmentId);
    if (!sub) return null;

    if (updates.marks !== undefined) {
      sub.marks = Number(updates.marks);
      sub.status = 'Graded';
      sub.gradedBy = teacherId;
      sub.gradedAt = new Date().toISOString();
    }
    if (updates.feedback !== undefined) {
      sub.feedback = updates.feedback;
    }

    // Notify student
    const sId = sub.studentId || (sub.student && sub.student._id);
    if (sId) {
      this.data.notifications.unshift({
        _id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipient: sId,
        title: 'Assignment Graded',
        message: `Your submission for "${sub.fileName}" was graded. Score: ${sub.marks}`,
        type: 'assignment',
        link: `/classes/${sub.classId}/assignments/${sub.assignmentId}`,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    return sub;
  }

  getTeacherAssignmentsOverview(teacherId) {
    const teacherClasses = this.getClasses(teacherId, 'teacher');
    const classIds = teacherClasses.map(c => c._id);
    const assignments = (this.data.assignments || []).filter(a => {
      const aTeacherId = a.teacher ? (typeof a.teacher === 'object' ? a.teacher._id : a.teacher) : null;
      return aTeacherId === teacherId || classIds.includes(a.classId);
    });

    return assignments.map(asgn => {
      const cls = this.getClassById(asgn.classId);
      const statsObj = this.getAssignmentStats(asgn.classId, asgn._id);
      return {
        ...asgn,
        courseName: cls ? cls.name : 'Course',
        courseCode: cls ? (cls.classCode || cls.code) : '',
        stats: statsObj ? statsObj.stats : {
          totalEligibleCount: 0,
          submittedCount: 0,
          notSubmittedCount: 0,
          awaitingReviewCount: 0,
          reviewedCount: 0,
          lateCount: 0
        }
      };
    });
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

  getTeacherLeaves(teacherId, status) {
    const isAll = teacherId === 'all';
    const teacherClasses = isAll ? [] : this.getClasses(teacherId, 'teacher').map(c => c._id);
    return this.data.leaveApplications.filter(l => {
      const cId = typeof l.classId === 'object' ? l.classId._id : l.classId;
      const tId = typeof l.teacher === 'object' ? l.teacher?._id : l.teacher;
      const belongsToTeacher = isAll || teacherClasses.includes(cId) || tId === teacherId;
      if (!belongsToTeacher) return false;
      if (status && status !== 'all') {
        return l.status === status;
      }
      return true;
    });
  }

  applyLeave(classId, student, reason, startDate, endDate) {
    const cls = this.getClassById(classId);
    const teacher = cls && cls.teacher ? (typeof cls.teacher === 'object' ? cls.teacher : this.getUserById(cls.teacher)) : null;
    const leave = {
      _id: `leave-${Date.now()}`,
      classId: cls ? { _id: cls._id, name: cls.name } : classId,
      student: { _id: student._id, name: student.name, email: student.email, studentId: student.studentId || student._id },
      teacher: teacher ? { _id: teacher._id, name: teacher.name, email: teacher.email } : null,
      reason: reason.trim(),
      startDate,
      endDate,
      status: 'pending',
      teacherComment: '',
      reviewNote: '',
      reviewedBy: null,
      reviewedAt: null,
      createdAt: new Date().toISOString()
    };
    this.data.leaveApplications.unshift(leave);

    if (teacher) {
      this.data.notifications.unshift({
        _id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        recipient: teacher._id,
        title: 'New Leave Application',
        message: `${student.name} applied for leave in ${cls ? cls.name : 'your course'}.`,
        type: 'leave',
        link: '/teacher-dashboard',
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }

    return leave;
  }

  reviewLeave(leaveId, status, teacherComment, reviewer) {
    const leave = this.data.leaveApplications.find(l => l._id === leaveId);
    if (!leave) return null;
    const comment = (teacherComment || '').trim();
    leave.status = status;
    leave.teacherComment = comment;
    leave.reviewNote = comment;
    leave.reviewedBy = reviewer ? { _id: reviewer._id, name: reviewer.name, email: reviewer.email } : null;
    leave.reviewedAt = new Date().toISOString();

    const studentId = typeof leave.student === 'object' ? leave.student._id : leave.student;
    const clsName = typeof leave.classId === 'object' ? leave.classId.name : 'your course';
    this.data.notifications.unshift({
      _id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      recipient: studentId,
      title: `Leave Application ${status.toUpperCase()}`,
      message: `Your leave application for ${clsName} has been ${status}.`,
      type: 'leave',
      link: '/student-dashboard',
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return leave;
  }

  cancelLeave(leaveId, studentId) {
    const leave = this.data.leaveApplications.find(l => l._id === leaveId);
    if (!leave) return { success: false, status: 404, message: 'Leave application not found' };
    const sId = typeof leave.student === 'object' ? leave.student._id : leave.student;
    if (sId !== studentId) {
      return { success: false, status: 403, message: 'Not authorized to cancel this application' };
    }
    if (leave.status !== 'pending') {
      return { success: false, status: 400, message: `Cannot cancel a leave application that is already ${leave.status}` };
    }
    leave.status = 'cancelled';
    return { success: true, leave };
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

  // --- QUIZZES ---
  getQuizzes(classId) {
    if (!classId) return this.data.quizzes || [];
    return (this.data.quizzes || []).filter(q => q.classId === classId);
  }

  getQuizById(id) {
    return (this.data.quizzes || []).find(q => q._id === id);
  }

  createQuiz(classId, quizData, teacher) {
    const cls = this.getClassById(classId);
    if (!cls) {
      throw new Error('Target class/course not found');
    }
    if (!quizData.questions || !Array.isArray(quizData.questions) || quizData.questions.length === 0) {
      throw new Error('A quiz must contain at least 1 question');
    }
    if (quizData.questions.length > 10) {
      throw new Error('A quiz cannot contain more than 10 questions (maximum 10 allowed)');
    }

    const newQuiz = {
      _id: `quiz-${Date.now()}`,
      classId,
      title: quizData.title,
      description: quizData.description || '',
      durationMinutes: Number(quizData.durationMinutes) || 30,
      startTime: quizData.startTime || new Date().toISOString(),
      endTime: quizData.endTime || new Date(Date.now() + 86400000 * 7).toISOString(),
      isPublished: quizData.isPublished !== undefined ? quizData.isPublished : true,
      teacher: teacher._id || teacher.id || teacher,
      questions: (quizData.questions || []).map((q, idx) => ({
        _id: `q-${Date.now()}-${idx}`,
        text: q.text,
        type: q.type || 'multiple_choice',
        options: Array.isArray(q.options) ? q.options : [],
        correctOptionIndex: q.correctOptionIndex !== undefined ? Number(q.correctOptionIndex) : undefined,
        correctAnswer: q.correctAnswer || '',
        rubric: q.rubric || '',
        explanation: q.explanation || '',
        marks: Number(q.marks) || 5
      })),
      createdAt: new Date().toISOString()
    };
    if (!this.data.quizzes) this.data.quizzes = [];
    this.data.quizzes.unshift(newQuiz);
    return newQuiz;
  }

  updateQuiz(id, quizData) {
    const q = this.getQuizById(id);
    if (!q) return null;
    if (quizData.title) q.title = quizData.title;
    if (quizData.description !== undefined) q.description = quizData.description;
    if (quizData.durationMinutes) q.durationMinutes = Number(quizData.durationMinutes);
    if (quizData.startTime) q.startTime = quizData.startTime;
    if (quizData.endTime) q.endTime = quizData.endTime;
    if (quizData.isPublished !== undefined) q.isPublished = quizData.isPublished;
    if (quizData.questions) {
      if (!Array.isArray(quizData.questions) || quizData.questions.length === 0) {
        throw new Error('A quiz must contain at least 1 question');
      }
      if (quizData.questions.length > 10) {
        throw new Error('A quiz cannot contain more than 10 questions (maximum 10 allowed)');
      }
      q.questions = quizData.questions.map((item, idx) => ({
        _id: item._id || `q-${Date.now()}-${idx}`,
        text: item.text,
        options: item.options,
        correctOptionIndex: Number(item.correctOptionIndex) || 0,
        marks: Number(item.marks) || 1
      }));
    }
    return q;
  }

  deleteQuiz(id) {
    if (!this.data.quizzes) return false;
    const idx = this.data.quizzes.findIndex(q => q._id === id);
    if (idx !== -1) {
      this.data.quizzes.splice(idx, 1);
      return true;
    }
    return false;
  }

  getQuizAttempts(quizId) {
    if (!this.data.quizAttempts) return [];
    return this.data.quizAttempts
      .filter(a => a.quizId === quizId)
      .map(a => {
        const student = this.getUserById(a.studentId) || a.student;
        return {
          ...a,
          student: student ? {
            _id: student._id,
            name: student.name,
            email: student.email,
            studentId: student.studentId || (student._id && student._id.startsWith('user-student-') ? 'CS2026-' + student._id.slice(-2) : 'STU-01')
          } : null
        };
      });
  }

  getMyAttempts(quizId, studentId) {
    if (!this.data.quizAttempts) return [];
    return this.data.quizAttempts
      .filter(a => a.quizId === quizId && (a.studentId === studentId || (a.student && a.student._id === studentId)))
      .map(a => {
        const student = this.getUserById(studentId) || a.student;
        return {
          ...a,
          student: student ? {
            _id: student._id,
            name: student.name,
            email: student.email,
            studentId: student.studentId || (student._id && student._id.startsWith('user-student-') ? 'CS2026-' + student._id.slice(-2) : 'STU-01')
          } : null
        };
      });
  }

  getQuizAttemptById(quizId, attemptId) {
    if (!this.data.quizAttempts) return null;
    const a = this.data.quizAttempts.find(att => att._id === attemptId && att.quizId === quizId);
    if (!a) return null;
    const student = this.getUserById(a.studentId) || a.student;
    return {
      ...a,
      student: student ? {
        _id: student._id,
        name: student.name,
        email: student.email,
        studentId: student.studentId || (student._id && student._id.startsWith('user-student-') ? 'CS2026-' + student._id.slice(-2) : 'STU-01')
      } : null
    };
  }

  startQuizAttempt(quizId, student) {
    if (!this.data.quizAttempts) this.data.quizAttempts = [];
    let existing = this.data.quizAttempts.find(a => a.quizId === quizId && a.studentId === student._id && a.status === 'In Progress');
    if (existing) return existing;

    const quiz = this.getQuizById(quizId);
    const maxScore = quiz ? (quiz.questions || []).reduce((sum, q) => sum + (Number(q.marks) || 1), 0) : 0;
    const attempt = {
      _id: `attempt-${Date.now()}`,
      quizId,
      classId: quiz ? quiz.classId : null,
      studentId: student._id,
      studentName: student.name,
      studentEmail: student.email,
      student: {
        _id: student._id,
        name: student.name,
        email: student.email,
        studentId: student.studentId || (student._id && student._id.startsWith('user-student-') ? 'CS2026-' + student._id.slice(-2) : 'STU-01')
      },
      score: 0,
      maxScore,
      percentage: 0,
      correctCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      status: 'In Progress',
      evaluationStatus: 'Evaluated',
      startTime: new Date().toISOString(),
      answers: [],
      evaluation: []
    };
    this.data.quizAttempts.unshift(attempt);
    return attempt;
  }

  async submitQuizAttempt(quizId, attemptId, studentId, answers) {
    if (!this.data.quizAttempts) return null;
    const attempt = this.data.quizAttempts.find(a => a._id === attemptId && a.quizId === quizId);
    if (!attempt) return null;

    if (attempt.status === 'Submitted') {
      return attempt;
    }

    const quiz = this.getQuizById(quizId);
    if (!quiz) return null;

    let score = 0;
    let maxScore = 0;
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;
    let hasManualReview = false;

    const safeAnswers = [];
    const evaluation = [];

    const ansMap = {};
    if (Array.isArray(answers)) {
      answers.forEach(a => {
        if (a && a.questionId) {
          ansMap[a.questionId.toString()] = a;
        }
      });
    }

    for (let i = 0; i < (quiz.questions || []).length; i++) {
      const q = quiz.questions[i];
      const qId = q._id.toString();
      const studentAns = ansMap[qId] || ansMap[i.toString()] || null;
      const questionMarks = Number(q.marks) || 1;
      maxScore += questionMarks;

      const qType = q.type || 'multiple_choice';

      if (qType === 'multiple_choice' || qType === 'true_false') {
        const selectedOptIdx = studentAns && studentAns.selectedOptionIndex !== undefined && studentAns.selectedOptionIndex !== null && studentAns.selectedOptionIndex !== -1
          ? Number(studentAns.selectedOptionIndex)
          : null;

        const isAnswered = selectedOptIdx !== null && !isNaN(selectedOptIdx);
        const selectedOptText = isAnswered && q.options && q.options[selectedOptIdx] ? q.options[selectedOptIdx] : '';
        const correctOptText = q.options && q.options[q.correctOptionIndex] ? q.options[q.correctOptionIndex] : '';

        if (!isAnswered) {
          unansweredCount++;
          safeAnswers.push({ questionId: qId, selectedOptionIndex: -1 });
          evaluation.push({
            questionId: qId,
            questionText: q.text,
            questionType: qType,
            studentAnswer: null,
            selectedOptionText: 'No answer submitted',
            correctOptionIndex: q.correctOptionIndex,
            correctAnswerText: correctOptText,
            isCorrect: false,
            marksAwarded: 0,
            maxMarks: questionMarks,
            feedback: 'Question was left unanswered.',
            needsManualReview: false
          });
        } else {
          const isCorrect = selectedOptIdx === q.correctOptionIndex;
          const marksAwarded = isCorrect ? questionMarks : 0;
          if (isCorrect) {
            correctCount++;
            score += marksAwarded;
          } else {
            incorrectCount++;
          }

          safeAnswers.push({ questionId: qId, selectedOptionIndex: selectedOptIdx });
          evaluation.push({
            questionId: qId,
            questionText: q.text,
            questionType: qType,
            studentAnswer: selectedOptIdx,
            selectedOptionText: selectedOptText,
            correctOptionIndex: q.correctOptionIndex,
            correctAnswerText: correctOptText,
            isCorrect,
            marksAwarded,
            maxMarks: questionMarks,
            feedback: isCorrect ? 'Correct! Full marks awarded.' : `Incorrect. Correct answer: ${correctOptText}`,
            needsManualReview: false
          });
        }
      } else if (qType === 'short_answer') {
        const textAnswer = studentAns && studentAns.textAnswer ? String(studentAns.textAnswer).trim() : '';
        const isAnswered = textAnswer.length > 0;
        const expectedAnswer = q.correctAnswer || (q.options && q.options[0]) || '';

        if (!isAnswered) {
          unansweredCount++;
          safeAnswers.push({ questionId: qId, textAnswer: '' });
          evaluation.push({
            questionId: qId,
            questionText: q.text,
            questionType: qType,
            studentAnswer: '',
            selectedOptionText: 'No response submitted',
            correctAnswerText: expectedAnswer,
            isCorrect: false,
            marksAwarded: 0,
            maxMarks: questionMarks,
            feedback: 'Question was left unanswered.',
            needsManualReview: false
          });
        } else {
          const evalResult = await evaluateDescriptiveAnswer(textAnswer, expectedAnswer, q.rubric || '', questionMarks);
          score += evalResult.marksAwarded;
          if (evalResult.isCorrect) {
            correctCount++;
          } else {
            incorrectCount++;
          }
          if (evalResult.needsManualReview) {
            hasManualReview = true;
          }

          safeAnswers.push({ questionId: qId, textAnswer });
          evaluation.push({
            questionId: qId,
            questionText: q.text,
            questionType: qType,
            studentAnswer: textAnswer,
            selectedOptionText: textAnswer,
            correctAnswerText: expectedAnswer,
            isCorrect: evalResult.isCorrect,
            marksAwarded: evalResult.marksAwarded,
            maxMarks: questionMarks,
            feedback: evalResult.feedback,
            needsManualReview: evalResult.needsManualReview
          });
        }
      }
    }

    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    const evaluationStatus = hasManualReview ? 'Pending Review' : 'Evaluated';

    attempt.answers = safeAnswers;
    attempt.evaluation = evaluation;
    attempt.score = score;
    attempt.maxScore = maxScore;
    attempt.percentage = percentage;
    attempt.correctCount = correctCount;
    attempt.incorrectCount = incorrectCount;
    attempt.unansweredCount = unansweredCount;
    attempt.evaluationStatus = evaluationStatus;
    attempt.status = 'Submitted';
    attempt.submittedAt = new Date().toISOString();

    return attempt;
  }

  gradeQuizAttempt(quizId, attemptId, teacherId, updates) {
    if (!this.data.quizAttempts) return null;
    const attempt = this.data.quizAttempts.find(a => a._id === attemptId && a.quizId === quizId);
    if (!attempt) return null;

    const { evaluations, teacherNotes } = updates || {};
    if (Array.isArray(evaluations)) {
      evaluations.forEach(ev => {
        const item = (attempt.evaluation || []).find(e => e.questionId === ev.questionId);
        if (item) {
          if (ev.marksAwarded !== undefined) {
            item.marksAwarded = Math.min(item.maxMarks, Math.max(0, Number(ev.marksAwarded)));
            item.isCorrect = item.marksAwarded >= Math.ceil(item.maxMarks * 0.5);
          }
          if (ev.feedback !== undefined) {
            item.feedback = ev.feedback;
          }
          item.needsManualReview = false;
        }
      });
    }

    let newScore = 0;
    let newCorrect = 0;
    let newIncorrect = 0;
    let hasPending = false;

    (attempt.evaluation || []).forEach(e => {
      newScore += e.marksAwarded;
      if (e.isCorrect) newCorrect++;
      else if (e.marksAwarded === 0 && e.studentAnswer === null) {
        // Unanswered
      } else {
        newIncorrect++;
      }
      if (e.needsManualReview) hasPending = true;
    });

    attempt.score = newScore;
    attempt.percentage = attempt.maxScore > 0 ? Math.round((newScore / attempt.maxScore) * 100) : 0;
    attempt.correctCount = newCorrect;
    attempt.incorrectCount = newIncorrect;
    attempt.evaluationStatus = hasPending ? 'Pending Review' : 'Evaluated';
    attempt.manualGrading = {
      gradedBy: teacherId,
      gradedAt: new Date().toISOString(),
      teacherNotes: teacherNotes || ''
    };

    return attempt;
  }

  // User Management
  createUser(userData) {
    const newUser = {
      _id: `user-${Date.now()}`,
      name: userData.name,
      email: userData.email,
      role: userData.role || 'student',
      isActive: true,
      createdAt: new Date().toISOString()
    };
    this.data.users.unshift(newUser);
    return newUser;
  }

  updateUser(id, updates) {
    const user = this.getUserById(id);
    if (!user) return null;
    if (updates.name) user.name = updates.name;
    if (updates.email) user.email = updates.email;
    if (updates.role) user.role = updates.role;
    if (updates.isActive !== undefined) user.isActive = updates.isActive;
    return user;
  }

  // --- ADMIN STATS ---
  getAdminStats() {
    const totalQuizzes = (this.data.quizzes || []).length;
    const totalAttempts = (this.data.quizAttempts || []).length;
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
      assessments: {
        totalQuizzes,
        totalAttempts
      }
    };
  }
}

const demoStore = new DemoStore();

module.exports = { demoStore };
