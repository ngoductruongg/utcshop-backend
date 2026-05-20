import express from 'express';
import multer from 'multer';
import path from 'path';
import Product from '../models/Product'; 
import { verifyAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// 1. Cấu hình Multer hứng ảnh
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

// CẤU HÌNH Hứng nhiều loại ảnh cùng lúc (1 ảnh chính + tối đa 5 ảnh phụ)
const cpUpload = upload.fields([
  { name: 'image', maxCount: 1 }, 
  { name: 'images', maxCount: 5 } 
]);

// 2. API THÊM SẢN PHẨM MỚI 
router.post('/', verifyAdmin, cpUpload, async (req: any, res: any): Promise<any> => {
  try {
    // 📍 LẤY THÊM isActive TỪ TRÊN FRONTEND GỬI XUỐNG
    const { name, price, stock, description, category, isActive } = req.body; 
    let imageUrl = '';
    let subImagesUrls: string[] = []; 

    if (req.files) {
      if (req.files['image'] && req.files['image'].length > 0) {
        imageUrl = `http://localhost:5000/uploads/${req.files['image'][0].filename}`;
      }
      if (req.files['images'] && req.files['images'].length > 0) {
        subImagesUrls = req.files['images'].map((file: any) => `http://localhost:5000/uploads/${file.filename}`);
      }
    }

    const newProduct = new Product({
      name,
      price,
      stock,
      category, 
      description,
      // 📍 ÉP KIỂU SANG BOOLEAN (Vì FormData gửi dưới dạng chữ 'true' hoặc 'false')
      isActive: isActive === 'true', 
      image: imageUrl,
      images: subImagesUrls 
    });

    await newProduct.save();
    res.status(201).json({ message: 'Đã thêm sản phẩm thành công!', product: newProduct });
  } catch (error) {
    console.error("Lỗi Backend thêm sản phẩm:", error);
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// 3. API LẤY DANH SÁCH SẢN PHẨM
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// [GET] Xem chi tiết 1 sản phẩm theo ID
router.get('/:id', async (req, res): Promise<any> => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    
    if (!product) {
      return res.status(404).json({ message: 'Không tìm thấy sản phẩm này!' });
    }

    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server (ID không hợp lệ)', error });
  }
});

// 4. API SỬA SẢN PHẨM 
router.put('/:id', verifyAdmin, cpUpload, async (req: any, res: any): Promise<any> => {
  try {
    const updateData = { ...req.body };
    
    // 📍 ÉP KIỂU LẠI isActive TRƯỚC KHI LƯU CẬP NHẬT
    if (updateData.isActive !== undefined) {
      updateData.isActive = updateData.isActive === 'true';
    }
    
    if (req.files) {
      if (req.files['image'] && req.files['image'].length > 0) {
        updateData.image = `http://localhost:5000/uploads/${req.files['image'][0].filename}`;
      }
      if (req.files['images'] && req.files['images'].length > 0) {
        updateData.images = req.files['images'].map((file: any) => `http://localhost:5000/uploads/${file.filename}`);
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updatedProduct) return res.status(404).json({ message: 'Không tìm thấy!' });
    res.status(200).json({ message: 'Cập nhật thành công!', product: updatedProduct });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// 5. API XÓA SẢN PHẨM
router.delete('/:id', verifyAdmin, async (req, res): Promise<any> => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) return res.status(404).json({ message: 'Không tìm thấy!' });
    res.status(200).json({ message: 'Đã xóa thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

export default router;