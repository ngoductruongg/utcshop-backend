import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  quantity: { type: Number, required: true },
  price: { type: Number, required: true } // Lưu giá chốt tại thời điểm mua hàng
});

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  items: [orderItemSchema],
  totalPrice: { type: Number, required: true },
  shippingAddress: { type: String, required: true }, // Địa chỉ giao hàng
  phone: { type: String, required: true }, // SĐT người nhận
  paymentMethod: { type: String, default: 'COD' }, // Mặc định là Thanh toán khi nhận hàng
  status: { 
    type: String, 
    default: 'Chờ xác nhận', 
    enum: ['Chờ xác nhận', 'Đang giao', 'Hoàn thành', 'Đã hủy','Chờ thanh toán'] 
  }
}, { timestamps: true });

export default mongoose.model('Order', orderSchema);