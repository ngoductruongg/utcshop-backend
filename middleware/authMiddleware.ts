import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Mở rộng kiểu dữ liệu Request của Express để nhét thêm thông tin user vào
export interface AuthRequest extends Request {
  user?: any;
}

// Bác bảo vệ 1: Kiểm tra xem có vé (Token) hợp lệ không
export const verifyToken = (req: AuthRequest, res: Response, next: NextFunction): any => {
  // Lấy vé từ Header của Postman gửi lên
  const token = req.header('Authorization')?.split(' ')[1]; 

  if (!token) {
    return res.status(401).json({ message: 'Từ chối truy cập! Không tìm thấy Token.' });
  }

  try {
    // Soi vé xem có khớp với con dấu bí mật không
    const verified = jwt.verify(token, process.env.JWT_SECRET as string);
    req.user = verified; // Cất thông tin user vào req để dùng cho các bước sau
    next(); // Cho qua cổng!
  } catch (error) {
    res.status(400).json({ message: 'Token không hợp lệ hoặc đã hết hạn!' });
  }
};

// Bác bảo vệ 2: Kiểm tra xem có phải là thẻ Admin (Chủ tiệm) không
export const verifyAdmin = (req: AuthRequest, res: Response, next: NextFunction): any => {
  verifyToken(req, res, () => {
    if (req.user.role === 'admin') {
      next(); // Là admin thì cho qua
    } else {
      res.status(403).json({ message: 'Bạn không có quyền thực hiện hành động này!' });
    }
  });
};