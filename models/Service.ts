import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  duration: { type: Number, required: true },
  description: { type: String },
  
  // 1. NÂNG CẤP: Thêm ảnh mặc định
  // Lỡ Admin quên up ảnh, web sẽ tự lấy cái ảnh có sẵn này để giao diện không bị thủng lỗ chỗ
  image: { 
    type: String, 
    default: 'https://via.placeholder.com/400x300?text=No+Image+Available' 
  },
  
  // 2. NÂNG CẤP: Thêm trạng thái Ẩn/Hiện (Soft Delete)
  // Quán tóc đôi khi "tạm ngưng" dịch vụ Uốn con sâu do hết thuốc, 
  // thay vì Xóa hẳn đi, Admin chỉ cần tắt isActive thành false để ẩn khỏi khách hàng.
  isActive: {
    type: Boolean,
    default: true
  }

}, { 
  timestamps: true 
});

export default mongoose.model('Service', serviceSchema);