import jwt from 'jsonwebtoken';

export function adminAuthMiddleware(req, res, next) {
  const token = req.cookies?.admin_session;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Not logged in' });
  }
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired session' });
  }
}