import { Router } from 'express';
import { RateLimitController } from '../controllers/RateLimitController.js';
import { adminAuthMiddleware } from '../middlewares/adminAuth.middleware.js';
import { apiKeyAuthMiddleware } from '../middlewares/apiKeyAuth.middleware.js';
const router = Router();
const controller = new RateLimitController();

router.post('/', apiKeyAuthMiddleware,(req, res, next) => controller.check(req, res, next));
router.get('/audit', adminAuthMiddleware,(req, res) => controller.auditLog(req, res));
router.get('/stats', adminAuthMiddleware,(req, res) => controller.stats(req, res));
router.delete('/cache', adminAuthMiddleware,(req, res, next) => controller.clearCache(req, res, next));

export default router;