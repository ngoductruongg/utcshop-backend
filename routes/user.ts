import express from 'express';
import User from '../models/User';
import { verifyToken } from '../middleware/authMiddleware';
import Booking from '../models/Booking'; // Đảm bảo đã import model Booking để đếm lịch sử
import StylistProfile from '../models/StylistProfile'; // Đảm bảo đã import model StylistProfile để đồng bộ hồ sơ thợ
const router = express.Router();

// ==========================================
// [GET] Xem thông tin cá nhân của người đang đăng nhập
// ==========================================
router.get('/me', verifyToken, async (req: any, res): Promise<any> => {
  try {
    // Tìm user dựa vào ID nằm trong Token. Lệnh .select('-password') để che mật khẩu đi.
    const user = await User.findById(req.user.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    }

    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy thông tin', error });
  }
});

// ==========================================
// [PUT] Cập nhật thông tin cá nhân (Tên, SĐT, Email)
// ==========================================
router.put('/me', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const { name, phone, email } = req.body;

    // 1. Nếu khách có gửi email mới lên để đổi
    if (email) {
      // THÊM MỚI Ở ĐÂY: Chặn ngay nếu không phải @gmail.com
      if (!email.endsWith('@gmail.com')) {
        return res.status(400).json({ message: 'Vui lòng sử dụng tài khoản @gmail.com!' });
      }

      // Kiểm tra xem email đó trùng với ai khác trong DB không
      const emailExists = await User.findOne({ 
        email: email, 
        _id: { $ne: req.user.userId } 
      });
      
      if (emailExists) {
        return res.status(400).json({ message: 'Email này đã được sử dụng bởi tài khoản khác! Vui lòng chọn email khác.' });
      }
    }
    
    // 2. Tiến hành cập nhật
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { name: name, phone: phone, email: email },
      { new: true, runValidators: true } 
    ).select('-password');

    res.status(200).json({ 
      message: 'Cập nhật hồ sơ cá nhân thành công!', 
      user: updatedUser 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi cập nhật thông tin', error });
  }
});
import bcrypt from 'bcryptjs'; // Đảm bảo đã import bcrypt ở đầu file

/// ==========================================
// [PUT] Đổi mật khẩu khi đang đăng nhập
// ==========================================
router.put('/change-password', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const { oldPassword, newPassword } = req.body;
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Mật khẩu cũ không chính xác!' });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: 'Đổi mật khẩu thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi đổi mật khẩu', error });
  }
}); // 📍 MÌNH ĐÃ SỬA LỖI ĐÓNG NGOẶC Ở ĐÂY CHO BẠN


// ==========================================
// [GET] LẤY DANH SÁCH NGƯỜI DÙNG (CHO ADMIN)
// ==========================================
router.get('/admin/list', async (req: any, res): Promise<any> => {
  try {
    const users = await User.find({ role: { $ne: 'admin' } })
                            .select('-password')
                            .sort({ createdAt: -1 })
                            .lean();
    
    const usersWithStats = await Promise.all(users.map(async (user) => {
      const noShowCount = await Booking.countDocuments({ user: user._id, status: 'no-show' });
      const completedCount = await Booking.countDocuments({ user: user._id, status: 'completed' });
      return { ...user, noShowCount, completedCount };
    }));

    res.status(200).json({ data: usersWithStats });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi tải người dùng' });
  }
});


// ==========================================
// [PUT] KHÓA / MỞ KHÓA TÀI KHOẢN
// ==========================================
router.put('/admin/:id/toggle-block', async (req: any, res): Promise<any> => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng!' });

    user.isBlocked = !user.isBlocked; 
    await user.save();
    
    res.status(200).json({ 
      message: user.isBlocked ? 'Đã khóa tài khoản thành công!' : 'Đã mở khóa tài khoản!', 
      data: user 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});


// ==========================================\
// [PUT] ĐỔI QUYỀN TÀI KHOẢN VÀ ĐỒNG BỘ TRẠNG THÁI THỢ
// ==========================================\
router.put('/admin/:id/role', async (req: any, res): Promise<any> => {
  try {
    const { role } = req.body;

    // 1. Cập nhật quyền trong bảng User
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng!' });
    }

    // 2. Đồng bộ hóa sang bảng hồ sơ thợ (StylistProfile)
    if (role === 'stylist') {
      // --- LUỒNG NÂNG QUYỀN LÊN THỢ ---
      const hasProfile = await StylistProfile.findOne({ user: updatedUser._id });
      
      if (!hasProfile) {
        // Nếu chưa từng làm thợ -> Tạo mới hồ sơ
        const newStylistProfile = new StylistProfile({
          user: updatedUser._id,
          name: updatedUser.name,
          skills: [],
          description: 'Nhân viên mới chuyển đổi quyền - Chưa cập nhật tiểu sử',
          isAvailable: true // Khớp với trường isAvailable của file stylist.ts
        });
        await newStylistProfile.save();
      } else {
        // Nếu đã có hồ sơ cũ đang bị tắt -> Chủ động bật mở lại
        if (hasProfile.isAvailable === false) {
          hasProfile.isAvailable = true; 
          await hasProfile.save();
        }
      }
    } else {
      // --- LUỒNG GIÁNG QUYỀN XUỐNG USER / ADMIN KHÁC ---
      // Nếu hạ quyền xuống không phải stylist nữa, tìm hồ sơ thợ và gán ẩn đi
      const hasProfile = await StylistProfile.findOne({ user: updatedUser._id });
      if (hasProfile && hasProfile.isAvailable === true) {
        hasProfile.isAvailable = false; // Chuyển trạng thái hoạt động về false
        await hasProfile.save();
      }
    }

    res.status(200).json({ 
      message: 'Thay đổi vai trò tài khoản và đồng bộ dữ liệu thành công!', 
      data: updatedUser 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi đổi quyền người dùng' });
  }
});

export default router;
