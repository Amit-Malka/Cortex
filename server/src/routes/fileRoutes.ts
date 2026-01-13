import express from 'express';
import { protect } from '../middleware/protect';
import { getFiles, getStats, deleteFile, updateFile } from '../controllers/fileController';

const router = express.Router();

// Stats route must come BEFORE '/' to avoid route conflicts
router.get('/stats', protect, getStats);
router.get('/', protect, getFiles);

router.delete('/:id', protect, deleteFile);
router.patch('/:id', protect, updateFile);

export default router;
