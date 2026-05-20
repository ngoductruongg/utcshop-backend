import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  price: { 
    type: Number, 
    required: true 
  },
  image: { 
    type: String // Tạm thời lưu link ảnh (URL) trên mạng cho nhẹ Database
  },
  // Mảng chứa đường dẫn các ảnh phụ
  images: [{ type: String }],
  category: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Category', // Nối sang bảng Category vừa tạo
    required: true 
  },
  stock: { 
    type: Number, 
    default: 0 // Số lượng hàng còn trong kho
  },
  // 📍 MỚI THÊM: Trạng thái duyệt hiển thị (Mặc định khi mới đăng là false - Ẩn)
  isActive: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

export default mongoose.model('Product', productSchema);