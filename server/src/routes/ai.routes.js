const express = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { generateQuizQuestions, generateQuizQuestionsFromPdf, validateQuestionCount } = require('../services/aiGenerator.service');
const { extractTextFromPdfBuffer } = require('../services/pdfExtractor.service');
const Class = require('../models/Class');

const router = express.Router();

router.use(authenticate);

// Configure multer memory storage with 10MB limit for PDF upload
const pdfUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10 MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF documents are supported. Please upload a valid .pdf file.'));
    }
  }
}).single('pdf');

// Wrapper middleware to catch multer upload errors cleanly
const handlePdfUpload = (req, res, next) => {
  pdfUpload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          message: 'The uploaded PDF file exceeds the 10 MB maximum size limit.'
        });
      }
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next();
  });
};

// @desc    Generate draft quiz questions with maximum 10 questions limit
// @route   POST /api/ai/generate-quiz
// @access  Private (Teacher, Admin)
router.post('/generate-quiz', authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const { topic, questionCount = 10, difficulty = 'medium' } = req.body;

    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Topic is required for quiz generation'
      });
    }

    let validatedCount;
    try {
      validatedCount = validateQuestionCount(questionCount);
    } catch (valErr) {
      return res.status(400).json({
        success: false,
        message: valErr.message
      });
    }

    const result = await generateQuizQuestions({
      topic: topic.trim(),
      questionCount: validatedCount,
      difficulty
    });

    res.status(200).json({
      success: true,
      count: result.questions.length,
      data: result
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Generate quiz questions from uploaded PDF document
// @route   POST /api/ai/generate-quiz-from-pdf
// @access  Private (Teacher, Admin)
router.post('/generate-quiz-from-pdf', authorize('teacher', 'admin'), handlePdfUpload, async (req, res, next) => {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        success: false,
        message: 'Please select a valid PDF file to upload.'
      });
    }

    const { classId, questionCount = 10, questionType = 'multiple_choice', difficulty = 'medium' } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Please select an authorized course (classId) for this quiz.'
      });
    }

    // Verify course exists and teacher is authorized
    const cls = await Class.findById(classId);
    if (!cls) {
      return res.status(404).json({
        success: false,
        message: 'Target course not found.'
      });
    }

    const isAuthorized = cls.teacher.toString() === req.user.id || req.user.role === 'admin';
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to create quizzes for this course.'
      });
    }

    let validatedCount;
    try {
      validatedCount = validateQuestionCount(questionCount);
    } catch (valErr) {
      return res.status(400).json({
        success: false,
        message: valErr.message
      });
    }

    // Step 1: Extract text from uploaded PDF buffer
    let extraction;
    try {
      extraction = await extractTextFromPdfBuffer(req.file.buffer);
    } catch (extractErr) {
      return res.status(400).json({
        success: false,
        message: extractErr.message
      });
    }

    // Step 2: Generate questions grounded in document content
    const quizData = await generateQuizQuestionsFromPdf({
      documentText: extraction.text,
      questionCount: validatedCount,
      questionType,
      difficulty,
      courseName: cls.name,
      fileName: req.file.originalname
    });

    res.status(200).json({
      success: true,
      count: quizData.questions.length,
      data: {
        ...quizData,
        classId: cls._id,
        className: cls.name,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        pagesCount: extraction.pagesCount
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

