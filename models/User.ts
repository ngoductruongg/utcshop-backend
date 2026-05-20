import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true }, // unique: Không cho phép đăng ký trùng email
  password: { type: String, required: true },
  phone: { type: String, required: true },
  // Thêm trường role để phân quyền
  role: { 
    type: String, 
    enum: ['user', 'stylist', 'admin'], 
    default: 'user' 
  },
  isBlocked: { type: Boolean, default: false },
  resetPasswordOTP: { type: String }, // Lưu mã OTP 6 số
  resetPasswordExpires: { type: Date } // Lưu thời gian hết hạn của OTP
}, { 
  timestamps: true 
});

export default mongoose.model('User', userSchema);