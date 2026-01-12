import express from 'express';
import { protect } from '../middleware/protect';
import { chat } from '../controllers/chatController';

const router = express.Router();

router.post('/', protect, chat);

export default router;
