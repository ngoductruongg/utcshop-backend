import express from 'express';
import Order from '../models/Order';
import Cart from '../models/Cart';
import Product from '../models/Product'; 
import { verifyToken, verifyAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// ==========================================
// [POST] Đặt hàng (Thanh toán Web & POS)
// ==========================================
router.post('/', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const { shippingAddress, phone, paymentMethod, items, totalPrice, status } = req.body;
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    let orderItems: any[] = [];
    let finalTotalPrice = totalPrice || 0;

    // ==========================================
    // 💡 BƯỚC 1: LẤY SẢN PHẨM 
    // ==========================================
    if (items && items.length > 0) {
      // Đặt thẳng từ trang Checkout (FE truyền lên)
      orderItems = items.map((item: any) => ({
        product: item.product._id ? item.product._id : item.product, 
        quantity: item.quantity || 1
      }));
    } else {
      // Đặt từ Giỏ hàng (Tự động kéo từ DB)
      const cart = await Cart.findOne({ user: userId }).populate('items.product');
      
      if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: 'Giỏ hàng của bạn đang trống, không thể đặt hàng!' });
      }

      orderItems = cart.items.map((item: any) => ({
        product: item.product._id,
        quantity: item.quantity
      }));
    }

    if (orderItems.length === 0) {
      return res.status(400).json({ message: 'Không có sản phẩm hợp lệ nào để đặt hàng!' });
    }

    // ==========================================
    // 💡 BƯỚC 2: KIỂM TRA TỒN KHO & LẤY GIÁ GỐC SẢN PHẨM (FIX LỖI PRICE)
    // ==========================================
    let calculatedTotal = 0;

    for (let i = 0; i < orderItems.length; i++) {
      const product = await Product.findById(orderItems[i].product);
      
      if (!product) {
        return res.status(404).json({ message: `Có sản phẩm trong đơn không còn tồn tại!` });
      }
      if (product.stock < orderItems[i].quantity) {
        return res.status(400).json({ 
          message: `Sản phẩm "${product.name}" chỉ còn ${product.stock} cái, không đủ để đặt!` 
        });
      }

      // 📍 BẮT BUỘC: Gán giá gốc vào từng sản phẩm để lưu Database (Fix lỗi required price)
      orderItems[i].price = product.price; 
      
      // Tính lại tổng tiền cho chính xác 100% dựa vào giá DB
      calculatedTotal += (product.price * orderItems[i].quantity);
    }

    // Nếu FE không gửi tổng tiền, lấy tổng tiền tự tính
    if (!finalTotalPrice) {
      finalTotalPrice = calculatedTotal;
    }

   // 💡 BƯỚC 3: TẠO ĐƠN HÀNG VÀ LƯU DATABASE
    // ==========================================
    const orderData: any = {
      user: userId,
      items: orderItems,
      totalPrice: finalTotalPrice,
      shippingAddress: shippingAddress || 'Mua trực tiếp tại quầy (POS)',
      phone: phone || 'Chưa cập nhật',
      paymentMethod: paymentMethod || 'Tiền mặt'
    };

    // 📍 SỬA LỖI Ở ĐÂY: Chỉ gán status nếu FE thực sự gửi lên. 
    // Nếu không, để trống cho Database TỰ ĐỘNG lấy giá trị mặc định của hệ thống!
    if (status) {
      orderData.status = status;
    }

    const newOrder = new Order(orderData);
    await newOrder.save();

    // ==========================================
    // 💡 BƯỚC 4: TRỪ KHO VÀ DỌN SẠCH GIỎ HÀNG
    // ==========================================
    for (const item of orderItems) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stock: -item.quantity } }
      );
    }

    if (userId && (!items || items.length === 0)) {
      await Cart.findOneAndUpdate(
        { user: userId }, 
        { items: [] }
      );
    }

    res.status(201).json({ message: 'Đặt hàng thành công!', data: newOrder });

  } catch (error: any) {
    console.error("🚨 LỖI TẠO ĐƠN HÀNG:", error);
    res.status(500).json({ message: 'Lỗi server khi tạo đơn hàng', error: error.message });
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
// router.put('/:id/status', verifyAdmin, async (req: any, res): Promise<any> => {
//   try {
//     const { status } = req.body;
    
//     const order = await Order.findById(req.params.id);
//     if (!order) {
//       return res.status(404).json({ message: 'Không tìm thấy đơn hàng!' });
//     }

//     const cancelStatuses = ['Đã hủy', 'Hủy đơn', 'Cancelled']; 
    
//     // Nếu chuyển sang trạng thái Hủy -> Cộng lại kho
//     if (cancelStatuses.includes(status) && !cancelStatuses.includes(order.status)) {
//       for (const item of order.items) {
//         await Product.findByIdAndUpdate(
//           item.product, 
//           { $inc: { stock: item.quantity } } 
//         );
//       }
//     }

//     // Nếu lỡ Hủy, giờ đổi lại thành Đang giao -> Trừ lại kho
//     if (!cancelStatuses.includes(status) && cancelStatuses.includes(order.status)) {
//        for (const item of order.items) {
//         await Product.findByIdAndUpdate(
//           item.product, 
//           { $inc: { stock: -item.quantity } } 
//         );
//       }
//     }

//     order.status = status;
//     await order.save();
    
//     res.status(200).json({ message: 'Cập nhật trạng thái thành công', data: order });
//   } catch (error) {
//     res.status(500).json({ message: 'Lỗi server', error });
//   }
// });

// ==========================================
// [PUT] Cập nhật trạng thái giao hàng (CÓ HOÀN KHO KHI HỦY + LƯU NGÀY GIAO)
// ==========================================
router.put('/:id/status', verifyAdmin, async (req: any, res): Promise<any> => {
  try {
    const { status } = req.body;
    
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng!' });
    }

    const cancelStatuses = ['Đã hủy', 'Hủy đơn', 'Cancelled']; 
    
    if (cancelStatuses.includes(status) && !cancelStatuses.includes(order.status)) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.quantity } });
      }
    }

    if (!cancelStatuses.includes(status) && cancelStatuses.includes(order.status)) {
       for (const item of order.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
      }
    }

    // 📍 THÊM MỚI: Nếu chuyển sang "Đang giao", ghi nhận thời gian bắt đầu giao
    if (status === 'Đang giao' && order.status !== 'Đang giao') {
      order.shippedAt = new Date();
    }

    order.status = status;
    await order.save();
    
    res.status(200).json({ message: 'Cập nhật trạng thái thành công', data: order });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// 📍 THÊM MỚI: [PUT] Khách hàng tự bấm "Đã nhận được hàng"
// ==========================================
router.put('/:id/receive', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng!' });
    }

    // Kiểm tra xem đơn này có đúng của khách hàng đang đăng nhập không
    if (order.user?.toString() !== req.user?.userId) {
      return res.status(403).json({ message: 'Bạn không có quyền xác nhận đơn hàng này!' });
    }

    if (order.status !== 'Đang giao') {
      return res.status(400).json({ message: 'Đơn hàng chưa được giao, không thể xác nhận!' });
    }

    order.status = 'Hoàn thành';
    await order.save();
    
    res.status(200).json({ message: 'Cảm ơn bạn đã xác nhận nhận hàng!', data: order });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// [GET] Admin lấy danh sách TẤT CẢ đơn hàng
// ==========================================
// (Đoạn này giữ nguyên của bạn)
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