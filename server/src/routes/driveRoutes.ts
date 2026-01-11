import express from 'express';
import { protect } from '../middleware/protect';
import { syncDrive } from '../controllers/driveController';

const router = express.Router();

router.post('/sync', protect, syncDrive);

export default router;
