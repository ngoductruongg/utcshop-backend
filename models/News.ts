import mongoose from 'mongoose';

const NewsSchema = new mongoose.Schema({
  title: { type: String, required: true },
  thumbnail: { type: String, required: true }, // Ảnh bìa bài viết
  content: { type: String, required: true },   // Nội dung bài viết (Chứa mã HTML)
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model('News', NewsSchema);