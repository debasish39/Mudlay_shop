import { Router } from 'express';
import Order from '../models/Order.js';
import requireAdmin from '../middleware/requireAdmin.js';
const router = Router();
const statuses = ['placed','confirmed','packed','shipped','delivered','cancelled'];
router.get('/', requireAdmin, async (_req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 }).limit(200).populate('customer', 'name email phone').lean();
    res.json({ orders });
  } catch (e) { next(e); }
});
router.patch('/:id/status', requireAdmin, async (req, res, next) => {
  try {
    const status = String(req.body.status || '');
    if (!statuses.includes(status)) return res.status(400).json({ message: 'Invalid order status.' });
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true }).populate('customer', 'name email phone');
    if (!order) return res.status(404).json({ message: 'Order not found.' });
    res.json({ order });
  } catch (e) { next(e); }
});
export default router;
