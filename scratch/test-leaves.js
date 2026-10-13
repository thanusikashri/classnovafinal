// Comprehensive Leave Workflow Verification Script
const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(typeof data === 'string' ? data : JSON.stringify(data));
    }
    req.end();
  });
}

async function login(email) {
  const res = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email });

  if (!res.body || !res.body.token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.body)}`);
  }
  return { token: res.body.token, user: res.body.user };
}

async function runTests() {
  console.log('====================================================');
  console.log('CLASSNOVA LEAVE REQUEST & APPROVAL WORKFLOW TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Logins
    const student = await login('student@demo.classnova.local');
    const teacherA = await login('teacher@demo.classnova.local');   // Dr. Sarah Williams (CS101, SE202)
    const teacherB = await login('teacher2@demo.classnova.local');  // Prof. Marcus Vance (DS303, ALGO404)

    const studentHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${student.token}`
    };
    const teacherAHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherA.token}`
    };
    const teacherBHeaders = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherB.token}`
    };

    console.log('1. Testing Enrollment Verification (Security)');
    // Attempt to apply for class-algo404 (student is NOT enrolled)
    const unenrolledApply = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves',
      method: 'POST',
      headers: studentHeaders
    }, {
      classId: 'class-algo404',
      startDate: '2026-11-01',
      endDate: '2026-11-05',
      reason: 'Attempting unenrolled course leave'
    });
    assert(unenrolledApply.status === 403, `Unenrolled course leave rejected with 403 (got ${unenrolledApply.status})`);

    // Attempt with invalid dates (start > end)
    const invalidDatesApply = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves',
      method: 'POST',
      headers: studentHeaders
    }, {
      classId: 'class-cs101',
      startDate: '2026-11-10',
      endDate: '2026-11-05',
      reason: 'Invalid dates test'
    });
    assert(invalidDatesApply.status === 400, `Invalid date range (start > end) rejected with 400 (got ${invalidDatesApply.status})`);

    console.log('\n2. Testing Scenario A — Correct Course-to-Teacher Routing');
    // Student applies for CS101 (Teacher A)
    const applyCS101 = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves',
      method: 'POST',
      headers: studentHeaders
    }, {
      classId: 'class-cs101',
      startDate: '2026-11-15',
      endDate: '2026-11-17',
      reason: 'Attending AI Robotics Symposium'
    });
    assert(applyCS101.status === 201 && applyCS101.body.success, 'Student successfully submitted leave for CS101');
    const leaveCS101Id = applyCS101.body.data._id;
    assert(applyCS101.body.data.status === 'pending', 'New CS101 leave initial status is pending');
    assert(applyCS101.body.data.teacher?._id === 'user-teacher-01' || applyCS101.body.data.teacher === 'user-teacher-01', 'Leave correctly associated with responsible Teacher A');

    // Check Teacher A's leave list
    const teacherALeaves = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves/teacher',
      method: 'GET',
      headers: teacherAHeaders
    });
    const foundInTeacherA = teacherALeaves.body.data.some(l => l._id === leaveCS101Id);
    assert(foundInTeacherA, 'Leave request appears in Teacher A pending list');

    // Check Teacher B's leave list (MUST NOT contain CS101 leave)
    const teacherBLeaves = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves/teacher',
      method: 'GET',
      headers: teacherBHeaders
    });
    const foundInTeacherB = teacherBLeaves.body.data.some(l => l._id === leaveCS101Id);
    assert(!foundInTeacherB, 'Leave request does NOT appear in unrelated Teacher B list (Routing Isolated)');

    // Now Student applies for DS303 (Teacher B)
    const applyDS303 = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves',
      method: 'POST',
      headers: studentHeaders
    }, {
      classId: 'class-ds303',
      startDate: '2026-11-20',
      endDate: '2026-11-22',
      reason: 'Medical appointment & recovery'
    });
    assert(applyDS303.status === 201, 'Student successfully submitted leave for DS303');
    const leaveDS303Id = applyDS303.body.data._id;

    // Check Teacher B sees DS303 leave, and Teacher A does NOT see DS303 leave
    const teacherBLeaves2 = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves/teacher',
      method: 'GET',
      headers: teacherBHeaders
    });
    const teacherALeaves2 = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves/teacher',
      method: 'GET',
      headers: teacherAHeaders
    });
    assert(teacherBLeaves2.body.data.some(l => l._id === leaveDS303Id), 'DS303 leave appears in Teacher B pending list');
    assert(!teacherALeaves2.body.data.some(l => l._id === leaveDS303Id), 'DS303 leave does NOT appear in Teacher A list');

    console.log('\n3. Testing Scenario D — Security & Unauthorized Decisions');
    // Student tries to approve their own leave request
    const studentReviewAttempt = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/leaves/${leaveCS101Id}/review`,
      method: 'PUT',
      headers: studentHeaders
    }, {
      status: 'approved',
      reviewNote: 'Self approved'
    });
    assert(studentReviewAttempt.status === 403, `Student cannot review own request: rejected with 403 (got ${studentReviewAttempt.status})`);

    // Unrelated Teacher B tries to decide Teacher A's CS101 leave request
    const teacherBUnauthorizedReview = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/leaves/${leaveCS101Id}/review`,
      method: 'PUT',
      headers: teacherBHeaders
    }, {
      status: 'approved',
      reviewNote: 'Unauthorized teacher review'
    });
    assert(teacherBUnauthorizedReview.status === 403, `Teacher B cannot review Teacher A request: rejected with 403 (got ${teacherBUnauthorizedReview.status})`);

    // Verify leave status in DB remains pending after unauthorized attempts
    const checkUnmodified = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves/my',
      method: 'GET',
      headers: studentHeaders
    });
    const unmodifiedLeave = checkUnmodified.body.data.find(l => l._id === leaveCS101Id);
    assert(unmodifiedLeave && unmodifiedLeave.status === 'pending', 'Leave status remained pending after unauthorized attempts');

    console.log('\n4. Testing Scenario B — Authorized Approval & Status Synchronization');
    // Teacher A approves CS101 leave
    const approveRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/leaves/${leaveCS101Id}/review`,
      method: 'PUT',
      headers: teacherAHeaders
    }, {
      status: 'approved',
      reviewNote: 'Approved. Please review recorded lectures upon return.'
    });
    assert(approveRes.status === 200 && approveRes.body.success, 'Teacher A successfully approved CS101 leave');
    assert(approveRes.body.data.status === 'approved', 'Returned status is approved');
    assert(approveRes.body.data.reviewNote === 'Approved. Please review recorded lectures upon return.', 'Instructor remarks saved');

    // Teacher A dashboard pending count
    const teacherADash = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/dashboard/teacher',
      method: 'GET',
      headers: teacherAHeaders
    });
    const pendingInDash = teacherADash.body.data.pendingLeaves.some(l => l._id === leaveCS101Id);
    assert(!pendingInDash, 'Approved leave removed from Teacher A pending leaves on dashboard');

    // Student fetches /leaves/my (simulate page reload)
    const studentLeavesAfterApprove = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves/my',
      method: 'GET',
      headers: studentHeaders
    });
    const studentLeaveApproved = studentLeavesAfterApprove.body.data.find(l => l._id === leaveCS101Id);
    assert(studentLeaveApproved && studentLeaveApproved.status === 'approved', 'Student sees status Approved after teacher approval');
    assert(studentLeaveApproved.teacherComment === 'Approved. Please review recorded lectures upon return.' || studentLeaveApproved.reviewNote === 'Approved. Please review recorded lectures upon return.', 'Student sees faculty remarks');

    // Student dashboard also reflects approved status
    const studentDash = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/dashboard/student',
      method: 'GET',
      headers: studentHeaders
    });
    const dashLeaveApproved = studentDash.body.data.leaves.find(l => l._id === leaveCS101Id);
    assert(dashLeaveApproved && dashLeaveApproved.status === 'approved', 'Student dashboard reflects status Approved');

    console.log('\n5. Testing Scenario C — Authorized Rejection & Status Synchronization');
    // Teacher B rejects DS303 leave
    const rejectRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: `/api/leaves/${leaveDS303Id}/review`,
      method: 'PUT',
      headers: teacherBHeaders
    }, {
      status: 'rejected',
      reviewNote: 'Rejected due to in-person lab assessment scheduled on Nov 21.'
    });
    assert(rejectRes.status === 200 && rejectRes.body.success, 'Teacher B successfully rejected DS303 leave');
    assert(rejectRes.body.data.status === 'rejected', 'Returned status is rejected');

    // Student fetches /leaves/my
    const studentLeavesAfterReject = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves/my',
      method: 'GET',
      headers: studentHeaders
    });
    const studentLeaveRejected = studentLeavesAfterReject.body.data.find(l => l._id === leaveDS303Id);
    assert(studentLeaveRejected && studentLeaveRejected.status === 'rejected', 'Student sees status Rejected after teacher rejection');
    assert(studentLeaveRejected.teacherComment.includes('in-person lab assessment') || studentLeaveRejected.reviewNote.includes('in-person lab assessment'), 'Student sees rejection remarks');

    console.log('\n6. Testing Filter Queries & Counts');
    const teacherBPendingOnly = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves/teacher?status=pending',
      method: 'GET',
      headers: teacherBHeaders
    });
    assert(!teacherBPendingOnly.body.data.some(l => l._id === leaveDS303Id), 'Rejected leave does not appear under status=pending filter');

    const teacherBRejectedOnly = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/leaves/teacher?status=rejected',
      method: 'GET',
      headers: teacherBHeaders
    });
    assert(teacherBRejectedOnly.body.data.some(l => l._id === leaveDS303Id), 'Rejected leave appears under status=rejected filter');

    console.log('\n====================================================');
    console.log(`SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('====================================================');
    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  }
}

runTests();
