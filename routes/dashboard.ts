import express from 'express';
import Booking from '../models/Booking';
import { verifyAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// [GET] Lấy dữ liệu thống kê tổng hợp (Chỉ Admin)
router.get('/stats', verifyAdmin, async (req, res): Promise<any> => {
  try {
    // 1. Đếm số lượng đơn theo từng trạng thái
    const totalPending = await Booking.countDocuments({ status: 'pending' });
    const totalConfirmed = await Booking.countDocuments({ status: 'confirmed' });
    const totalCancelled = await Booking.countDocuments({ status: 'cancelled' });

    // 2. Lấy TẤT CẢ các đơn đã hoàn thành (completed) ra để tính tiền
    const completedBookings = await Booking.find({ status: 'completed' }).populate('service');
    
    // Biến đếm số lượng đơn đã cắt xong
    const totalCompleted = completedBookings.length;

    // 3. Tính tổng doanh thu
    let totalRevenue = 0;
    completedBookings.forEach((booking: any) => {
      // Ép kiểu để lấy giá tiền từ bảng Service sang
      const serviceInfo = booking.service;
      if (serviceInfo && serviceInfo.price) {
        totalRevenue += serviceInfo.price;
      }
    });

    // 4. Trả về một cục dữ liệu tổng hợp cho trang Dashboard
    res.status(200).json({
      message: 'Lấy dữ liệu thống kê thành công!',
      data: {
        totalRevenue: totalRevenue,       // Tổng tiền kiếm được
        totalCompleted: totalCompleted,   // Tổng đơn đã cắt xong thu tiền
        totalPending: totalPending,       // Tổng đơn đang chờ duyệt
        totalConfirmed: totalConfirmed,   // Tổng đơn đã chốt, chuẩn bị cắt
        totalCancelled: totalCancelled    // Tổng đơn bị hủy
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi tính toán thống kê', error });
  }
});

export default router;