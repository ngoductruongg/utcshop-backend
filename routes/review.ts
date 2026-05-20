import express from 'express';
import Review from '../models/Review';
import Booking from '../models/Booking'; 
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// 🚨 ĐÃ XÓA: Hàm [POST] Đánh giá kiểu cũ. 
// Hiện tại chức năng Đánh giá đã được quản lý chặt chẽ tại file routes/booking.ts (POST /bookings/:id/review)

// ==========================================
// 1. [GET] Lấy danh sách đánh giá của 1 Dịch vụ (Public)
// ==========================================
router.get('/service/:serviceId', async (req, res): Promise<any> => {
  try {
    const reviews = await Review.find({ service: req.params.serviceId })
      .populate('user', 'name avatar') 
      .populate('stylist', 'name avatar') // 📍 CHÍNH LÀ CHỖ NÀY: Móc tên Stylist ra để hiển thị trên Frontend
      .sort({ createdAt: -1 });
      
    res.status(200).json({ message: 'Thành công', total: reviews.length, data: reviews });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// 2. [DELETE] Admin xóa đánh giá xấu/spam (Chỉ Admin)
// ==========================================
router.delete('/:id', verifyAdmin, async (req: any, res): Promise<any> => {
  try {
    const deletedReview = await Review.findByIdAndDelete(req.params.id);
    if (!deletedReview) return res.status(404).json({ message: 'Không tìm thấy đánh giá!' });
    res.status(200).json({ message: 'Đã xóa đánh giá thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// 3. [PUT] Khách hàng TỰ SỬA đánh giá của mình
// ==========================================
router.put('/:id', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const { rating, comment } = req.body;
    
    // Tìm đánh giá theo ID và BẮT BUỘC phải khớp với user đang đăng nhập
    const review = await Review.findOne({ _id: req.params.id, user: req.user.userId });
    
    if (!review) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá, hoặc bạn không có quyền sửa!' });
    }

    // Cập nhật lại sao và nội dung
    review.rating = rating || review.rating;
    review.comment = comment || review.comment;
    await review.save();

    res.status(200).json({ message: 'Đã cập nhật đánh giá!', data: review });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi sửa đánh giá', error });
  }
});

// ==========================================
// 4. [DELETE] Khách hàng TỰ XÓA đánh giá của mình
// ==========================================
router.delete('/mine/:id', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const deletedReview = await Review.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user.userId // Chốt chặn an toàn
    });

    if (!deletedReview) {
      return res.status(404).json({ message: 'Không tìm thấy đánh giá, hoặc bạn không có quyền xóa!' });
    }

    // (Tùy chọn nâng cao) Nếu muốn khi xóa review, khách được phép đánh giá lại:
    // Mở khóa đơn hàng (isReviewed = false)
    if (deletedReview.booking) {
        await Booking.findByIdAndUpdate(deletedReview.booking, { isReviewed: false });
    }

    res.status(200).json({ message: 'Đã tự xóa đánh giá thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi tự xóa đánh giá', error });
  }
});
// ==========================================
// 5. [GET] Lấy TẤT CẢ đánh giá (Dành cho Admin Quản lý)
// ==========================================
router.get('/', verifyAdmin, async (req: any, res): Promise<any> => {
  try {
    // Lấy toàn bộ review trên hệ thống, ghép thêm thông tin Khách hàng và Dịch vụ
    const reviews = await Review.find()
      .populate('user', 'name email avatar') // Lấy tên khách hàng
      .populate('service', 'name') // Lấy tên dịch vụ được đánh giá
      .populate('stylist', 'name') // Lấy tên Stylist (nếu có)
      .sort({ createdAt: -1 }); // Mới nhất xếp lên đầu
      
    res.status(200).json({ 
      message: 'Lấy danh sách thành công', 
      total: reviews.length, 
      data: reviews 
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy tất cả đánh giá', error });
  }
});
export default router;