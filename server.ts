import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import Service from './models/Service';
import Product from './models/Product';
import Booking from './models/Booking';
import User from './models/User';
import authRoutes from './routes/auth';
import serviceRoutes from './routes/service';
import bookingRoutes from './routes/booking';
import dashboardRoutes from './routes/dashboard';
import userRoutes from './routes/user';
import categoryRoutes from './routes/category';
import productRoutes from './routes/product';
import cartRoutes from './routes/cart';
import orderRoutes from './routes/order';
import reviewRoutes from './routes/review';
import productCommentRoutes from './routes/productComment';
import stylistRoutes from './routes/stylist';
import newsRoutes from './routes/news'; // 👈 Import route news vào đây
import bannerRoutes from './routes/banner'; // 👈 Import route banner vào đây
// Kích hoạt đọc file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI as string;

// Middleware (Các trạm kiểm soát)
app.use(cors()); // Cho phép Frontend (React) gọi được API mà không bị chặn
const path = require('path');

// Mở cửa thư mục uploads để Frontend có thể truy cập ảnh qua đường link
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json()); // Giúp Server đọc được dữ liệu JSON khách gửi lên
app.use('/api/auth', authRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/product-comments', productCommentRoutes);
app.use('/api/stylists', stylistRoutes);
app.use('/api/news', newsRoutes); // 👈 Thêm route news vào đây
app.use('/api/banners', bannerRoutes);// 👈 Thêm route banner vào đây
// Tạo một API test thử
app.get('/', (req, res) => {
  res.send('API của UTC Barber Shop đang hoạt động ngon lành! 🎉');
});
// API Test: Thêm thử 1 dịch vụ để tạo Database
app.get('/add-test-service', async (req, res) => {
  try {
    // Tạo 1 dịch vụ mới theo đúng khuôn mẫu
    const newService = new Service({
      name: "Combo Cắt Tóc Nam Cực Chất",
      price: 50000,
      duration: 30,
      description: "Cắt, gội, massage và vuốt sáp tạo kiểu"
    });

    // Lưu vào Database
    await newService.save(); 

    res.send('✅ Đã thêm dịch vụ thành công! Hãy mở Compass lên xem nhé!');
  } catch (error) {
    res.status(500).send('❌ Có lỗi xảy ra: ' + error);
  }
});
// Kết nối với Database MongoDB
mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log('✅ Đã kết nối thành công với MongoDB!');
    
    // ĐÂY LÀ PHÉP THUẬT ÉP TẠO BẢNG RỖNG NHƯ BẠN MUỐN:
    await User.createCollection();
    await Service.createCollection();
    await Product.createCollection();
    await Booking.createCollection();
    console.log('📦 Đã tạo sẵn các bảng (Collections) rỗng trong DB!');

    // Chỉ bật Server khi đã kết nối DB thành công
    app.listen(PORT, () => {
      console.log(`🚀 Server Backend đang chạy tại: http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.log('❌ Lỗi kết nối MongoDB:', error.message);
  });