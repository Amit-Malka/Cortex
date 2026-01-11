import express from 'express';
import { protect } from '../middleware/protect';
import { getFiles } from '../controllers/fileController';

const router = express.Router();

router.get('/', protect, getFiles);

export default router;
