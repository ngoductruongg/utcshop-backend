import express from 'express';
import multer from 'multer'; // 1. IMPORT MULTER
import path from 'path';     // 2. IMPORT PATH
import Service from '../models/Service';
import { verifyAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// ==========================================
// CẤU HÌNH MULTER: NƠI LƯU & TÊN FILE ẢNH
// ==========================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Đổ ảnh vào thư mục 'uploads' (Nhớ tự tạo thư mục này ở gốc Backend nhé)
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    // Đổi tên file để tránh trùng lặp: Thêm thời gian hiện tại vào trước
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });


// ==========================================
// CÁC API CỦA DỊCH VỤ
// ==========================================

// [POST] Thêm dịch vụ mới (Chỉ Admin)
// Thêm upload.single('image') vào sau verifyAdmin
router.post('/', verifyAdmin, upload.single('image'), async (req: any, res: any): Promise<any> => {
  try {
    const { name, price, duration, description } = req.body;
    let imageUrl = '';

    // Nếu có file ảnh được tải lên từ máy tính
    if (req.file) {
      // Nhớ đổi 5000 thành cổng Backend của bạn nếu bạn dùng cổng khác nhé!
      imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    const newService = new Service({
      name,
      price,
      duration,
      description,
      image: imageUrl // Lưu đường dẫn ảnh vào DB
    });

    await newService.save();
    res.status(201).json({ message: 'Đã thêm dịch vụ mới thành công!', service: newService });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// [GET] Lấy danh sách tất cả dịch vụ (Ai cũng xem được)
router.get('/', async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// [PUT] API Sửa thông tin dịch vụ (Chỉ Admin)
// Cập nhật thêm upload.single('image') để Admin có thể đổi ảnh khác
router.put('/:id', verifyAdmin, upload.single('image'), async (req: any, res: any): Promise<any> => {
  try {
    // Lấy toàn bộ data text mà Admin muốn sửa
    const updateData = { ...req.body };

    // Nếu Admin có chọn ảnh mới thì mới cập nhật link ảnh, không thì giữ nguyên ảnh cũ
    if (req.file) {
      updateData.image = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id, 
      updateData, 
      { new: true } 
    );

    if (!updatedService) {
      return res.status(404).json({ message: 'Không tìm thấy dịch vụ này!' });
    }

    res.status(200).json({ message: 'Cập nhật dịch vụ thành công!', service: updatedService });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// [DELETE] API Xóa dịch vụ (Chỉ Admin)
router.delete('/:id', verifyAdmin, async (req, res): Promise<any> => {
  try {
    const deletedService = await Service.findByIdAndDelete(req.params.id);
    
    if (!deletedService) {
      return res.status(404).json({ message: 'Không tìm thấy dịch vụ này!' });
    }

    res.status(200).json({ message: 'Đã xóa dịch vụ thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// [GET] Xem chi tiết 1 dịch vụ theo ID
router.get('/:id', async (req, res): Promise<any> => {
  try {
    const service = await Service.findById(req.params.id);
    
    if (!service) {
      return res.status(404).json({ message: 'Không tìm thấy dịch vụ này!' });
    }

    res.status(200).json(service);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server (Có thể do ID không đúng định dạng)', error });
  }
});

export default router;