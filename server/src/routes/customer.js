import { Router } from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import Customer from '../models/Customer.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import requireCustomer from '../middleware/requireCustomer.js';
const router = Router();
const safeCustomer = (c) => ({ id: c._id, name: c.name, email: c.email, phone: c.phone || '' });
const sign = (c) => jwt.sign({ sub: c._id.toString(), role: 'customer' }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

router.post('/register', async (req, res, next) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    if (name.length < 2) return res.status(400).json({ message: 'Enter your name (at least 2 characters).' });
    if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ message: 'Enter a valid email address.' });
    if (password.length < 8) return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    if (await Customer.exists({ email })) return res.status(409).json({ message: 'An account with this email already exists. Sign in instead.' });
    const customer = await Customer.create({ name, email, password, phone: String(req.body.phone || '').trim() });
    res.status(201).json({ token: sign(customer), user: safeCustomer(customer) });
  } catch (e) { next(e); }
});

router.post('/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const customer = await Customer.findOne({ email }).select('+password');
    if (!customer || !(await customer.comparePassword(password))) return res.status(401).json({ message: 'Invalid email or password.' });
    res.json({ token: sign(customer), user: safeCustomer(customer) });
  } catch (e) { next(e); }
});

router.get('/me', requireCustomer, async (req, res, next) => {
  try {
    const c = await Customer.findById(req.customer._id).populate('favorites').populate('cart.product');
    res.json({ user: safeCustomer(c), favorites: c.favorites.filter(Boolean), cart: c.cart.filter(i => i.product).map(i => ({ product: i.product, quantity: i.quantity })) });
  } catch (e) { next(e); }
});

router.put('/me/state', requireCustomer, async (req, res, next) => {
  try {
    const favoriteIds = Array.isArray(req.body.favorites) ? req.body.favorites : [];
    const cartInput = Array.isArray(req.body.cart) ? req.body.cart : [];
    const validIds = (ids) => ids.filter(id => mongoose.isValidObjectId(id)).map(String);
    const favorites = [...new Set(validIds(favoriteIds))];
    const cart = cartInput.filter(i => i && mongoose.isValidObjectId(i.productId)).map(i => ({ product: i.productId, quantity: Math.max(1, Math.min(99, Math.floor(Number(i.quantity) || 1))) }));
    const products = await Product.find({ _id: { $in: cart.map(i => i.product) }, active: true }).select('_id stock');
    const byId = new Map(products.map(p => [p._id.toString(), p]));
    const cleanCart = cart.filter(i => byId.has(i.product.toString()) && byId.get(i.product.toString()).stock > 0).map(i => ({ ...i, quantity: Math.min(i.quantity, byId.get(i.product.toString()).stock) }));
    const activeFavorites = await Product.find({ _id: { $in: favorites }, active: true }).distinct('_id');
    req.customer.favorites = activeFavorites;
    req.customer.cart = cleanCart;
    await req.customer.save();
    const c = await Customer.findById(req.customer._id).populate('favorites').populate('cart.product');
    res.json({ message: 'Your cart and favorites were saved.', favorites: c.favorites.filter(Boolean), cart: c.cart.filter(i => i.product).map(i => ({ product: i.product, quantity: i.quantity })) });
  } catch (e) { next(e); }
});

router.patch('/me', requireCustomer, async (req, res, next) => {
  try {
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (name.length < 2) return res.status(400).json({ message: 'Name must be at least 2 characters.' });
      req.customer.name = name;
    }
    if (req.body.phone !== undefined) req.customer.phone = String(req.body.phone).trim().slice(0, 20);
    await req.customer.save();
    res.json({ user: safeCustomer(req.customer) });
  } catch (e) { next(e); }
});

router.post('/orders', requireCustomer, async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    if (!items.length) return res.status(400).json({ message: 'Your cart is empty.' });
    const address = req.body.shippingAddress || {};
    const requiredAddress = ['name','phone','line1','city','state','pincode'];
    if (requiredAddress.some(key => !String(address[key] || '').trim())) return res.status(400).json({ message: 'Please provide your name, phone and complete delivery address.' });
    if (!/^\d{6}$/.test(String(address.pincode).trim())) return res.status(400).json({ message: 'Enter a valid 6-digit PIN code.' });
    const ids = items.filter(i => mongoose.isValidObjectId(i.productId)).map(i => String(i.productId));
    if (ids.length !== items.length) return res.status(400).json({ message: 'One or more products are invalid.' });
    const quantities = new Map();
    for (const item of items) {
      const quantity = Math.floor(Number(item.quantity));
      if (quantity < 1 || quantity > 99) return res.status(400).json({ message: 'A product quantity is invalid.' });
      quantities.set(String(item.productId), (quantities.get(String(item.productId)) || 0) + quantity);
    }
    const products = await Product.find({ _id: { $in: [...quantities.keys()] }, active: true });
    const map = new Map(products.map(p => [p._id.toString(), p]));
    const normalized = [];
    for (const [productId, quantity] of quantities) {
      const p = map.get(productId);
      if (!p) return res.status(409).json({ message: 'A product is no longer available.' });
      if (p.stock < quantity) return res.status(409).json({ message: `${p.name} has only ${p.stock} item(s) in stock.` });
      normalized.push({ product: p._id, name: p.name, image: p.image, price: p.price, quantity });
    }
    const reserved = [];
    try {
      for (const item of normalized) {
        const updated = await Product.findOneAndUpdate({ _id: item.product, active: true, stock: { $gte: item.quantity } }, { $inc: { stock: -item.quantity } }, { new: true });
        if (!updated) throw Object.assign(new Error(`${item.name} is no longer available in the requested quantity.`), { status: 409 });
        reserved.push(item);
      }
      const subtotal = normalized.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const order = await Order.create({ customer: req.customer._id, items: normalized, subtotal, shippingAddress: req.body.shippingAddress || {}, paymentMethod: req.body.paymentMethod === 'cod' ? 'cod' : 'whatsapp' });
      req.customer.cart = [];
      await req.customer.save();
      res.status(201).json({ message: 'Order request saved successfully.', order });
    } catch (error) {
      await Promise.all(reserved.map(item => Product.updateOne({ _id: item.product }, { $inc: { stock: item.quantity } })));
      throw error;
    }
  } catch (e) { next(e); }
});

router.get('/orders', requireCustomer, async (req, res, next) => {
  try { const orders = await Order.find({ customer: req.customer._id }).sort({ createdAt: -1 }).limit(50); res.json({ orders }); }
  catch (e) { next(e); }
});

export default router;
