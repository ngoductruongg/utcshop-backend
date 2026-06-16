import express from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product'; // 📍 BẮT BUỘC IMPORT THÊM MODEL PRODUCT
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

// ==========================================
// [GET] Xem giỏ hàng của tôi
// ==========================================
router.get('/', verifyToken, async (req: any, res): Promise<any> => {
  try {
    let cart = await Cart.findOne({ user: req.user.userId }).populate('items.product', 'name price image stock'); // Kéo thêm stock để FE biết
    
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
    const requestedQty = quantity || 1;

    // 📍 1. KIỂM TRA TỒN KHO CỦA SẢN PHẨM TRƯỚC TIÊN
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Sản phẩm không tồn tại!' });
    }

    // Nếu kho = 0 hoặc khách đòi mua nhiều hơn số lượng kho đang có
    if (product.stock < requestedQty) {
      return res.status(400).json({ message: `Sản phẩm đã hết hàng hoặc chỉ còn ${product.stock} sản phẩm!` });
    }

    // 2. Tiến hành logic giỏ hàng
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({
        user: userId,
        items: [{ product: productId, quantity: requestedQty }]
      });
    } else {
      const itemIndex = cart.items.findIndex(item => item.product.toString() === productId);

      if (itemIndex > -1) {
        // 📍 KIỂM TRA CỘNG DỒN: Nếu khách ấn nút thêm nhiều lần, tổng số có vượt kho không?
        const newQuantity = cart.items[itemIndex].quantity + requestedQty;
        if (newQuantity > product.stock) {
          return res.status(400).json({ message: `Bạn đã có sản phẩm này trong giỏ. Số lượng kho chỉ còn ${product.stock}!` });
        }
        
        cart.items[itemIndex].quantity = newQuantity;
      } else {
        cart.items.push({ product: productId, quantity: requestedQty });
      }
    }

    await cart.save();
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

    const itemIndex = cart.items.findIndex((item: any) => item.product.toString() === productId);

    if (itemIndex > -1) {
      if (cart.items[itemIndex].quantity > 1) {
        cart.items[itemIndex].quantity -= 1;
      } else {
        cart.items.splice(itemIndex, 1);
      }
      
      await cart.save();
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

    cart.items = cart.items.filter(item => item.product.toString() !== productId) as any;

    await cart.save();
    await cart.populate('items.product', 'name price image');

    res.status(200).json({ message: 'Đã xóa sản phẩm khỏi giỏ hàng!', data: cart });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi xóa sản phẩm', error });
  }
});

export default router;