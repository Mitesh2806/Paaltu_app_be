// src/middleware/auth.middleware.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const protectRoute = async (req, res, next) => {
  try {
    // 1️⃣ Read auth header (case-insensitive)
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 2️⃣ Extract token
    const token = authHeader.replace(/^Bearer\s+/, '');

    // 3️⃣ Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      console.error('JWT verification failed:', err.message);
      return res.status(401).json({ error: 'Token is not valid' });
    }

    // 4️⃣ Load user (make sure your token uses `userId`)
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 5️⃣ Attach and continue
    req.user = user;
    next();
  } catch (error) {
    console.error('protectRoute error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

export default protectRoute;
