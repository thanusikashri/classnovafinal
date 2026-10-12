const test = require('node:test');
const assert = require('node:assert');
const express = require('express');

const demoRoutes = require('./src/routes/demo.routes');
const { demoStore } = require('./src/services/demoStore');

const app = express();
app.use(express.json());
app.use('/api', demoRoutes);

let server;
let baseUrl;

const apiRequest = async (path, options = {}) => {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  let data;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, headers: res.headers, data };
};

test('ClassNova Comprehensive Test Suite', async (t) => {
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      baseUrl = `http://localhost:${server.address().port}`;
      resolve();
    });
  });

  t.after(() => {
    server.close();
  });

  let studentToken = null;
  let teacherToken = null;
  let adminToken = null;

  await t.test('1. Authentication & Role Permissions', async () => {
    const studentRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'student@demo.classnova.local' }
    });
    assert.strictEqual(studentRes.status, 200);
    assert.strictEqual(studentRes.data.user.role, 'student');
    studentToken = studentRes.data.token;

    const teacherRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'teacher@demo.classnova.local' }
    });
    assert.strictEqual(teacherRes.status, 200);
    assert.strictEqual(teacherRes.data.user.role, 'teacher');
    teacherToken = teacherRes.data.token;

    const adminRes = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@demo.classnova.local' }
    });
    assert.strictEqual(adminRes.status, 200);
    assert.strictEqual(adminRes.data.user.role, 'admin');
    adminToken = adminRes.data.token;
  });

  await t.test('2. Role-specific Dashboard Access & Security Guards', async () => {
    // Student Dashboard access
    const sDash = await apiRequest('/api/dashboard/student', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(sDash.status, 200);
    assert.ok(Array.isArray(sDash.data.data.classes));

    // Student forbidden from teacher dashboard
    const forbiddenTeach = await apiRequest('/api/dashboard/teacher', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(forbiddenTeach.status, 403);

    // Teacher Dashboard access
    const tDash = await apiRequest('/api/dashboard/teacher', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(tDash.status, 200);
    assert.ok(Array.isArray(tDash.data.data.classes));
  });

  await t.test('3. Teacher Announcement Posting, Class Feed & Dashboard Reflection', async () => {
    const classId = 'class-cs101';

    // 3a. Teacher posts announcement with title & content
    const createRes = await apiRequest(`/api/classes/${classId}/announcements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: {
        title: 'Project Phase 1 Submission',
        content: 'Please submit your architecture diagrams by end of day.'
      }
    });
    assert.strictEqual(createRes.status, 201);
    assert.strictEqual(createRes.data.success, true);
    assert.strictEqual(createRes.data.data.title, 'Project Phase 1 Submission');

    // 3b. Student sees it in class announcements feed
    const feedRes = await apiRequest(`/api/classes/${classId}/announcements`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(feedRes.status, 200);
    const inFeed = feedRes.data.data.find(a => a.title === 'Project Phase 1 Submission');
    assert.ok(inFeed, 'Announcement must be present in class feed');

    // 3c. Teacher dashboard reflects recent announcement
    const tDash = await apiRequest('/api/dashboard/teacher', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(tDash.status, 200);
    const inTDash = tDash.data.data.announcements.find(a => a.title === 'Project Phase 1 Submission');
    assert.ok(inTDash, 'Announcement must appear on teacher dashboard');

    // 3d. Student cannot post announcement (403 forbidden)
    const badStudentPost = await apiRequest(`/api/classes/${classId}/announcements`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { content: 'Students cannot publish announcements' }
    });
    assert.strictEqual(badStudentPost.status, 403);
  });

  await t.test('4. Teacher Assignment Creation, Classwork & Dashboard Reflection', async () => {
    const classId = 'class-cs101';

    // 4a. Teacher creates assignment
    const due = new Date(Date.now() + 7 * 86400000).toISOString();
    const createAsgn = await apiRequest(`/api/classes/${classId}/assignments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: {
        title: 'Autonomous Navigation Lab',
        description: 'Complete the A* algorithm implementation and benchmark performance.',
        dueDate: due,
        maxMarks: 100
      }
    });
    assert.strictEqual(createAsgn.status, 201);
    assert.strictEqual(createAsgn.data.success, true);
    const createdId = createAsgn.data.data._id;

    // 4b. Enrolled student views assignment in class assignments list
    const classworkRes = await apiRequest(`/api/classes/${classId}/assignments`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(classworkRes.status, 200);
    const inClasswork = classworkRes.data.data.find(a => a._id === createdId);
    assert.ok(inClasswork, 'Created assignment must appear in classwork');
    assert.strictEqual(inClasswork.title, 'Autonomous Navigation Lab');

    // 4c. Teacher dashboard shows assignment in upcoming assignments
    const tDash = await apiRequest('/api/dashboard/teacher', {
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(tDash.status, 200);
    const inUpcoming = tDash.data.data.upcomingAssignments.find(a => a._id === createdId);
    assert.ok(inUpcoming, 'New assignment must appear in teacher dashboard upcoming assignments');

    // 4d. Student dashboard shows assignment
    const sDash = await apiRequest('/api/dashboard/student', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(sDash.status, 200);
    const inStudentUpcoming = sDash.data.data.upcomingAssignments.find(a => a._id === createdId);
    assert.ok(inStudentUpcoming, 'New assignment must appear on student dashboard');

    // 4e. Validation: missing title returns 400
    const invalidAsgn = await apiRequest(`/api/classes/${classId}/assignments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: { description: 'Missing title' }
    });
    assert.strictEqual(invalidAsgn.status, 400);

    // 4f. Student cannot create assignment (403 forbidden)
    const unauthorizedAsgn = await apiRequest(`/api/classes/${classId}/assignments`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { title: 'Illegal student assignment' }
    });
    assert.strictEqual(unauthorizedAsgn.status, 403);
  });

  await t.test('5. Attendance Session & OTP Verification', async () => {
    const classId = 'class-cs101';

    // Start attendance session
    const startRes = await apiRequest(`/api/attendance/classes/${classId}/start`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: { durationMinutes: 10 }
    });
    assert.strictEqual(startRes.status, 201);
    const session = startRes.data.data;
    assert.ok(session.otp);

    // Student submits valid OTP
    const submitRes = await apiRequest('/api/attendance/submit', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { sessionId: session._id, otp: session.otp }
    });
    assert.strictEqual(submitRes.status, 200);
    assert.strictEqual(submitRes.data.data.status, 'present');
  });

  await t.test('6. Course Materials & PDF Download', async () => {
    const classId = 'class-cs101';
    const matRes = await apiRequest(`/api/classes/${classId}/materials`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(matRes.status, 200);
    assert.ok(matRes.data.data.length > 0);

    const matId = matRes.data.data[0]._id;
    const downloadRes = await apiRequest(`/api/classes/${classId}/materials/${matId}/download`, {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(downloadRes.status, 200);
    assert.strictEqual(downloadRes.headers.get('content-type'), 'application/pdf');
    assert.ok(downloadRes.data.includes('%PDF-1.4'));
  });

  await t.test('7. Leave Application & Review Workflow', async () => {
    const classId = 'class-cs101';
    const applyRes = await apiRequest('/api/leaves', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        classId,
        reason: 'National Robotics Competition attendance',
        startDate: '2026-11-10',
        endDate: '2026-11-12'
      }
    });
    assert.strictEqual(applyRes.status, 201);
    const leaveId = applyRes.data.data._id;

    const reviewRes = await apiRequest(`/api/leaves/${leaveId}/review`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: {
        status: 'approved',
        teacherComment: 'Represent the university well!'
      }
    });
    assert.strictEqual(reviewRes.status, 200);
    assert.strictEqual(reviewRes.data.data.status, 'approved');
  });

  await t.test('8. Admin System Analytics & Security Guard', async () => {
    const adminStats = await apiRequest('/api/admin/stats', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert.strictEqual(adminStats.status, 200);
    assert.ok(adminStats.data.data.users.total >= 3);

    const studentForbidden = await apiRequest('/api/admin/stats', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(studentForbidden.status, 403);
  });

  await t.test('9. Teacher Course Creation Appears Automatically on Student Dashboard', async () => {
    // 9a. Teacher creates a new course
    const newCourseRes = await apiRequest('/api/classes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: {
        name: 'Quantum Computing Fundamentals',
        description: 'Qubits, quantum superposition, and Shor algorithm foundations.'
      }
    });
    assert.strictEqual(newCourseRes.status, 201);
    assert.strictEqual(newCourseRes.data.success, true);
    const createdClassId = newCourseRes.data.data._id;

    // 9b. Student fetches dashboard / classes - newly created course appears automatically
    const studentDash = await apiRequest('/api/dashboard/student', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(studentDash.status, 200);
    const foundOnStudentDash = studentDash.data.data.classes.find(c => c._id === createdClassId);
    assert.ok(foundOnStudentDash, 'Newly created teacher course must appear automatically on student dashboard');
    assert.strictEqual(foundOnStudentDash.name, 'Quantum Computing Fundamentals');

    // 9c. Student cannot create classes (403 forbidden)
    const illegalCreate = await apiRequest('/api/classes', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { name: 'Illegal Course' }
    });
    assert.strictEqual(illegalCreate.status, 403);
  });

  await t.test('10. Leave Rejection Workflow & Unauthorized Teacher Guard', async () => {
    const classId = 'class-cs101';

    // 10a. Student submits leave request
    const applyRes = await apiRequest('/api/leaves', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        classId,
        reason: 'Personal family emergency',
        startDate: '2026-11-20',
        endDate: '2026-11-21'
      }
    });
    assert.strictEqual(applyRes.status, 201);
    const leaveId = applyRes.data.data._id;

    // 10b. Student cannot approve/reject leave (403 forbidden)
    const studentApprove = await apiRequest(`/api/leaves/${leaveId}/review`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { status: 'approved' }
    });
    assert.strictEqual(studentApprove.status, 403);

    // 10c. Teacher rejects request with remarks
    const rejectRes = await apiRequest(`/api/leaves/${leaveId}/review`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: {
        status: 'rejected',
        teacherComment: 'Final exam date cannot be excused'
      }
    });
    assert.strictEqual(rejectRes.status, 200);
    assert.strictEqual(rejectRes.data.data.status, 'rejected');

    // 10d. Student dashboard reflects updated decision and remarks
    const studentDash = await apiRequest('/api/dashboard/student', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(studentDash.status, 200);
    const rejectedLeave = studentDash.data.data.leaves.find(l => l._id === leaveId);
    assert.ok(rejectedLeave);
    assert.strictEqual(rejectedLeave.status, 'rejected');
    assert.strictEqual(rejectedLeave.teacherComment, 'Final exam date cannot be excused');
  });

  await t.test('11. Material Edit & Delete Operations', async () => {
    const classId = 'class-cs101';

    // 11a. Teacher adds a study material
    const addMatRes = await apiRequest(`/api/classes/${classId}/materials`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: {
        title: 'Neural Networks Architecture Slides',
        description: 'Supplementary slides covering backpropagation'
      }
    });
    assert.strictEqual(addMatRes.status, 201);
    const matId = addMatRes.data.data._id;

    // 11b. Teacher updates material
    const updateRes = await apiRequest(`/api/classes/${classId}/materials/${matId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${teacherToken}` },
      body: {
        title: 'Neural Networks Architecture Slides v2',
        description: 'Updated with PyTorch examples'
      }
    });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.data.data.title, 'Neural Networks Architecture Slides v2');

    // 11c. Student cannot edit or delete material (403 forbidden)
    const studentEdit = await apiRequest(`/api/classes/${classId}/materials/${matId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { title: 'Hacked' }
    });
    assert.strictEqual(studentEdit.status, 403);

    const studentDel = await apiRequest(`/api/classes/${classId}/materials/${matId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert.strictEqual(studentDel.status, 403);

    // 11d. Teacher deletes material
    const delRes = await apiRequest(`/api/classes/${classId}/materials/${matId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${teacherToken}` }
    });
    assert.strictEqual(delRes.status, 200);
  });
});
