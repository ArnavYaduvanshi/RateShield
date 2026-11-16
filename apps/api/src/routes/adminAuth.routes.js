import { Router } from 'express';
import { AdminAuthController } from '../controllers/adminAuthController.js';
import { adminAuthMiddleware } from '../middlewares/adminAuth.middleware.js';

const router = Router();
const controller = new AdminAuthController();

router.post('/login', (req, res) => controller.login(req, res));
router.post('/logout', (req, res) => controller.logout(req, res));
router.get('/check', adminAuthMiddleware, (req, res) => controller.checkSession(req, res));

export default router;