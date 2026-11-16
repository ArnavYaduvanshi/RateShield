import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

export class AdminAuthController {
  async login(req, res) {
    console.log("start");
    const { password } = req.body;
    const isValid = await bcrypt.compare(password || '', process.env.ADMIN_PASSWORD_HASH);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    const token = jwt.sign({ role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '12h' });
    res.cookie('admin_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 12 * 60 * 60 * 1000,
    });
    return res.json({ success: true });
  }

  async logout(req, res) {
    res.clearCookie('admin_session');
    return res.json({ success: true });
  }

  async checkSession(req, res) {
    return res.json({ authenticated: true });
  }
}