const mongoose = require('mongoose');

/**
 * AssessmentAdapter provides a robust platform-side abstraction for Member 2's assessment engine.
 * 
 * If Member 2's Quiz / QuizAttempt models exist in the DB, it queries real data safely.
 * If no assessments exist or the module is unavailable, it returns truthful empty/null metrics
 * and NEVER fabricates quizzes, scores, or dates.
 */

class AssessmentAdapter {
  /**
   * Get public or published quizzes for a class
   */
  async getClassQuizzes(classId) {
    try {
      if (!mongoose.models.Quiz) {
        return { isAvailable: false, quizzes: [] };
      }
      const Quiz = mongoose.model('Quiz');
      const quizzes = await Quiz.find({ classId, isPublished: true })
        .select('title durationMinutes startTime endTime createdAt')
        .sort('-createdAt');
      return { isAvailable: true, quizzes: quizzes || [] };
    } catch (err) {
      console.warn('AssessmentAdapter: error fetching class quizzes', err.message);
      return { isAvailable: false, quizzes: [] };
    }
  }

  /**
   * Get upcoming assessments for a student across enrolled classes
   */
  async getStudentUpcomingAssessments(classIds, studentId) {
    try {
      if (!mongoose.models.Quiz || !classIds || classIds.length === 0) {
        return { isAvailable: !!mongoose.models.Quiz, items: [] };
      }
      const Quiz = mongoose.model('Quiz');
      const now = new Date();
      const quizzes = await Quiz.find({
        classId: { $in: classIds },
        isPublished: true,
        endTime: { $gt: now }
      })
      .populate('classId', 'name')
      .sort('endTime')
      .limit(5);

      return { isAvailable: true, items: quizzes || [] };
    } catch (err) {
      console.warn('AssessmentAdapter: error fetching upcoming student assessments', err.message);
      return { isAvailable: false, items: [] };
    }
  }

  /**
   * Get overall assessment statistics for the admin dashboard
   */
  async getAdminAssessmentStats() {
    try {
      if (!mongoose.models.Quiz) {
        return { isAvailable: false, totalQuizzes: 0, totalAttempts: 0 };
      }
      const Quiz = mongoose.model('Quiz');
      const totalQuizzes = await Quiz.countDocuments();
      
      let totalAttempts = 0;
      if (mongoose.models.QuizAttempt) {
        const QuizAttempt = mongoose.model('QuizAttempt');
        totalAttempts = await QuizAttempt.countDocuments();
      }

      return {
        isAvailable: true,
        totalQuizzes,
        totalAttempts
      };
    } catch (err) {
      console.warn('AssessmentAdapter: error fetching admin assessment stats', err.message);
      return { isAvailable: false, totalQuizzes: 0, totalAttempts: 0 };
    }
  }
}

module.exports = new AssessmentAdapter();
