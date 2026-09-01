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
    role: u.role,
    phone: u.phone || '',
    defaultAddress: u.defaultAddress || null,
    default_address: u.defaultAddress || null,
    giftAddresses: (u.giftAddresses || []).map((ga) => ({
      id: ga._id ? ga._id.toString() : (ga.id || ''),
      recipientName: ga.recipientName,
      recipient_name: ga.recipientName,
      recipientPhone: ga.recipientPhone,
      recipient_phone: ga.recipientPhone,
      addressLine1: ga.addressLine1,
      address_line1: ga.addressLine1,
      addressLine2: ga.addressLine2 || '',
      address_line2: ga.addressLine2 || '',
      city: ga.city,
      state: ga.state,
      pincode: ga.pincode,
      isDefault: Boolean(ga.isDefault),
      is_default: Boolean(ga.isDefault)
    })),
    gift_addresses: (u.giftAddresses || []).map((ga) => ({
      id: ga._id ? ga._id.toString() : (ga.id || ''),
      recipient_name: ga.recipientName,
      recipient_phone: ga.recipientPhone,
      address_line1: ga.addressLine1,
      address_line2: ga.addressLine2 || '',
      city: ga.city,
      state: ga.state,
      pincode: ga.pincode,
      is_default: Boolean(ga.isDefault)
    }))
  };
}

export default {
  signToken,
  auth,
  optionalAuth,
  admin,
  safeUser
};
