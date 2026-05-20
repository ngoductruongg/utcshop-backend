import mongoose from 'mongoose';

// Khung cho từng món hàng trong giỏ
const cartItemSchema = new mongoose.Schema({
  product: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Product', // Nối sang bảng Sản phẩm
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    min: 1, 
    default: 1 
  }
});

// Khung cho toàn bộ giỏ hàng
const cartSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', // Nối sang bảng Khách hàng
    required: true,
    unique: true // Mỗi khách chỉ có 1 giỏ hàng duy nhất
  },
  items: [cartItemSchema] // Mảng chứa các món hàng
}, { timestamps: true });

export default mongoose.model('Cart', cartSchema);