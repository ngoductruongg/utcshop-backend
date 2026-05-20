import mongoose from 'mongoose';

const stylistProfileSchema = new mongoose.Schema({
  // Liên kết 1-1 với tài khoản User
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  avatar: { type: String }, // Ảnh chân dung thợ
  bio: { type: String },    // Giới thiệu bản thân
  specialty: [String],      // Các thế mạnh (ví dụ: uốn, nhuộm, undercut)
  rating: { type: Number, default: 5 }, // Điểm đánh giá trung bình
  isAvailable: { type: Boolean, default: true } // Trạng thái thợ đang làm việc hay nghỉ
}, { timestamps: true });

export default mongoose.model('StylistProfile', stylistProfileSchema);