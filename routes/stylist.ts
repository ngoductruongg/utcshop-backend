// import express from 'express';
// import bcrypt from 'bcryptjs';
// import multer from 'multer';
// import path from 'path';
// import User from '../models/User';
// import StylistProfile from '../models/StylistProfile';
// // 📍 IMPORT THÊM MODEL REVIEW ĐỂ TÍNH ĐIỂM
// import Review from '../models/Review'; 
// import { verifyAdmin, verifyToken } from '../middleware/authMiddleware';

// const router = express.Router();

// // ==========================================
// // CẤU HÌNH MULTER ĐỂ LƯU ẢNH VÀO THƯ MỤC 'uploads/'
// // ==========================================
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, 'uploads/'); 
//   },
//   filename: function (req, file, cb) {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
//     cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });

// const upload = multer({ storage: storage });

// // ==========================================
// // 1. [POST] ADMIN THÊM THỢ MỚI (CREATE)
// // ==========================================
// router.post('/', /* verifyAdmin, */ upload.single('avatar'), async (req: any, res): Promise<any> => {
//   try {
//     const { name, email, password, phone, description, specialty } = req.body;

//     let avatarPath = '';
//     if (req.file) {
//       avatarPath = `/uploads/${req.file.filename}`;
//     }

//     const userExists = await User.findOne({ email });
//     if (userExists) return res.status(400).json({ message: 'Email đã tồn tại!' });

//     const hashedPassword = await bcrypt.hash(password, 10);
//     const newUser = new User({
//       name, email, phone, password: hashedPassword, role: 'stylist'
//     });
//     await newUser.save();

//     const newProfile = new StylistProfile({
//       user: newUser._id,
//       bio: description, 
//       specialty, 
//       avatar: avatarPath 
//     });
//     await newProfile.save();

//     res.status(201).json({ message: 'Đã thêm Stylist thành công!', data: newProfile });
//   } catch (error) {
//     console.error('Lỗi khi thêm Stylist:', error);
//     res.status(500).json({ message: 'Lỗi server', error });
//   }
// });

// // ==========================================
// // 2. [GET] LẤY DANH SÁCH THỢ VÀ TÍNH SỐ SAO (READ)
// // ==========================================
// router.get('/', async (req, res): Promise<any> => {
//   try {
//     // Thêm .lean() để biến object Mongoose thành Javascript thuần (Cho phép nhồi thêm dữ liệu)
//     const stylists = await StylistProfile.find()
//       .populate('user', 'name email phone') 
//       .lean() 
//       .exec();

//     // Duyệt qua từng Stylist để tính điểm trung bình
//     // ... code phía trên giữ nguyên (đoạn const stylists = await StylistProfile.find()...)

//     // 📍 ĐOẠN MỚI: DUYỆT VÀ TÍNH ĐIỂM "VÉT CẠN"
//     const stylistsWithRating = await Promise.all(stylists.map(async (stylist) => {
      
//       // Lấy ra cả 2 loại ID để quăng mẻ lưới lớn
//       const profileId = stylist._id;
//       const userId = stylist.user ? stylist.user._id : null;

//       // Xây dựng bộ lọc tìm kiếm: Tìm bằng Profile ID hoặc User ID
//       const query: any = {
//         $or: [
//           { stylist: profileId },
//           { stylist: profileId.toString() }
//         ]
//       };

//       if (userId) {
//         query.$or.push({ stylist: userId });
//         query.$or.push({ stylist: userId.toString() });
//       }

//       // Quét tìm trong bảng Review
//       const reviews = await Review.find(query);
      
//       // 💡 In ra màn hình Terminal của Backend để bạn dễ dàng kiểm tra xem nó bắt được bao nhiêu bài
//       console.log(`Thợ: ${(stylist.user as any)?.name} | Bắt được: ${reviews.length} đánh giá`);

//       let averageRating = 5.0; 
//       let reviewCount = 0;

//       if (reviews.length > 0) {
//         reviewCount = reviews.length;
//         const totalStars = reviews.reduce((sum, review) => sum + (review.rating || 5), 0);
//         averageRating = parseFloat((totalStars / reviewCount).toFixed(1)); 
//       }

//       return {
//         ...stylist,
//         rating: averageRating,
//         reviewCount: reviewCount
//       };
//     }));

//     res.status(200).json({ data: stylistsWithRating });
//   } catch (error) {
//     res.status(500).json({ message: 'Lỗi server', error });
//   }
// });

// // ==========================================
// // 3. [PUT] CẬP NHẬT THÔNG TIN THỢ (UPDATE)
// // ==========================================
// router.put('/:profileId', /* verifyAdmin, */ upload.single('avatar'), async (req: any, res): Promise<any> => {
//   try {
//     const { name, phone, description, specialty, isAvailable } = req.body;

//     const profile = await StylistProfile.findById(req.params.profileId);
//     if (!profile) return res.status(404).json({ message: 'Không tìm thấy thợ!' });

//     if (req.file) {
//       profile.avatar = `/uploads/${req.file.filename}`;
//     }

//     profile.bio = description || profile.bio;
//     profile.specialty = specialty || profile.specialty;
//     if (isAvailable !== undefined) profile.isAvailable = isAvailable;
//     await profile.save();

//     await User.findByIdAndUpdate(profile.user, { name, phone });

//     res.status(200).json({ message: 'Cập nhật thành công!' });
//   } catch (error) {
//     res.status(500).json({ message: 'Lỗi server', error });
//   }
// });

// // ==========================================
// // 4. [DELETE] XÓA HOẶC VÔ HIỆU HÓA THỢ (DELETE)
// // ==========================================
// router.delete('/:profileId', /* verifyAdmin, */ async (req: any, res): Promise<any> => {
//   try {
//     const profile = await StylistProfile.findById(req.params.profileId);
//     if (!profile) return res.status(404).json({ message: 'Không tìm thấy thợ!' });

//     profile.isAvailable = false;
//     await profile.save();

//     res.status(200).json({ message: 'Đã vô hiệu hóa thợ này!' });
//   } catch (error) {
//     res.status(500).json({ message: 'Lỗi server', error });
//   }
//   // ==========================================
// // [GET] THỢ XEM ĐÁNH GIÁ CỦA CHÍNH MÌNH
// // ==========================================
// router.get('/my-reviews', verifyToken, async (req: any, res): Promise<any> => {
//   try {
//     const userId = req.user.userId || req.user.id || req.user._id;
//     // Vì bảng Review lưu ID theo 2 kiểu, ta tìm bằng $or
//     const profile = await StylistProfile.findOne({ user: userId });
//     const query = { $or: [{ stylist: userId }, { stylist: profile?._id }] };

//     const reviews = await Review.find(query)
//       .populate('user', 'name avatar')
//       .populate('service', 'name')
//       .sort({ createdAt: -1 });

//     res.status(200).json({ data: reviews });
//   } catch (error) {
//     res.status(500).json({ message: 'Lỗi server' });
//   }
// });

// // ==========================================
// // [GET & PUT] LẤY VÀ CẬP NHẬT HỒ SƠ CÁ NHÂN (MY PROFILE)
// // ==========================================
// router.get('/my-profile', verifyToken, async (req: any, res): Promise<any> => {
//   try {
//     const userId = req.user.userId || req.user.id || req.user._id;
//     const profile = await StylistProfile.findOne({ user: userId }).populate('user', 'name phone email');
//     res.status(200).json({ data: profile });
//   } catch (error) {
//     res.status(500).json({ message: 'Lỗi server' });
//   }
// });

// router.put('/my-profile', verifyToken, upload.single('avatar'), async (req: any, res): Promise<any> => {
//   try {
//     const userId = req.user.userId || req.user.id || req.user._id;
//     const { bio, specialty } = req.body;

//     let profile = await StylistProfile.findOne({ user: userId });
//     if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });

//     if (req.file) profile.avatar = `/uploads/${req.file.filename}`;
//     if (bio) profile.bio = bio;
//     if (specialty) profile.specialty = specialty.split(','); // FE gửi string cách nhau dấu phẩy

//     await profile.save();
//     res.status(200).json({ message: 'Đã cập nhật hồ sơ!', data: profile });
//   } catch (error) {
//     res.status(500).json({ message: 'Lỗi server' });
//   }
// });
// router.get('/my-reviews', verifyToken, async (req: any, res): Promise<any> => {
//   try {
//     const userId = req.user.userId || req.user.id || req.user._id;
//     const profile = await StylistProfile.findOne({ user: userId });
//     const query = { $or: [{ stylist: userId }, { stylist: profile?._id }] };

//     const reviews = await Review.find(query)
//       .populate('user', 'name avatar')
//       .populate('service', 'name')
//       .sort({ createdAt: -1 });

//     res.status(200).json({ data: reviews });
//   } catch (error) {
//     res.status(500).json({ message: 'Lỗi server' });
//   }
// });

// router.get('/my-profile', verifyToken, async (req: any, res): Promise<any> => {
//   try {
//     const userId = req.user.userId || req.user.id || req.user._id;
//     const profile = await StylistProfile.findOne({ user: userId }).populate('user', 'name phone email');
//     res.status(200).json({ data: profile });
//   } catch (error) {
//     res.status(500).json({ message: 'Lỗi server' });
//   }
// });

// router.put('/my-profile', verifyToken, upload.single('avatar'), async (req: any, res): Promise<any> => {
//   try {
//     const userId = req.user.userId || req.user.id || req.user._id;
//     const { bio, specialty } = req.body;

//     let profile = await StylistProfile.findOne({ user: userId });
//     if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });

//     if (req.file) profile.avatar = `/uploads/${req.file.filename}`;
//     if (bio) profile.bio = bio;
//     if (specialty) profile.specialty = specialty.split(',');

//     await profile.save();
//     res.status(200).json({ message: 'Đã cập nhật hồ sơ!', data: profile });
//   } catch (error) {
//     res.status(500).json({ message: 'Lỗi server' });
//   }
// });
// });

// export default router;
import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import User from '../models/User';
import StylistProfile from '../models/StylistProfile';
import Review from '../models/Review';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

// CẤU HÌNH MULTER
const storage = multer.diskStorage({
  destination: function (req, file, cb) { cb(null, 'uploads/'); },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// ==========================================
// 📍 API MỚI: THỢ XEM ĐÁNH GIÁ CỦA CHÍNH MÌNH
// ==========================================
router.get('/my-reviews', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const profile = await StylistProfile.findOne({ user: userId });
    const query = { $or: [{ stylist: userId }, { stylist: profile?._id }] };

    const reviews = await Review.find(query)
      .populate('user', 'name avatar')
      .populate('service', 'name')
      .sort({ createdAt: -1 });

    res.status(200).json({ data: reviews });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==========================================
// 📍 API MỚI: LẤY VÀ CẬP NHẬT HỒ SƠ (MY PROFILE)
// ==========================================
router.get('/my-profile', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const profile = await StylistProfile.findOne({ user: userId }).populate('user', 'name phone email');
    res.status(200).json({ data: profile });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.put('/my-profile', verifyToken, upload.single('avatar'), async (req: any, res): Promise<any> => {
  try {
    const userId = req.user.userId || req.user.id || req.user._id;
    const { bio, specialty } = req.body;

    let profile = await StylistProfile.findOne({ user: userId });
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy hồ sơ' });

    if (req.file) profile.avatar = `/uploads/${req.file.filename}`;
    if (bio) profile.bio = bio;
    if (specialty) profile.specialty = specialty.split(',');

    await profile.save();
    res.status(200).json({ message: 'Đã cập nhật hồ sơ!', data: profile });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

// ==========================================
// CÁC API CŨ CỦA BẠN (GIỮ NGUYÊN)
// ==========================================
router.post('/', upload.single('avatar'), async (req: any, res): Promise<any> => {
  try {
    const { name, email, password, phone, description, specialty } = req.body;
    let avatarPath = '';
    if (req.file) avatarPath = `/uploads/${req.file.filename}`;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'Email đã tồn tại!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, phone, password: hashedPassword, role: 'stylist' });
    await newUser.save();

    const newProfile = new StylistProfile({ user: newUser._id, bio: description, specialty, avatar: avatarPath });
    await newProfile.save();

    res.status(201).json({ message: 'Đã thêm Stylist thành công!', data: newProfile });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// router.get('/', async (req, res): Promise<any> => {
//   try {
//     const stylists = await StylistProfile.find().populate('user', 'name email phone').lean().exec();
//     const stylistsWithRating = await Promise.all(stylists.map(async (stylist) => {
//       const profileId = stylist._id;
//       const userId = stylist.user ? (stylist.user as any)._id : null;
//       const query: any = { $or: [{ stylist: profileId }, { stylist: profileId.toString() }] };
//       if (userId) {
//         query.$or.push({ stylist: userId });
//         query.$or.push({ stylist: userId.toString() });
//       }
//       const reviews = await Review.find(query);
//       let averageRating = 5.0;
//       let reviewCount = 0;
//       if (reviews.length > 0) {
//         reviewCount = reviews.length;
//         const totalStars = reviews.reduce((sum, review) => sum + (review.rating || 5), 0);
//         averageRating = parseFloat((totalStars / reviewCount).toFixed(1));
//       }
//       return { ...stylist, rating: averageRating, reviewCount: reviewCount };
//     }));
//     res.status(200).json({ data: stylistsWithRating });
//   } catch (error) {
//     res.status(500).json({ message: 'Lỗi server', error });
//   }
// });
// ==========================================
// [GET] Lấy danh sách thợ đang hoạt động (ĐÃ SỬA LỖI LỌC)
// ==========================================
router.get('/', async (req, res): Promise<any> => {
  try {
    // 💡 SỬA TẠI ĐÂY: Thêm điều kiện lọc { isAvailable: true }
    const stylists = await StylistProfile.find({ isAvailable: true })
      .populate('user', 'name email phone')
      .lean()
      .exec();

    const stylistsWithRating = await Promise.all(stylists.map(async (stylist) => {
      const profileId = stylist._id;
      const userId = stylist.user ? (stylist.user as any)._id : null;
      const query: any = { $or: [{ stylist: profileId }, { stylist: profileId.toString() }] };
      if (userId) {
        query.$or.push({ stylist: userId });
        query.$or.push({ stylist: userId.toString() });
      }
      const reviews = await Review.find(query);
      let averageRating = 5.0;
      let reviewCount = 0;
      if (reviews.length > 0) {
        reviewCount = reviews.length;
        const totalStars = reviews.reduce((sum, review) => sum + (review.rating || 5), 0);
        averageRating = parseFloat((totalStars / reviewCount).toFixed(1));
      }
      return { ...stylist, rating: averageRating, reviewCount: reviewCount };
    }));
    res.status(200).json({ data: stylistsWithRating });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});
router.put('/:profileId', upload.single('avatar'), async (req: any, res): Promise<any> => {
  try {
    const { name, phone, description, specialty, isAvailable } = req.body;
    const profile = await StylistProfile.findById(req.params.profileId);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy thợ!' });

    if (req.file) profile.avatar = `/uploads/${req.file.filename}`;
    profile.bio = description || profile.bio;
    profile.specialty = specialty || profile.specialty;
    if (isAvailable !== undefined) profile.isAvailable = isAvailable;
    await profile.save();

    await User.findByIdAndUpdate(profile.user, { name, phone });
    res.status(200).json({ message: 'Cập nhật thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

router.delete('/:profileId', async (req: any, res): Promise<any> => {
  try {
    const profile = await StylistProfile.findById(req.params.profileId);
    if (!profile) return res.status(404).json({ message: 'Không tìm thấy thợ!' });

    profile.isAvailable = false;
    await profile.save();
    res.status(200).json({ message: 'Đã vô hiệu hóa thợ này!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

export default router;