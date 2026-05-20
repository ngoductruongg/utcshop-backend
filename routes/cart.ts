import express from 'express';
import Cart from '../models/Cart';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

// ==========================================
// [GET] Xem giỏ hàng của tôi
// ==========================================
router.get('/', verifyToken, async (req: any, res): Promise<any> => {
  try {
    // Tìm giỏ hàng của User đang đăng nhập, và kéo theo thông tin Sản phẩm (Tên, Giá, Ảnh)
    let cart = await Cart.findOne({ user: req.user.userId }).populate('items.product', 'name price image');
    
    // Nếu khách chưa từng thêm gì vào giỏ, tạo trả về một giỏ rỗng cho Frontend đỡ lỗi
    if (!cart) {
      return res.status(200).json({ message: 'Giỏ hàng trống', data: { items: [] } });
    }

    res.status(200).json({ message: 'Lấy giỏ hàng thành công', data: cart });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// [POST] Thêm sản phẩm vào giỏ hàng (Hoặc cộng dồn số lượng)
// ==========================================
router.post('/', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const { productId, quantity } = req.body;
    const userId = req.user.userId;

    // 1. Tìm xem khách này đã có giỏ hàng trong DB chưa
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      // Nếu chưa có, tạo giỏ hàng mới toanh
      cart = new Cart({
        user: userId,
        items: [{ product: productId, quantity: quantity || 1 }]
      });
    } else {
      // 2. Nếu có giỏ rồi, kiểm tra xem món hàng này đã nằm trong giỏ chưa
      const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

      if (itemIndex > -1) {
        // Có rồi -> Cộng dồn số lượng
        cart.items[itemIndex].quantity += (quantity || 1);
      } else {
        // Chưa có -> Thêm món mới vào rổ
        cart.items.push({ product: productId, quantity: quantity || 1 });
      }
    }

    await cart.save();
    
    // Tùy chọn: Gọi populate để trả về giỏ hàng đẹp đẽ ngay sau khi thêm
    await cart.populate('items.product', 'name price image');

    res.status(200).json({ message: 'Đã thêm vào giỏ hàng!', data: cart });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi thêm vào giỏ', error });
  }
});
// ==========================================
// [PUT] Giảm số lượng 1 sản phẩm trong giỏ (Nút dấu trừ [-])
// ==========================================
router.put('/decrease', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const { productId } = req.body;
    const userId = req.user.userId;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Không tìm thấy giỏ hàng!' });
    }

    // Tìm xem món hàng này đang nằm ở vị trí thứ mấy trong giỏ
    const itemIndex = cart.items.findIndex((item: any) => item.product.toString() === productId);

    if (itemIndex > -1) {
      // Nếu số lượng đang lớn hơn 1 thì mới trừ đi 1
      if (cart.items[itemIndex].quantity > 1) {
        cart.items[itemIndex].quantity -= 1;
      } else {
        // Nếu số lượng đang là 1 mà khách vẫn cố tình bấm nút trừ, 
        // thì ta dùng lệnh splice để xóa sổ nó khỏi giỏ luôn (giống logic của Shopee)
        cart.items.splice(itemIndex, 1);
      }
      
      await cart.save();
      
      // Populate lại để trả về tên/giá sản phẩm cho Frontend hiển thị
      await cart.populate('items.product', 'name price image');
      
      return res.status(200).json({ message: 'Đã giảm số lượng sản phẩm!', data: cart });
    } else {
      return res.status(404).json({ message: 'Sản phẩm không có trong giỏ hàng!' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi giảm số lượng', error });
  }
});
// ==========================================
// [DELETE] Xóa 1 món đồ khỏi giỏ hàng
// ==========================================
router.delete('/:productId', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const userId = req.user.userId;
    const productId = req.params.productId;

    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: 'Không tìm thấy giỏ hàng!' });
    }

    // Lọc bỏ sản phẩm có ID truyền vào ra khỏi mảng items
    cart.items = cart.items.filter(item => item.product.toString() !== productId) as any;

    await cart.save();
    await cart.populate('items.product', 'name price image');

    res.status(200).json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng!', data: cart });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi xóa sản phẩm', error });
  }
});

export default router;