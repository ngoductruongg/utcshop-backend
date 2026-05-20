import express from 'express';
import Booking from '../models/Booking';
import Service from '../models/Service';
import User from '../models/User';
import BlockedTime from '../models/BlockedTime';
import Review from '../models/Review';
import { verifyToken } from '../middleware/authMiddleware';

const router = express.Router();

router.post('/', async (req: any, res): Promise<any> => {
  try {
    const { user, service, stylist, startTime, note } = req.body;
    const serviceData = await Service.findById(service);
    if (!serviceData) return res.status(404).json({ message: 'Không tìm thấy dịch vụ!' });
    const start = new Date(startTime);
    const durationInMs = serviceData.duration * 60 * 1000;
    const end = new Date(start.getTime() + durationInMs);
    const overlappingBooking = await Booking.findOne({
      stylist: stylist,
      status: { $nin: ['cancelled', 'no-show'] },
      $or: [{ startTime: { $lt: end }, endTime: { $gt: start } }]
    });
    if (overlappingBooking) return res.status(400).json({ message: 'Rất tiếc, Stylist này đã kẹt lịch.' });
    
    const newBooking = new Booking({ user, service, stylist, startTime: start, endTime: end, note, totalPrice: serviceData.price });
    await newBooking.save();
    res.status(201).json({ message: '🎉 Đặt lịch thành công!', data: newBooking });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

router.get('/', async (req: any, res): Promise<any> => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const statusFilter = req.query.status || 'all';
    let queryObj: any = {};
    if (search) {
      const matchedUsers = await User.find({
        $or: [{ name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }]
      }).select('_id');
      queryObj.user = { $in: matchedUsers.map(u => u._id) };
    }
    if (statusFilter !== 'all') queryObj.status = statusFilter;
    const total = await Booking.countDocuments(queryObj);
    const bookings = await Booking.find(queryObj).populate('user', 'name phone email').populate('service', 'name price duration').populate('stylist', 'name').sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit);
    res.status(200).json({ data: bookings, pagination: { currentPage: page, totalPages: Math.ceil(total / limit) || 1, totalItems: total } });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

router.get('/user/:userId', async (req: any, res): Promise<any> => {
  try {
    const myBookings = await Booking.find({ user: req.params.userId }).populate('service', 'name price duration').populate('stylist', 'name avatar').sort({ startTime: -1 });
    res.status(200).json({ data: myBookings });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// 📍 2 API MỚI CỦA THỢ LÀ NẰM ĐÚNG CHỖ NÀY
// ==========================================
// ==========================================
// [GET] LẤY LỊCH CỦA THỢ (CÓ THỂ LỌC THEO NGÀY)
// ==========================================
router.get('/my-schedule', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const stylistId = req.user.userId || req.user.id || req.user._id;
    const dateParam = req.query.date; // Lấy ngày từ Frontend gửi lên

    let queryObj: any = { stylist: stylistId, status: { $ne: 'cancelled' } };

    // Nếu Frontend có gửi ngày lên (VD: '2026-05-12'), ta sẽ lọc lịch từ 0h00 đến 23h59 của ngày đó
    if (dateParam) {
      const startOfDay = new Date(`${dateParam}T00:00:00.000+07:00`); // Giờ VN
      const endOfDay = new Date(`${dateParam}T23:59:59.999+07:00`);
      queryObj.startTime = { $gte: startOfDay, $lte: endOfDay };
    }

    const schedules = await Booking.find(queryObj)
      .populate('user', 'name phone')
      .populate('service', 'name price duration')
      .sort({ startTime: 1 }); // Sắp xếp giờ từ sáng đến tối

    res.status(200).json({ data: schedules });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

router.get('/my-stats', verifyToken, async (req: any, res): Promise<any> => {
  try {
    const stylistId = req.user.userId || req.user.id || req.user._id;
    const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

    const completedBookings = await Booking.find({ stylist: stylistId, status: 'completed' });
    const todayBookings = completedBookings.filter(b => new Date(b.startTime) >= startOfDay);
    const monthBookings = completedBookings.filter(b => new Date(b.startTime) >= startOfMonth);

    const todayRevenue = todayBookings.reduce((sum, b) => sum + b.totalPrice, 0);
    const monthRevenue = monthBookings.reduce((sum, b) => sum + b.totalPrice, 0);

    res.status(200).json({
      todayCount: todayBookings.length,
      todayRevenue,
      todayCommission: todayRevenue * 0.4,
      monthCount: monthBookings.length,
      monthRevenue,
      monthCommission: monthRevenue * 0.4
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

// ==========================================
// CÁC API CŨ CỦA BẠN (GIỮ NGUYÊN)
// ==========================================
router.put('/:id/status', async (req: any, res): Promise<any> => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled', 'no-show'];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: 'Trạng thái không hợp lệ!' });
    const updatedBooking = await Booking.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!updatedBooking) return res.status(404).json({ message: 'Không tìm thấy lịch hẹn!' });
    res.status(200).json({ message: 'Cập nhật thành công!', data: updatedBooking });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

router.delete('/:id', async (req: any, res): Promise<any> => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy!' });
    booking.status = 'cancelled';
    await booking.save();
    res.status(200).json({ message: 'Đã hủy thành công!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

router.get('/stats/no-show', async (req: any, res): Promise<any> => {
  try {
    const noShowBookings = await Booking.find({ status: 'no-show' }).populate('stylist', 'name avatar');
    const stats = noShowBookings.reduce((acc: any, curr: any) => {
      if (!curr.stylist) return acc;
      const stylistId = curr.stylist._id.toString();
      if (!acc[stylistId]) acc[stylistId] = { stylistId: curr.stylist._id, name: curr.stylist.name, avatar: curr.stylist.avatar, noShowCount: 0 };
      acc[stylistId].noShowCount += 1;
      return acc;
    }, {});
    res.status(200).json({ data: Object.values(stats).sort((a: any, b: any) => b.noShowCount - a.noShowCount) });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

router.get('/busy-times', async (req: any, res): Promise<any> => {
  try {
    const { stylistId, date } = req.query;
    if (!stylistId || !date) return res.status(400).json({ message: 'Thiếu thông tin!' });
    const startOfDay = new Date(`${date}T00:00:00.000Z`);
    const endOfDay = new Date(`${date}T23:59:59.999Z`);
    const [busyBookings, blockedTimes] = await Promise.all([
      Booking.find({ stylist: stylistId, status: { $nin: ['cancelled', 'no-show'] }, startTime: { $gte: startOfDay, $lte: endOfDay } }).select('startTime endTime'),
      BlockedTime.find({ stylist: stylistId, startTime: { $gte: startOfDay, $lte: endOfDay } }).select('startTime endTime')
    ]);
    res.status(200).json({ data: [...busyBookings, ...blockedTimes] });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
});

router.post('/quick-block', async (req: any, res): Promise<any> => {
  try {
    const { stylist, startTime, duration, reason } = req.body;
    const start = new Date(startTime);
    const end = new Date(start.getTime() + duration * 60000);
    const [overlapBooking, overlapBlock] = await Promise.all([
      Booking.findOne({ stylist, status: { $nin: ['cancelled', 'no-show'] }, $or: [{ startTime: { $lt: end }, endTime: { $gt: start } }] }),
      BlockedTime.findOne({ stylist, $or: [{ startTime: { $lt: end }, endTime: { $gt: start } }] })
    ]);
    if (overlapBooking || overlapBlock) return res.status(400).json({ message: 'Đã trùng lịch!' });
    const newBlock = new BlockedTime({ stylist, startTime: start, endTime: end, reason });
    await newBlock.save();
    res.status(201).json({ message: 'Khóa thành công', data: newBlock });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.get('/quick-block', async (req: any, res): Promise<any> => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const blocks = await BlockedTime.find({ startTime: { $gte: today } }).populate('stylist', 'name').sort({ startTime: 1 });
    res.status(200).json({ data: blocks });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.delete('/quick-block/:id', async (req: any, res): Promise<any> => {
  try {
    const deletedBlock = await BlockedTime.findByIdAndDelete(req.params.id);
    if (!deletedBlock) return res.status(404).json({ message: 'Không tìm thấy!' });
    res.status(200).json({ message: 'Đã mở khóa!' });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

router.post('/:id/review', async (req: any, res): Promise<any> => {
  try {
    const bookingId = req.params.id;
    const { rating, comment, userId } = req.body;
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Không tìm thấy!' });
    if (booking.status !== 'completed') return res.status(400).json({ message: 'Chưa hoàn thành!' });
    if (booking.isReviewed) return res.status(400).json({ message: 'Đã đánh giá!' });
    const newReview = new Review({ booking: bookingId, user: userId, stylist: booking.stylist, service: booking.service, rating, comment });
    await newReview.save();
    booking.isReviewed = true;
    await booking.save();
    res.status(201).json({ message: 'Cảm ơn đã đánh giá', data: newReview });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server' });
  }
});

export default router;