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

    // ==========================================
    // 📍 THÊM MỚI: 4. Dùng Aggregation Pipeline để tìm Top 5 dịch vụ
    // ==========================================
    const topServices = await Booking.aggregate([
      // Bước 1: Lọc ra những lịch đã cắt xong thu tiền ('completed')
      { $match: { status: 'completed' } }, 
      
      // Bước 2: Gom nhóm theo ID dịch vụ và Đếm số lần xuất hiện
      { $group: { 
          _id: '$service', 
          totalBookings: { $sum: 1 } 
      }},
      
      // Bước 3: Sắp xếp giảm dần theo số lượng đặt
      { $sort: { totalBookings: -1 } },
      
      // Bước 4: Giới hạn chỉ lấy 5 dịch vụ đứng đầu để đưa lên Dashboard
      { $limit: 5 },
      
      // Bước 5: Móc sang bảng 'services' để lấy được Tên dịch vụ
      { $lookup: { 
          from: 'services', // Tên collection dịch vụ trong DB (thường có s ở cuối)
          localField: '_id', 
          foreignField: '_id', 
          as: 'serviceInfo' 
      }},
      
      // Bước 6: Làm phẳng mảng (bỏ cái array bọc bên ngoài)
      { $unwind: '$serviceInfo' },
      
      // Bước 7: Làm sạch dữ liệu trả về (chỉ lấy Tên và Số lượng đặt)
      { $project: { 
          _id: 0, 
          serviceId: '$_id',
          serviceName: '$serviceInfo.name', 
          totalBookings: 1 
      }}
    ]);

    // 5. Trả về một cục dữ liệu tổng hợp cho trang Dashboard
    res.status(200).json({
      message: 'Lấy dữ liệu thống kê thành công!',
      data: {
        totalRevenue: totalRevenue,       
        totalCompleted: totalCompleted,   
        totalPending: totalPending,       
        totalConfirmed: totalConfirmed,   
        totalCancelled: totalCancelled,
        // 📍 Trả thêm mảng Top Services về cho Frontend vẽ biểu đồ
        topServices: topServices          
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi tính toán thống kê', error });
  }
});

export default router;