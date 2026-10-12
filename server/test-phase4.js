const test = require('node:test');
const assert = require('node:assert');
const mongoose = require('mongoose');

// Mock models
const Notification = require('./src/models/Notification');
const Class = require('./src/models/Class');
const User = require('./src/models/User');

const { markRead } = require('./src/controllers/notification.controller');
const { getTeacherDashboard } = require('./src/controllers/dashboard.controller');
const { getAdminStats } = require('./src/controllers/admin.controller');

test('Phase 4 Unit Tests', async (t) => {

  await t.test('Notification recipient isolation', async () => {
    const mockReq = {
      user: { id: 'user1' },
      params: { id: 'notif1' }
    };
    
    // Mock the Notification.findById
    Notification.findById = async (id) => ({
      _id: id,
      recipient: { toString: () => 'user2' }, // Belonging to someone else
      isRead: false,
      save: async () => {}
    });

    let responseData = null;
    let statusCode = null;
    const mockRes = { 
      status: (code) => {
        statusCode = code;
        return { json: (data) => { responseData = data; } };
      }
    };
    const mockNext = (err) => { };

    await markRead(mockReq, mockRes, mockNext);
    
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(responseData.message, 'Not authorized to access this notification');
  });

  await t.test('Dashboard authorization and aggregation (Teacher)', async () => {
    const mockReq = {
      user: { id: 'teacher1', role: 'teacher' }
    };

    Class.find = () => ({
      populate: async () => [
        { _id: 'class1', teacher: 'teacher1', name: 'Math' }
      ]
    });
    
    const Announcement = require('./src/models/Announcement');
    Announcement.find = () => ({
      populate: () => ({
        populate: () => ({
          sort: () => ({
            limit: async () => [
              { _id: 'ann1', classId: 'class1', content: 'Test announcement' }
            ]
          })
        })
      })
    });

    const StudyMaterial = require('./src/models/StudyMaterial');
    StudyMaterial.find = () => ({
      populate: () => ({
        populate: () => ({
          sort: () => ({
            limit: async () => [
              { _id: 'mat1', classId: 'class1', title: 'Test material' }
            ]
          })
        })
      })
    });

    let responseData = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => { responseData = data; }
      })
    };
    const mockNext = (err) => { console.error(err); };

    await getTeacherDashboard(mockReq, mockRes, mockNext);
    
    assert.ok(responseData.success);
    assert.strictEqual(responseData.data.classes.length, 1);
    assert.strictEqual(responseData.data.announcements.length, 1);
    // Honest absent values
    assert.strictEqual(responseData.data.todaysAttendance, null);
    assert.strictEqual(responseData.data.pendingLeaves, null);
  });

  await t.test('Admin-only statistics', async () => {
    User.countDocuments = async (query) => {
      if (!query) return 100;
      if (query.role === 'student') return 80;
      if (query.role === 'teacher') return 15;
      if (query.role === 'admin') return 5;
    };
    Class.countDocuments = async () => 20;
    const Assignment = require('./src/models/Assignment');
    Assignment.countDocuments = async () => 50;

    let responseData = null;
    const mockRes = {
      status: (code) => ({
        json: (data) => { responseData = data; }
      })
    };
    const mockNext = (err) => { console.error(err); };

    await getAdminStats({}, mockRes, mockNext);

    assert.ok(responseData.success);
    assert.strictEqual(responseData.data.users.total, 100);
    assert.strictEqual(responseData.data.classes, 20);
    assert.strictEqual(responseData.data.assessments, null);
  });
});
