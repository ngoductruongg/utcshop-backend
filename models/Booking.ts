import mongoose from 'mongoose';

const bookingSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  // Thêm trường này để biết khách đặt thợ nào
  stylist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'completed', 'cancelled','no-show'], 
    default: 'pending' 
  },
  isReviewed: {
    type: Boolean,
    default: false
  },
  totalPrice: { type: Number, required: true }
}, { timestamps: true });

export default mongoose.model('Booking', bookingSchema);