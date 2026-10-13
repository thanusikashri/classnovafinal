const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, text: body });
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

async function runTests() {
  console.log('🧪 Starting End-to-End Quiz Workflow Verification...\n');

  // 1. Login Teacher A
  const teacherLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'teacher@demo.classnova.local' });

  if (!teacherLogin.data.success) {
    throw new Error('Teacher login failed: ' + JSON.stringify(teacherLogin.data));
  }
  const teacherToken = teacherLogin.data.token;
  console.log('✓ 1. Teacher A logged in successfully.');

  // 2. Login Student
  const studentLogin = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'student@demo.classnova.local' });

  const studentToken = studentLogin.data.token;
  console.log('✓ 2. Student logged in successfully.');

  // 3. Login Teacher B (unauthorized teacher for CS101)
  const teacher2Login = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'teacher2@demo.classnova.local' });

  const teacher2Token = teacher2Login.data.token;
  console.log('✓ 3. Teacher B logged in successfully.');

  // 4. Test Question Limit Enforcement (11 questions should fail)
  const elevenQuestions = Array.from({ length: 11 }, (_, i) => ({
    text: `Question ${i + 1}?`,
    options: ['Option A', 'Option B', 'Option C', 'Option D'],
    correctOptionIndex: 0,
    marks: 1
  }));

  const failCreate = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/classes/class-cs101/quizzes',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`
    }
  }, {
    title: 'Quiz with 11 questions',
    description: 'Should be rejected',
    questions: elevenQuestions
  });

  if (failCreate.status === 400 && failCreate.data.message.includes('maximum 10')) {
    console.log('✓ 4. Enforce max 10 questions: Successfully rejected 11-question quiz (HTTP 400).');
  } else {
    throw new Error('Expected 400 rejection for 11 questions, got: ' + failCreate.status + ' ' + JSON.stringify(failCreate.data));
  }

  // 5. Create a valid 10-question quiz
  const tenQuestions = Array.from({ length: 10 }, (_, i) => ({
    text: `Test Question ${i + 1}: What is standard answer?`,
    options: [`Correct Option ${i + 1}`, `Wrong A`, `Wrong B`, `Wrong C`],
    correctOptionIndex: 0,
    marks: 1
  }));

  const createRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/classes/class-cs101/quizzes',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`
    }
  }, {
    title: 'CS101 Final Exam Quiz',
    description: 'Comprehensive 10-question assessment',
    durationMinutes: 25,
    isPublished: true,
    questions: tenQuestions
  });

  if (!createRes.data.success) {
    throw new Error('Failed to create 10-question quiz: ' + JSON.stringify(createRes.data));
  }
  const createdQuiz = createRes.data.data;
  const quizId = createdQuiz._id;
  console.log(`✓ 5. Teacher created and published 10-question quiz: ID ${quizId}.`);

  // 6. Security Check: Verify student cannot see correctOptionIndex before submission
  const studentQuizFetch = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/classes/class-cs101/quizzes/${quizId}`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${studentToken}` }
  });

  const studentQuestions = studentQuizFetch.data.data.questions;
  const leakedIndex = studentQuestions.some(q => q.correctOptionIndex !== undefined);
  if (!leakedIndex) {
    console.log('✓ 6. Security check: Student quiz fetch securely strips correctOptionIndex.');
  } else {
    throw new Error('Security vulnerability: correctOptionIndex leaked to student!');
  }

  // 7. Student starts attempt
  const startRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/classes/class-cs101/quizzes/${quizId}/attempts`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  });

  if (!startRes.data.success) {
    throw new Error('Student start attempt failed: ' + JSON.stringify(startRes.data));
  }
  const attemptId = startRes.data.data._id;
  console.log(`✓ 7. Student started attempt: ID ${attemptId}.`);

  // 8. Student submits 7 correct, 2 incorrect, 1 unanswered
  // Questions 0..6: correct (selectedOptionIndex = 0)
  // Questions 7..8: incorrect (selectedOptionIndex = 1)
  // Question 9: unanswered (selectedOptionIndex = -1 or omitted)
  const answersToSubmit = [];
  for (let i = 0; i < 7; i++) {
    answersToSubmit.push({
      questionId: studentQuestions[i]._id,
      selectedOptionIndex: 0
    });
  }
  for (let i = 7; i < 9; i++) {
    answersToSubmit.push({
      questionId: studentQuestions[i]._id,
      selectedOptionIndex: 1
    });
  }
  // Question 9 left out / unanswered

  const submitRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/classes/class-cs101/quizzes/${quizId}/attempts/${attemptId}`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${studentToken}`
    }
  }, { answers: answersToSubmit });

  if (!submitRes.data.success) {
    throw new Error('Student submit attempt failed: ' + JSON.stringify(submitRes.data));
  }
  const evaluatedAttempt = submitRes.data.data;
  console.log('✓ 8. Student submitted quiz attempt.');

  // 9. Verify Automatic Evaluation Accuracy
  console.log('\n--- Evaluating Score Consistency ---');
  console.log(`Score: ${evaluatedAttempt.score} / ${evaluatedAttempt.maxScore}`);
  console.log(`Percentage: ${evaluatedAttempt.percentage}%`);
  console.log(`Correct Count: ${evaluatedAttempt.correctCount}`);
  console.log(`Incorrect Count: ${evaluatedAttempt.incorrectCount}`);
  console.log(`Unanswered Count: ${evaluatedAttempt.unansweredCount}`);
  console.log(`Evaluation Status: ${evaluatedAttempt.evaluationStatus}`);

  if (evaluatedAttempt.correctCount !== 7) throw new Error(`Expected 7 correct, got ${evaluatedAttempt.correctCount}`);
  if (evaluatedAttempt.incorrectCount !== 2) throw new Error(`Expected 2 incorrect, got ${evaluatedAttempt.incorrectCount}`);
  if (evaluatedAttempt.unansweredCount !== 1) throw new Error(`Expected 1 unanswered, got ${evaluatedAttempt.unansweredCount}`);
  if (evaluatedAttempt.score !== 7) throw new Error(`Expected score 7, got ${evaluatedAttempt.score}`);
  if (evaluatedAttempt.maxScore !== 10) throw new Error(`Expected maxScore 10, got ${evaluatedAttempt.maxScore}`);
  if (evaluatedAttempt.percentage !== 70) throw new Error(`Expected percentage 70%, got ${evaluatedAttempt.percentage}%`);
  console.log('✓ 9. Evaluation counts, score (7/10), and percentage (70%) are 100% mathematically accurate.');

  // 10. Teacher A views quiz attempts
  const teacherAnalyticsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/classes/class-cs101/quizzes/${quizId}/attempts`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${teacherToken}` }
  });

  const attemptsList = teacherAnalyticsRes.data.data;
  const foundAttempt = attemptsList.find(a => a._id === attemptId);
  if (!foundAttempt) {
    throw new Error('Student attempt not found in Teacher A results analytics!');
  }
  console.log(`✓ 10. Student attempt successfully visible on Teacher A dashboard: Student name "${foundAttempt.student?.name}", Marks ${foundAttempt.score}/${foundAttempt.maxScore}.`);

  // 11. Security Check: Teacher B (unauthorized teacher) attempts to access Teacher A's quiz attempts
  const teacher2AnalyticsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/classes/class-cs101/quizzes/${quizId}/attempts`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${teacher2Token}` }
  });

  if (teacher2AnalyticsRes.status === 403) {
    console.log('✓ 11. Security check: Unauthorized Teacher B rejected with HTTP 403 Forbidden.');
  } else {
    throw new Error('Security flaw: Unauthorized teacher was not rejected! Status: ' + teacher2AnalyticsRes.status);
  }

  // 12. Teacher Manual Grading Adjustment
  const questionToAdjust = evaluatedAttempt.evaluation[7].questionId; // Question 8 (which was incorrect)
  const gradeRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: `/api/classes/class-cs101/quizzes/${quizId}/attempts/${attemptId}/grade`,
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${teacherToken}`
    }
  }, {
    evaluations: [
      { questionId: questionToAdjust, marksAwarded: 1, feedback: 'Awarded partial credit on teacher review.' }
    ],
    teacherNotes: 'Reviewed in office hours, student demonstrated reasoning.'
  });

  if (!gradeRes.data.success) {
    throw new Error('Manual grading adjustment failed: ' + JSON.stringify(gradeRes.data));
  }
  const regraded = gradeRes.data.data;
  console.log(`✓ 12. Teacher manual grading adjustment succeeded: New score ${regraded.score}/${regraded.maxScore} (${regraded.percentage}%), Notes: "${regraded.manualGrading?.teacherNotes}".`);

  if (regraded.score !== 8 || regraded.percentage !== 80) {
    throw new Error(`Expected regraded score 8 (80%), got score ${regraded.score} (${regraded.percentage}%)`);
  }

  console.log('\n🎉 ALL 12 END-TO-END WORKFLOW & SECURITY VERIFICATION TESTS PASSED!\n');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILURE:', err);
  process.exit(1);
});
