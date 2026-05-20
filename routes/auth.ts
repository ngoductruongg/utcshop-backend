import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import jwt from 'jsonwebtoken';
import { sendWelcomeEmail, sendOTPEmail } from '../utils/sendEmail';

const router = express.Router();

// ==========================================
// [POST] API Đăng ký tài khoản mới
// ==========================================
router.post('/register', async (req, res): Promise<any> => {
  try {
    const { name, email, password, phone } = req.body;

    // --- 1. CHẶN EMAIL KHÔNG PHẢI GMAIL ---
    if (!email.endsWith('@gmail.com')) {
      return res.status(400).json({ message: 'Vui lòng sử dụng tài khoản @gmail.com để đăng ký!' });
    }

    // Kiểm tra email tồn tại
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email này đã được sử dụng!' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      phone
    });

    // Lưu khách hàng vào DB
    await newUser.save();

    // --- 2. GỌI BÁC ĐƯA THƯ SAU KHI LƯU THÀNH CÔNG ---
    sendWelcomeEmail(newUser.email, newUser.name);

    res.status(201).json({ message: 'Đăng ký thành công! Vui lòng kiểm tra hộp thư Gmail của bạn.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// [POST] API Đăng nhập
// ==========================================
router.post('/login', async (req, res): Promise<any> => {
  try {
    const { email, password } = req.body;

    // 1. Tìm tài khoản trong MongoDB xem có email này không
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng!' });
    }

    // 📍 2. CHỐT CHẶN TÀI KHOẢN BỊ KHÓA (NẾU BỊ KHÓA THÌ ĐÁ VĂNG LUÔN)
    if (user.isBlocked) {
      return res.status(403).json({ 
        message: 'Tài khoản của bạn đã bị khóa do vi phạm chính sách. Vui lòng liên hệ Admin!' 
      });
    }

    // 3. Giải mã và so sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Email hoặc mật khẩu không đúng!' });
    }

    // 4. Tạo chìa khóa thông hành (Token)
    const token = jwt.sign(
      { userId: user._id, role: user.role }, 
      process.env.JWT_SECRET as string,      
      { expiresIn: '1h' }                    // Hạn sử dụng 1h
    );

    // 5. Trả kết quả về
    res.status(200).json({
      message: `đã đăng nhập thành công với quyền là ${user.role}`,
      token: token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// [POST] Yêu cầu cấp mã OTP Quên Mật Khẩu
// ==========================================
router.post('/forgot-password', async (req, res): Promise<any> => {
  try {
    const { email } = req.body;

    // 1. Kiểm tra xem email có trong hệ thống không
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy tài khoản với email này!' });
    }

    // 2. Tạo mã OTP ngẫu nhiên 6 chữ số
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // 3. Lưu OTP và thời gian hết hạn (15 phút) vào Database
    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút tính từ hiện tại
    await user.save();

    // 4. Gửi email
    sendOTPEmail(user.email, otp);

    res.status(200).json({ message: 'Mã OTP đã được gửi đến email của bạn!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// [POST] Nhập mã OTP và Đổi mật khẩu mới
// ==========================================
router.post('/reset-password', async (req, res): Promise<any> => {
  try {
    const { email, otp, newPassword } = req.body;

    // 1. Tìm user bằng email VÀ xem mã OTP có trùng khớp + chưa hết hạn không
    const user = await User.findOne({
      email: email,
      resetPasswordOTP: otp,
      resetPasswordExpires: { $gt: Date.now() } // Kiểm tra hạn sử dụng phải LỚN HƠN thời gian hiện tại
    });

    if (!user) {
      return res.status(400).json({ message: 'Mã OTP không hợp lệ hoặc đã hết hạn!' });
    }

    // 2. Băm mật khẩu mới
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // 3. Xóa mã OTP đi (để không dùng lại được nữa)
    user.resetPasswordOTP = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ message: 'Đổi mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới.' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

export default router;