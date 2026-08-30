import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.warn('⚠️ WARNING: JWT_SECRET environment variable is missing. Authentication may be insecure.');
}

const EFFECTIVE_SECRET = JWT_SECRET || 'dev-secret-change-me-long-random-string-12345';

export function signToken(user) {
  const id = user.id || (user._id ? user._id.toString() : '');
  return jwt.sign(
    {
      id,
      email: String(user.email).toLowerCase().trim(),
      role: user.role || 'customer',
      name: user.name
    },
    EFFECTIVE_SECRET,
    {
      algorithm: 'HS256',
      expiresIn: '7d'
    }
  );
}

export function auth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required. Please login.' });
  }

  const token = h.slice(7).trim();
  if (!token) {
    return res.status(401).json({ error: 'Authentication token missing.' });
  }

  try {
    const decoded = jwt.verify(token, EFFECTIVE_SECRET, {
      algorithms: ['HS256']
    });

    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: 'Invalid token payload.' });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      name: decoded.name
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Session expired. Please login again.' });
    }
    return res.status(401).json({ error: 'Invalid or malformed authentication token.' });
  }
}

export function optionalAuth(req, res, next) {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  const token = h.slice(7).trim();
  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, EFFECTIVE_SECRET, {
      algorithms: ['HS256']
    });
    req.user = decoded && decoded.id ? decoded : null;
  } catch {
    req.user = null;
  }
  next();
}

export function admin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Administrative privileges required.' });
  }
  next();
}

export function safeUser(u) {
  return {
    id: u.id || (u._id ? u._id.toString() : ''),
    name: u.name,
    email: u.email,
    role: u.role
  };
}

export default {
  signToken,
  auth,
  optionalAuth,
  admin,
  safeUser
};
