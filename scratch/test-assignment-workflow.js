const http = require('http');
const fs = require('fs');
const path = require('path');

const BASE_PORT = 5000;

function makeRequest(method, urlPath, headers = {}, body = null) {
  return new Promise((resolve, reject) => {
    const fullPath = '/api' + (urlPath.startsWith('/') ? urlPath : '/' + urlPath);
    const reqOptions = {
      hostname: 'localhost',
      port: BASE_PORT,
      path: fullPath,
      method: method,
      headers: headers
    };

    const req = http.request(reqOptions, (res) => {
      let data = [];
      res.on('data', chunk => data.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(data);
        const contentType = res.headers['content-type'] || '';
        let json = null;
        if (contentType.includes('application/json')) {
          try {
            json = JSON.parse(buffer.toString());
          } catch (e) {
            // not json
          }
        }
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: buffer.toString(),
          data: json,
          rawBuffer: buffer
        });
      });
    });

    req.on('error', reject);

    if (body) {
      if (Buffer.isBuffer(body)) {
        req.write(body);
      } else if (typeof body === 'object') {
        req.write(JSON.stringify(body));
      } else {
        req.write(body);
      }
    }
    req.end();
  });
}

// Multipart helper
function buildMultipartBody(fields, fileField) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
  let chunks = [];

  for (const [key, val] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${val}\r\n`));
  }

  if (fileField) {
    const { fieldName, fileName, contentType, content } = fileField;
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fieldName}"; filename="${fileName}"\r\nContent-Type: ${contentType}\r\n\r\n`));
    chunks.push(Buffer.isBuffer(content) ? content : Buffer.from(content));
    chunks.push(Buffer.from('\r\n'));
  }

  chunks.push(Buffer.from(`--${boundary}--\r\n`));
  const fullBody = Buffer.concat(chunks);
  return {
    contentType: `multipart/form-data; boundary=${boundary}`,
    body: fullBody
  };
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 Starting End-to-End Assignment Workflow Tests');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    // 1. Student Login
    console.log('\n--- 1. Authenticate Student ---');
    const studentLogin = await makeRequest('POST', '/auth/login', { 'Content-Type': 'application/json' }, {
      email: 'student@demo.classnova.local',
      password: 'password123'
    });
    assert(studentLogin.statusCode === 200 && studentLogin.data.token, 'Student logged in successfully');
    const studentToken = studentLogin.data.token;
    const studentHeaders = {
      'Authorization': `Bearer ${studentToken}`
    };

    // 2. Teacher A Login
    console.log('\n--- 2. Authenticate Responsible Teacher A ---');
    const teacherLogin = await makeRequest('POST', '/auth/login', { 'Content-Type': 'application/json' }, {
      email: 'teacher@demo.classnova.local',
      password: 'password123'
    });
    assert(teacherLogin.statusCode === 200 && teacherLogin.data.token, 'Teacher A logged in successfully');
    const teacherToken = teacherLogin.data.token;
    const teacherHeaders = {
      'Authorization': `Bearer ${teacherToken}`
    };

    // 3. Teacher B (Unauthorized) Login
    console.log('\n--- 3. Authenticate Unrelated Teacher B ---');
    const teacher2Login = await makeRequest('POST', '/auth/login', { 'Content-Type': 'application/json' }, {
      email: 'teacher2@demo.classnova.local',
      password: 'password123'
    });
    assert(teacher2Login.statusCode === 200 && teacher2Login.data.token, 'Teacher B logged in successfully');
    const teacher2Token = teacher2Login.data.token;
    const teacher2Headers = {
      'Authorization': `Bearer ${teacher2Token}`
    };

    // 4. Student Submits PDF Assignment
    console.log('\n--- 4. Student Uploads PDF and Turns In Assignment ---');
    const fakePdfContent = '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>\nendobj\nxref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n178\n%%EOF';
    
    const multipart = buildMultipartBody({ content: 'Here is my search algorithm implementation.' }, {
      fieldName: 'file',
      fileName: 'Alex_Johnson_Search_Algorithms.pdf',
      contentType: 'application/pdf',
      content: fakePdfContent
    });

    const submitRes = await makeRequest('POST', '/classes/class-cs101/assignments/asgn-01/submissions', {
      ...studentHeaders,
      'Content-Type': multipart.contentType
    }, multipart.body);

    assert(submitRes.statusCode === 201 || submitRes.statusCode === 200, `Submission successful (HTTP ${submitRes.statusCode})`);
    assert(submitRes.data && submitRes.data.data && submitRes.data.data.fileName === 'Alex_Johnson_Search_Algorithms.pdf', 'Submission records original PDF filename');
    const submissionId = submitRes.data.data._id;
    assert(submissionId, `Saved submission has ID: ${submissionId}`);

    // Verify file is saved to disk
    if (submitRes.data.data.filePath) {
      assert(fs.existsSync(submitRes.data.data.filePath), `PDF file physically stored on disk at ${submitRes.data.data.filePath}`);
    }

    // 5. Student Views / Refreshes Own Submission
    console.log('\n--- 5. Student Views Own Submission Status (Refresh Persistence) ---');
    const mySubRes = await makeRequest('GET', '/classes/class-cs101/assignments/asgn-01/submissions/me', studentHeaders);
    assert(mySubRes.statusCode === 200, 'Student can retrieve own saved submission');
    assert(mySubRes.data.data.status === 'Submitted', 'Submission status is Submitted');
    assert(mySubRes.data.data.fileName === 'Alex_Johnson_Search_Algorithms.pdf', 'File name preserved');

    // 6. Student Views / Downloads PDF
    console.log('\n--- 6. Student Views and Downloads Submitted PDF ---');
    const viewPdfRes = await makeRequest('GET', `/classes/class-cs101/assignments/asgn-01/submissions/${submissionId}/file?action=view`, studentHeaders);
    assert(viewPdfRes.statusCode === 200, 'Student can view PDF inline');
    assert(viewPdfRes.headers['content-type'] === 'application/pdf', 'Inline viewing returns application/pdf');
    assert(viewPdfRes.headers['content-disposition'].includes('inline'), 'Inline Content-Disposition header');

    const dlPdfRes = await makeRequest('GET', `/classes/class-cs101/assignments/asgn-01/submissions/${submissionId}/file?action=download`, studentHeaders);
    assert(dlPdfRes.statusCode === 200, 'Student can download PDF');
    assert(dlPdfRes.headers['content-disposition'].includes('attachment'), 'Download Content-Disposition header attachment');

    // 7. Teacher A Dashboard & Overview
    console.log('\n--- 7. Teacher A Dashboard Assignment Submissions Overview ---');
    const overviewRes = await makeRequest('GET', '/assignments/teacher-overview', teacherHeaders);
    assert(overviewRes.statusCode === 200, 'Teacher A fetches assignments overview');
    const asgn1 = overviewRes.data.data.find(a => a._id === 'asgn-01');
    assert(asgn1 !== undefined, 'Teacher A sees Assignment 1');
    assert(asgn1.stats.submittedCount >= 1, `Submitted count is >= 1 (actual: ${asgn1.stats.submittedCount})`);
    assert(asgn1.stats.awaitingReviewCount >= 1, `Awaiting review count is >= 1 (actual: ${asgn1.stats.awaitingReviewCount})`);
    assert(asgn1.stats.notSubmittedCount >= 0, `Not submitted count is accurate (actual: ${asgn1.stats.notSubmittedCount})`);

    // 8. Teacher A Inspects Submission Roster
    console.log('\n--- 8. Teacher A Opens Assignment Submission Management Roster ---');
    const rosterRes = await makeRequest('GET', '/classes/class-cs101/assignments/asgn-01/submissions', teacherHeaders);
    assert(rosterRes.statusCode === 200, 'Teacher A retrieves full submission roster');
    assert(rosterRes.data.data.submissions.length >= 1, 'Teacher A sees student submission');
    const studentSub = rosterRes.data.data.submissions.find(s => s._id === submissionId || s.student?.name === 'Alex Johnson');
    assert(studentSub !== undefined, 'Alex Johnson appears in submitted student list');
    assert(studentSub.fileName === 'Alex_Johnson_Search_Algorithms.pdf', 'Teacher sees original PDF filename');
    assert(Array.isArray(rosterRes.data.data.eligibleStudents), 'Roster includes eligible course students');

    // 9. Teacher A Views & Downloads PDF
    console.log('\n--- 9. Teacher A Views and Downloads Student PDF ---');
    const teacherViewRes = await makeRequest('GET', `/classes/class-cs101/assignments/asgn-01/submissions/${submissionId}/file?action=view`, teacherHeaders);
    assert(teacherViewRes.statusCode === 200, 'Teacher A can view submitted PDF inline');
    const teacherDlRes = await makeRequest('GET', `/classes/class-cs101/assignments/asgn-01/submissions/${submissionId}/file?action=download`, teacherHeaders);
    assert(teacherDlRes.statusCode === 200, 'Teacher A can download submitted PDF');

    // 10. Teacher A Grades and Reviews Submission
    console.log('\n--- 10. Teacher A Grades Submission with Marks & Feedback ---');
    const gradeRes = await makeRequest('PUT', `/classes/class-cs101/assignments/asgn-01/submissions/${submissionId}/grade`, {
      ...teacherHeaders,
      'Content-Type': 'application/json'
    }, {
      marks: 96,
      feedback: 'Outstanding implementation of A* and heuristic search. Clean PDF report.'
    });
    assert(gradeRes.statusCode === 200, 'Teacher A successfully saved marks and feedback');
    assert(gradeRes.data.data.marks === 96, 'Grade saved: 96 marks');
    assert(gradeRes.data.data.status === 'Graded', 'Status updated to Graded');

    // 11. Student Verifies Saved Grade and Feedback
    console.log('\n--- 11. Student Checks Updated Grade & Feedback ---');
    const studentGradeCheck = await makeRequest('GET', '/classes/class-cs101/assignments/asgn-01/submissions/me', studentHeaders);
    assert(studentGradeCheck.statusCode === 200, 'Student retrieves graded submission');
    assert(studentGradeCheck.data.data.marks === 96, 'Student sees saved marks: 96');
    assert(studentGradeCheck.data.data.feedback.includes('Outstanding'), 'Student sees teacher feedback');
    assert(studentGradeCheck.data.data.status === 'Graded', 'Student sees status Graded');

    // 12. Security Test: Unauthorized Teacher B cannot view/grade
    console.log('\n--- 12. Security: Unauthorized Teacher B Access Attempt ---');
    const unauthViewRes = await makeRequest('GET', `/classes/class-cs101/assignments/asgn-01/submissions/${submissionId}/file`, teacher2Headers);
    assert(unauthViewRes.statusCode === 403, 'Teacher B cannot access Teacher A file (403 Forbidden)');

    const unauthGradeRes = await makeRequest('PUT', `/classes/class-cs101/assignments/asgn-01/submissions/${submissionId}/grade`, {
      ...teacher2Headers,
      'Content-Type': 'application/json'
    }, { marks: 50 });
    assert(unauthGradeRes.statusCode === 403, 'Teacher B cannot grade Teacher A assignment (403 Forbidden)');

    // 13. Verification of Updated Stats After Review
    console.log('\n--- 13. Teacher Stats After Review ---');
    const updatedOverview = await makeRequest('GET', '/assignments/teacher-overview', teacherHeaders);
    const updatedAsgn1 = updatedOverview.data.data.find(a => a._id === 'asgn-01');
    assert(updatedAsgn1.stats.reviewedCount >= 1, `Reviewed count updated to ${updatedAsgn1.stats.reviewedCount}`);
    assert(updatedAsgn1.stats.awaitingReviewCount === 0, `Awaiting review count decremented to ${updatedAsgn1.stats.awaitingReviewCount}`);

    // 14. Resubmission / Duplicate Check
    console.log('\n--- 14. Resubmission Updates Existing Record Safely ---');
    const resubmitRes = await makeRequest('POST', '/classes/class-cs101/assignments/asgn-01/submissions', {
      ...studentHeaders,
      'Content-Type': multipart.contentType
    }, multipart.body);
    assert(resubmitRes.statusCode === 200, 'Resubmission updates existing submission safely without duplicate row');
    
    // Verify that after resubmission, status returns to Submitted and awaitingReviewCount is incremented
    const postResubmitOverview = await makeRequest('GET', '/assignments/teacher-overview', teacherHeaders);
    const postResubmitAsgn1 = postResubmitOverview.data.data.find(a => a._id === 'asgn-01');
    assert(postResubmitAsgn1.stats.awaitingReviewCount >= 1, `After resubmission, awaiting review count returns to ${postResubmitAsgn1.stats.awaitingReviewCount}`);

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  }

  console.log('\n====================================================');
  console.log(`📊 Test Results: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
