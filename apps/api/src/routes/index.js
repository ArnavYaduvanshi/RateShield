import { Router } from 'express';
import rateLimitRoutes from './rateLimit.routes.js';
import clientRoutes from './client.routes.js';
import adminAuthRoutes from './adminAuth.routes.js'
import { adminAuthMiddleware } from '../middlewares/adminAuth.middleware.js';

const router = Router();

router.use('/admin',adminAuthRoutes)
router.use('/clients', adminAuthMiddleware ,clientRoutes);
router.use('/check',rateLimitRoutes);

export default router;