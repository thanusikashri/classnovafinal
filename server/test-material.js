const test = require('node:test');
const assert = require('node:assert');

const { createMaterial, getMaterials, downloadMaterial } = require('./src/controllers/material.controller');
const Class = require('./src/models/Class');
const StudyMaterial = require('./src/models/StudyMaterial');
const Notification = require('./src/models/Notification');
const cloudinaryService = require('./src/services/cloudinary.service');

test('Material Workflow Unit Tests', async (t) => {

  // Mocking dependencies
  Class.findById = async (id) => {
    if (id === 'class1') return { _id: 'class1', teacher: { toString: () => 'teacher1' }, students: ['student1'] };
    if (id === 'class2') return { _id: 'class2', teacher: { toString: () => 'teacher2' }, students: ['student2'] };
    return null;
  };
  
  StudyMaterial.create = async (data) => ({ ...data, _id: 'mat1' });
  StudyMaterial.find = () => ({ sort: () => ({ populate: async () => [{ _id: 'mat1', title: 'Test Mat', fileUrl: 'http://test', fileName: 'test.pdf' }] }) });
  StudyMaterial.findOne = async () => ({ _id: 'mat1', title: 'Test Mat', fileUrl: 'http://test', fileName: 'test.pdf' });
  Notification.insertMany = async () => {};

  await t.test('Missing title or file', async () => {
    const mockReq = { 
      params: { classId: 'class1' }, 
      user: { id: 'teacher1', role: 'teacher' },
      body: { title: '' }, // missing file
      file: null 
    };
    
    let resData, resStatus;
    const mockRes = { status: (code) => { resStatus = code; return { json: (data) => { resData = data; } }; } };

    await createMaterial(mockReq, mockRes, () => {});
    
    assert.strictEqual(resStatus, 400);
    assert.strictEqual(resData.message, 'Please provide a file to upload');
  });

  await t.test('Unauthorized teacher', async () => {
    const mockReq = { 
      params: { classId: 'class2' }, // class belongs to teacher2
      user: { id: 'teacher1', role: 'teacher' },
      body: { title: 'T' }, 
      file: { buffer: Buffer.from('test') } 
    };
    
    let resData, resStatus;
    const mockRes = { status: (code) => { resStatus = code; return { json: (data) => { resData = data; } }; } };

    await createMaterial(mockReq, mockRes, () => {});
    
    assert.strictEqual(resStatus, 403);
    assert.strictEqual(resData.message, 'Not authorized to add materials for this class');
  });

  await t.test('Student access to another class\'s materials', async () => {
    const mockReq = { 
      params: { classId: 'class2' }, // class belongs to teacher2, students: student2
      user: { id: 'student1', role: 'student' }
    };
    
    let resData, resStatus;
    const mockRes = { status: (code) => { resStatus = code; return { json: (data) => { resData = data; } }; } };

    await getMaterials(mockReq, mockRes, () => {});
    
    assert.strictEqual(resStatus, 403);
    assert.strictEqual(resData.message, 'Not authorized to access materials for this class');
  });

  await t.test('Upload failure', async () => {
    const mockReq = { 
      params: { classId: 'class1' }, 
      user: { id: 'teacher1', role: 'teacher' },
      body: { title: 'T' }, 
      file: { buffer: Buffer.from('test') } 
    };
    
    process.env.CLOUDINARY_CLOUD_NAME = 'dummy';
    process.env.CLOUDINARY_API_KEY = 'dummy';
    
    // override cloudinary service to fail
    const originalUpload = cloudinaryService.uploadToCloudinary;
    cloudinaryService.uploadToCloudinary = () => Promise.reject(new Error('Cloudinary error'));

    let resData, resStatus;
    const mockRes = { status: (code) => { resStatus = code; return { json: (data) => { resData = data; } }; } };

    await createMaterial(mockReq, mockRes, () => {});
    
    cloudinaryService.uploadToCloudinary = originalUpload;

    assert.strictEqual(resStatus, 500);
    assert.strictEqual(resData.message, 'Failed to upload file to Cloudinary');
  });

  await t.test('Successful material creation', async () => {
    const mockReq = { 
      params: { classId: 'class1' }, 
      user: { id: 'teacher1', role: 'teacher' },
      body: { title: 'Valid Title' }, 
      file: { buffer: Buffer.from('test'), originalname: 'test.pdf', mimetype: 'application/pdf' } 
    };
    
    process.env.CLOUDINARY_CLOUD_NAME = 'dummy';
    process.env.CLOUDINARY_API_KEY = 'dummy';

    const originalUpload = cloudinaryService.uploadToCloudinary;
    cloudinaryService.uploadToCloudinary = () => Promise.resolve({ secure_url: 'http://cloudinary.com/test.pdf' });

    let resData, resStatus;
    const mockRes = { status: (code) => { resStatus = code; return { json: (data) => { resData = data; } }; } };

    await createMaterial(mockReq, mockRes, () => {});
    
    cloudinaryService.uploadToCloudinary = originalUpload;

    assert.strictEqual(resStatus, 201);
    assert.strictEqual(resData.success, true);
    assert.strictEqual(resData.data.fileUrl, 'http://cloudinary.com/test.pdf');
  });

  await t.test('Successful listing of the created material', async () => {
    const mockReq = { 
      params: { classId: 'class1' },
      user: { id: 'student1', role: 'student' }
    };
    
    let resData, resStatus;
    const mockRes = { status: (code) => { resStatus = code; return { json: (data) => { resData = data; } }; } };

    await getMaterials(mockReq, mockRes, () => {});
    
    assert.strictEqual(resStatus, 200);
    assert.strictEqual(resData.success, true);
    assert.strictEqual(resData.data.length, 1);
    assert.strictEqual(resData.data[0].title, 'Test Mat');
  });

  await t.test('Successful download material (authorization)', async () => {
    const mockReq = { 
      params: { classId: 'class2', materialId: 'mat1' }, // not enrolled
      user: { id: 'student1', role: 'student' }
    };
    
    let resData, resStatus;
    const mockRes = { status: (code) => { resStatus = code; return { json: (data) => { resData = data; } }; } };

    await downloadMaterial(mockReq, mockRes, () => {});
    
    assert.strictEqual(resStatus, 403);
    assert.strictEqual(resData.message, 'Not authorized to download materials for this class');
  });

});
