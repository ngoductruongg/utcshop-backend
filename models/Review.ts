import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  stylist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // ID thợ
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true }, // ID dịch vụ
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' }
}, { timestamps: true });

export default mongoose.model('Review', ReviewSchema);