import mongoose from 'mongoose';

const BannerSchema = new mongoose.Schema({
  imageUrl: { type: String, required: true }, // Đường dẫn ảnh (VD: /uploads/banner-123.jpg)
  title: { type: String, default: 'Banner tiệm tóc' }, // Tên để Admin dễ quản lý
  isActive: { type: Boolean, default: true } // Cờ ẩn/hiện banner
}, { timestamps: true });

export default mongoose.model('Banner', BannerSchema);