import mongoose from 'mongoose';
const itemSchema = new mongoose.Schema({ product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }, name: String, image: String, price: Number, quantity: { type: Number, min: 1 } }, { _id: false });
const schema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
  items: { type: [itemSchema], required: true },
  subtotal: { type: Number, required: true, min: 0 },
  shippingAddress: { name: String, phone: String, line1: String, line2: String, city: String, state: String, pincode: String },
  paymentMethod: { type: String, enum: ['cod', 'whatsapp'], default: 'whatsapp' },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  status: { type: String, enum: ['placed', 'confirmed', 'packed', 'shipped', 'delivered', 'cancelled'], default: 'placed' },
}, { timestamps: true });
export default mongoose.model('Order', schema);
