import { Router } from 'express';
import {
  getAssessmentCatalog,
  getQuizQuestions,
  submitQuiz,
  getChallengeDetails,
  runCodeChallenge,
  submitChallengeSolution,
  getStudentAssessmentHistory,
} from '../controllers/assessmentController.js';
import { authenticate } from '../middleware/authMiddleware.js';

const router = Router();

// Catalog & Questions
router.get('/catalog', authenticate, getAssessmentCatalog);
router.get('/quiz-questions', authenticate, getQuizQuestions);
router.post('/quiz-submit', authenticate, submitQuiz);

// Coding Challenges
router.get('/challenge/:challengeId', authenticate, getChallengeDetails);
router.post('/run-code', authenticate, runCodeChallenge);
router.post('/submit-solution', authenticate, submitChallengeSolution);

// Student History
router.get('/history', authenticate, getStudentAssessmentHistory);

export default router;
