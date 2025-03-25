import { Router } from 'express';
import { helloWorld } from '../controllers/room.controller';

const router = Router();

router.get('/hello', helloWorld);

export default router;