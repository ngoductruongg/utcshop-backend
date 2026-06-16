import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true } 
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  items: [orderItemSchema],
  totalPrice: { type: Number, required: true },
  shippingAddress: { type: String, required: true }, 
  phone: { type: String, required: true }, 
  paymentMethod: { type: String, default: 'COD' }, 
  status: { 
    type: String, 
    default: 'Chờ xác nhận', 
    enum: ['Chờ xác nhận', 'Đang giao', 'Hoàn thành', 'Đã hủy', 'Chờ thanh toán'] 
  },
  // 📍 THÊM MỚI: Cột lưu thời điểm bắt đầu giao hàng
  shippedAt: { type: Date, default: null } 
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);