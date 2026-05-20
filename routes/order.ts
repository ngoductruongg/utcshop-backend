import express from 'express';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product'; // 📍 BỔ SUNG QUAN TRỌNG: Import model Product để trừ kho
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// ==========================================
// [POST] Đặt hàng (Thanh toán Web & POS)
// ==========================================
// ==========================================\
// [POST] Đặt hàng (Thanh toán Web & POS)
// ==========================================\
router.post('/', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const { shippingAddress, phone, paymentMethod, items, totalPrice, status } = req.body;
    const userId = req.user.userId;

    let orderItems = [];
    let finalTotalPrice = 0;
    let orderUser = userId;

    // 💡 TRƯỜNG HỢP 1: ĐƠN HÀNG TỪ MÁY POS
    if (items && items.length > 0) {
      orderItems = items;
      finalTotalPrice = totalPrice;
      
      if (req.body.user === null) {
        orderUser = null as any; 
      }

      // 🔥 BƯỚC BỔ SUNG QUAN TRỌNG: KIỂM TRA TỒN KHO TRƯỚC KHI TẠO ĐƠN
      for (const item of orderItems) {
        const product = await Product.findById(item.product);
        
        // Nếu không tìm thấy sản phẩm hoặc số lượng mua lớn hơn số lượng trong kho
        if (!product) {
          return res.status(404).json({ message: `Không tìm thấy sản phẩm có ID: ${item.product}` });
        }
        if (product.stock < item.quantity) {
          return res.status(400).json({ 
            message: `Sản phẩm "${product.name}" không đủ hàng! Trong kho còn: ${product.stock}, số lượng yêu cầu: ${item.quantity}` 
          });
        }
      }
    } 
    // 💡 TRƯỜNG HỢP 2: KHÁCH HÀNG TỰ ĐẶT TRÊN WEB (Nếu có xử lý giỏ hàng)
    // ... Giữ nguyên đoạn xử lý giỏ hàng của khách tự đặt ở phía dưới của bạn ...

    // Khởi tạo đơn hàng mới khi tất cả sản phẩm đã qua vòng kiểm duyệt kho thành công
    const newOrder = new Order({
      user: orderUser,
      items: orderItems,
      totalPrice: finalTotalPrice,
      shippingAddress: shippingAddress || 'Mua trực tiếp tại quầy (POS)',
      phone: phone || 'N/A',
      paymentMethod,
      status: status || 'Đã thanh toán'
    });

    await newOrder.save();

    // 📍 TIẾN HÀNH TRỪ KHO (Đoạn này chạy an toàn vì đã check ở trên)
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }

    res.status(201).json({ message: 'Tạo đơn hàng thành công!', data: newOrder });

  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi tạo đơn hàng', error });
  }
});

// ==========================================
// [GET] Xem lịch sử đơn hàng của tôi
// ==========================================
router.get('/me', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const orders = await Order.find({ user: req.user.userId })
                              .populate('items.product', 'name image')
                              .sort({ createdAt: -1 }); 
    res.status(200).json({ message: 'Lấy lịch sử mua hàng thành công', data: orders });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// [PUT] Cập nhật trạng thái giao hàng (CÓ HOÀN KHO KHI HỦY)
// ==========================================
router.put('/:id/status', verifyAdmin, async (req: any, res): Promise<any> => {
  try {
    const { status } = req.body;
    
    // 1. TÌM ĐƠN HÀNG CŨ TRƯỚC (Để so sánh trạng thái)
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng!' });
    }

    // 2. 📍 LOGIC HOÀN KHO NẾU ĐƠN BỊ HỦY
    // Giả sử trạng thái hủy của bạn là 'Đã hủy' (hãy đổi lại cho khớp với chữ trên FE của bạn nếu cần)
    const cancelStatuses = ['Đã hủy', 'Hủy đơn', 'Cancelled']; 
    
    // Nếu trạng thái mới gửi lên là Hủy, VÀ trạng thái hiện tại trong DB chưa phải là Hủy (để tránh cộng dồn nhiều lần)
    if (cancelStatuses.includes(status) && !cancelStatuses.includes(order.status)) {
      
      // Chạy vòng lặp qua các món hàng trong đơn và CỘNG LẠI kho
      for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product, 
          { $inc: { stock: item.quantity } } // Lần này dùng số DƯƠNG để cộng trả lại kho
        );
      }
    }

    // (Nâng cao) 3. LOGIC TRỪ LẠI KHO NẾU ADMIN LỠ BẤM NHẦM "HỦY" RỒI ĐỔI LẠI THÀNH "ĐANG GIAO"
    if (!cancelStatuses.includes(status) && cancelStatuses.includes(order.status)) {
       for (const item of order.items) {
        await Product.findByIdAndUpdate(
          item.product, 
          { $inc: { stock: -item.quantity } } // Trừ lại kho
        );
      }
    }

    // 4. Lưu trạng thái mới vào DB
    order.status = status;
    await order.save();
    
    res.status(200).json({ message: 'Cập nhật trạng thái thành công', data: order });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// [GET] Admin lấy danh sách TẤT CẢ đơn hàng
// ==========================================
router.get('/', verifyAdmin, async (req: any, res): Promise<any> => {
  try {
    const orders = await Order.find()
                              .populate('user', 'name email')
                              .populate('items.product', 'name image')
                              .sort({ createdAt: -1 }); 
    res.status(200).json({ message: 'Lấy danh sách đơn hàng thành công', data: orders });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

export default router;