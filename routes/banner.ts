import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Banner from '../models/Banner';
// import { verifyToken, verifyAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// 📍 1. CẤU HÌNH BỘ NẠP ẢNH (MULTER)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir); // Nếu chưa có thư mục uploads thì tự tạo
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Đổi tên file để không bị trùng
    cb(null, `banner-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// ==========================================
// 📍 2. CÁC API XỬ LÝ DỮ LIỆU
// ==========================================

// [POST] Thêm Banner mới (Kèm upload ảnh) - Dành cho Admin
router.post('/', upload.single('image'), async (req: any, res): Promise<any> => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Vui lòng chọn một bức ảnh!' });
    }

    const newBanner = new Banner({
      title: req.body.title || 'Banner mới',
      imageUrl: `/uploads/${req.file.filename}`, 
      isActive: true
    });

    await newBanner.save();
    res.status(201).json({ message: 'Thêm banner thành công!', data: newBanner });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi upload ảnh' });
  }
});

// [GET] Lấy danh sách Banner
router.get('/', async (req, res) => {
  try {
    const filter = req.query.active === 'true' ? { isActive: true } : {};
    const banners = await Banner.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ data: banners });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// 📍 [PUT] CẬP NHẬT BANNER (SỬA TÊN HOẶC ĐỔI ẢNH)
router.put('/:id', upload.single('image'), async (req: any, res): Promise<any> => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });

    // Nếu quản trị viên tải ảnh mới lên
    if (req.file) {
      // 1. Xóa file ảnh cũ đi cho nhẹ máy chủ
      const oldFilePath = path.join(__dirname, '..', banner.imageUrl);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
      // 2. Lưu đường dẫn ảnh mới
      banner.imageUrl = `/uploads/${req.file.filename}`;
    }

    // Cập nhật tên/tiêu đề mới nếu có
    if (req.body.title) {
      banner.title = req.body.title;
    }

    await banner.save();
    res.status(200).json({ message: 'Cập nhật banner thành công!', data: banner });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi cập nhật banner' });
  }
});

// [PUT] Đổi trạng thái Ẩn/Hiện banner
router.put('/:id/status', async (req: any, res): Promise<any> => {
  try {
    const banner = await Banner.findById(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });

    banner.isActive = !banner.isActive; 
    await banner.save();

    res.status(200).json({ message: 'Đã cập nhật trạng thái!', data: banner });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// [DELETE] Xóa Banner
router.delete('/:id', async (req: any, res): Promise<any> => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) return res.status(404).json({ message: 'Không tìm thấy banner' });

    // Xóa luôn file ảnh thật trong thư mục uploads
    const filePath = path.join(__dirname, '..', banner.imageUrl);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.status(200).json({ message: 'Đã xóa banner thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;