import { Router } from 'express';
import { getDashboard } from '../controllers/dashboard.controller.js';
import { protect } from '../middlewares/auth.middleware.js';

const router = Router();

// All dashboard routes require authentication
router.use(protect);

router.get('/', getDashboard);

export default router;
