import { Router } from 'express';
import {
  uploadNote,
  getNotes,
  getNote,
  deleteNote,
  updateNote,
} from '../controllers/note.controller.js';
import { protect } from '../middlewares/auth.middleware.js';
import { uploadPdf } from '../middlewares/upload.middleware.js';

const router = Router();

// All note routes require authentication
router.use(protect);

router.post('/upload', uploadPdf, uploadNote);
router.get('/', getNotes);
router.get('/:id', getNote);
router.delete('/:id', deleteNote);
router.patch('/:id', updateNote);

export default router;
