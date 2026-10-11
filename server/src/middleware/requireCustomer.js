import jwt from 'jsonwebtoken';
import Customer from '../models/Customer.js';
export default async function requireCustomer(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!token) return res.status(401).json({ message: 'Please sign in to continue.' });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.role !== 'customer') return res.status(403).json({ message: 'Customer access required.' });
    const customer = await Customer.findById(payload.sub);
    if (!customer) return res.status(401).json({ message: 'Account not found. Please sign in again.' });
    req.customer = customer;
    next();
  } catch (error) {
    return res.status(401).json({ message: error.name === 'TokenExpiredError' ? 'Session expired. Please sign in again.' : 'Invalid session. Please sign in again.' });
  }
}
