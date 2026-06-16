import express from 'express';
import multer from 'multer'; 
import path from 'path';     
import Service from '../models/Service';
import Booking from '../models/Booking'; 
import { verifyAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// ==========================================
// CẤU HÌNH MULTER: NƠI LƯU & TÊN FILE ẢNH
// ==========================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); 
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// ==========================================
// CÁC API CỦA DỊCH VỤ
// ==========================================

// [POST] Thêm dịch vụ mới (Chỉ Admin)
router.post('/', verifyAdmin, upload.single('image'), async (req: any, res: any): Promise<any> => {
  try {
    const { name, price, duration, description } = req.body;

    // 📍 1. BẮT LỖI SỐ ÂM
    if (Number(price) < 0) {
      return res.status(400).json({ message: 'Giá tiền không được để số âm!' });
    }
    if (Number(duration) < 0) {
      return res.status(400).json({ message: 'Thời gian dịch vụ không được để số âm!' });
    }

    // 📍 2. BẮT LỖI SỐ LẺ (Phải là bội số của 5)
    if (Number(duration) % 5 !== 0) {
      return res.status(400).json({ message: 'Thời gian dịch vụ phải là số chẵn (VD: 30, 45, 60...), không được nhập số lẻ như 31, 32!' });
    }

    let imageUrl = '';
    if (req.file) {
      imageUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    }

    const newService = new Service({
      name,
      price: Number(price), 
      duration: Number(duration), 
      description,
      image: imageUrl 
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
router.put('/:id', verifyAdmin, upload.single('image'), async (req: any, res: any): Promise<any> => {
  try {
    // 📍 1. BẮT LỖI SỐ ÂM KHI SỬA
    if (req.body.price !== undefined && Number(req.body.price) < 0) {
      return res.status(400).json({ message: 'Giá tiền không được để số âm!' });
    }
    if (req.body.duration !== undefined && Number(req.body.duration) < 0) {
      return res.status(400).json({ message: 'Thời gian dịch vụ không được để số âm!' });
    }

    // 📍 2. BẮT LỖI SỐ LẺ KHI SỬA
    if (req.body.duration !== undefined && Number(req.body.duration) % 5 !== 0) {
      return res.status(400).json({ message: 'Thời gian dịch vụ phải là số chẵn (VD: 30, 45, 60...), không được nhập số lẻ!' });
    }

    const updateData = { ...req.body };

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
    const serviceId = req.params.id;

    const bookingCount = await Booking.countDocuments({ service: serviceId });

    if (bookingCount > 0) {
      return res.status(400).json({ 
        message: `Không thể xóa! Dịch vụ này đang được liên kết với ${bookingCount} lịch hẹn trong hệ thống.` 
      });
    }

    const deletedService = await Service.findByIdAndDelete(serviceId);
    
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