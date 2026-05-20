import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import News from '../models/News';

const router = express.Router();

// Cấu hình Multer tải ảnh bìa bài viết vào thư mục /uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = './uploads';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `news-${Date.now()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

// ==========================================
// [POST] Thêm bài viết mới
// ==========================================
router.post('/', upload.single('thumbnail'), async (req: any, res): Promise<any> => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Vui lòng chọn ảnh bìa!' });

    const newArticle = new News({
      title: req.body.title,
      content: req.body.content, 
      thumbnail: `/uploads/${req.file.filename}`,
      isActive: true
    });

    await newArticle.save();
    res.status(201).json({ message: 'Đăng bài thành công!', data: newArticle });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==========================================
// [GET] Lấy danh sách bài viết
// ==========================================
router.get('/', async (req, res) => {
  try {
    const filter = req.query.active === 'true' ? { isActive: true } : {};
    const articles = await News.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ data: articles });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==========================================
// 📍 [GET] Lấy chi tiết 1 bài viết theo ID (MỚI THÊM)
// ==========================================
router.get('/:id', async (req: any, res): Promise<any> => {
  try {
    const article = await News.findById(req.params.id);
    if (!article) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    }
    res.status(200).json({ data: article });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy chi tiết' });
  }
});

// ==========================================
// 📍 [PUT] Sửa bài viết theo ID (MỚI THÊM)
// ==========================================
router.put('/:id', upload.single('thumbnail'), async (req: any, res): Promise<any> => {
  try {
    const { title, content, isActive } = req.body;
    
    // Gói dữ liệu cập nhật
    let updateData: any = { title, content };

    // Nếu có truyền lên trạng thái active/inactive
    if (isActive !== undefined) {
      updateData.isActive = isActive === 'true' || isActive === true;
    }

    // Nếu người dùng chọn Upload ảnh mới, thì mới cập nhật lại đường dẫn ảnh
    if (req.file) {
      updateData.thumbnail = `/uploads/${req.file.filename}`;
    }

    const updatedArticle = await News.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true } // Trả về document mới sau khi update
    );

    if (!updatedArticle) {
      return res.status(404).json({ message: 'Không tìm thấy bài viết để sửa' });
    }

    res.status(200).json({ message: 'Cập nhật bài viết thành công!', data: updatedArticle });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi cập nhật' });
  }
});

// ==========================================
// [DELETE] Xóa bài viết
// ==========================================
router.delete('/:id', async (req: any, res): Promise<any> => {
  try {
    const article = await News.findByIdAndDelete(req.params.id);
    if (!article) return res.status(404).json({ message: 'Không tìm thấy bài viết' });
    res.status(200).json({ message: 'Đã xóa bài viết!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;