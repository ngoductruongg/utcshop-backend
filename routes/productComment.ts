import express from 'express';
import ProductComment from '../models/ProductComment';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// 1. [POST] Khách hàng bình luận (Bắt buộc Đăng nhập)
router.post('/', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const { productId, content } = req.body;
    
    const newComment = new ProductComment({
      user: req.user.userId,
      product: productId,
      content: content
    });

    await newComment.save();
    res.status(201).json({ message: 'Đã gửi bình luận!', data: newComment });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// 2. [GET] Lấy danh sách bình luận của 1 Sản phẩm (Public - Ai cũng xem được)
router.get('/product/:productId', async (req, res): Promise<any> => {
  try {
    const comments = await ProductComment.find({ product: req.params.productId })
                                         .populate('user', 'name') // Kéo tên khách hàng ra
                                         .sort({ createdAt: -1 });
    res.status(200).json({ message: 'Thành công', total: comments.length, data: comments });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// 3. [DELETE] Admin xóa bình luận (Chỉ Admin)
router.delete('/:id', verifyAdmin, async (req: any, res): Promise<any> => {
  try {
    const deletedComment = await ProductComment.findByIdAndDelete(req.params.id);
    if (!deletedComment) return res.status(404).json({ message: 'Không tìm thấy bình luận!' });
    res.status(200).json({ message: 'Đã xóa bình luận thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});
// ==========================================
// [PUT] Khách hàng TỰ SỬA bình luận của mình
// ==========================================
router.put('/:id', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const { content } = req.body;
    
    const comment = await ProductComment.findOne({ _id: req.params.id, user: req.user.userId });
    
    if (!comment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận, hoặc bạn không có quyền sửa!' });
    }

    comment.content = content || comment.content;
    await comment.save();

    res.status(200).json({ message: 'Đã sửa bình luận!', data: comment });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// [DELETE] Khách hàng TỰ XÓA bình luận của mình
// ==========================================
router.delete('/mine/:id', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const deletedComment = await ProductComment.findOneAndDelete({ 
      _id: req.params.id, 
      user: req.user.userId 
    });

    if (!deletedComment) {
      return res.status(404).json({ message: 'Không tìm thấy bình luận, hoặc bạn không có quyền xóa!' });
    }

    res.status(200).json({ message: 'Đã tự xóa bình luận thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});
// [GET] Admin lấy danh sách TẤT CẢ bình luận
router.get('/', verifyAdmin, async (req: any, res): Promise<any> => {
  try {
    const comments = await ProductComment.find()
      .populate('user', 'name email') // Lấy tên, email người bình luận
      .populate('product', 'name image') // Lấy tên, ảnh sản phẩm bị bình luận
      .sort({ createdAt: -1 }); // Mới nhất lên đầu
      
    res.status(200).json({ data: comments });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});
export default router;