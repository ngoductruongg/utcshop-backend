import express from 'express';
import Category from '../models/Category';
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware';
import Product from '../models/Product';
const router = express.Router();

// ==========================================
// [POST] Thêm danh mục mới (Chỉ Admin)
// ==========================================
router.post('/', verifyAdmin, async (req: any, res): Promise<any> => {
  try {
    const { name, description } = req.body;

    const categoryExists = await Category.findOne({ name });
    if (categoryExists) {
      return res.status(400).json({ message: 'Tên danh mục này đã tồn tại!' });
    }

    const newCategory = new Category({ name, description });
    await newCategory.save();

    res.status(201).json({ message: 'Thêm danh mục thành công!', data: newCategory });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// [GET] Xem tất cả danh mục (Ai cũng xem được)
// ==========================================
router.get('/', async (req, res): Promise<any> => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json({ message: 'Lấy danh sách thành công', data: categories });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// [GET] Xem chi tiết 1 danh mục
// ==========================================
router.get('/:id', async (req, res): Promise<any> => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục!' });
    }
    res.status(200).json({ message: 'Lấy chi tiết thành công', data: category });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server (Có thể sai định dạng ID)', error });
  }
});

// ==========================================
// [PUT] Sửa danh mục (Chỉ Admin) - Bản đã bổ sung check trùng tên
// ==========================================
router.put('/:id', verifyAdmin, async (req: any, res): Promise<any> => {
  try {
    const { name, description } = req.body;

    // 📍 BƯỚC BỔ SUNG: Tìm danh mục trùng tên nhưng KHÁC ID đang sửa
    const duplicateCategory = await Category.findOne({ 
      name, 
      _id: { $ne: req.params.id } // $ne nghĩa là Not Equal (Không bằng)
    });

    if (duplicateCategory) {
      return res.status(400).json({ message: 'Tên danh mục này đã tồn tại ở một bản ghi khác!' });
    }

    // Nếu không trùng thì tiến hành cập nhật như cũ
    const updatedCategory = await Category.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục để sửa!' });
    }

    res.status(200).json({ message: 'Cập nhật thành công!', data: updatedCategory });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});


// ==========================================
// [DELETE] Xóa danh mục (Bản an toàn - Nên cải tiến)
// ==========================================
router.delete('/:id', verifyAdmin, async (req: any, res): Promise<any> => {
  try {
    // 📍 BƯỚC KIỂM TRA BỔ SUNG: Tìm xem có sản phẩm nào dùng danh mục này không
    // (Giả sử bạn đã import model Product vào file này)
    const hasProducts = await Product.findOne({ category: req.params.id });
    
    if (hasProducts) {
      return res.status(400).json({ 
        message: 'Không thể xóa! Danh mục này đang chứa sản phẩm, hãy xóa hoặc đổi danh mục của sản phẩm trước.' 
      });
    }

    // Nếu không có sản phẩm nào thì mới cho phép xóa vĩnh viễn
    const deletedCategory = await Category.findByIdAndDelete(req.params.id);
    
    if (!deletedCategory) {
      return res.status(404).json({ message: 'Không tìm thấy danh mục!' });
    }

    res.status(200).json({ message: 'Xóa danh mục thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

export default router;