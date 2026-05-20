import mongoose, { Schema, Document } from 'mongoose';

// 1. Định nghĩa kiểu dữ liệu (Interface) cho TypeScript
export interface IBlockedTime extends Document {
  stylist: mongoose.Types.ObjectId;
  startTime: Date;
  endTime: Date;
  reason: string;
}

// 2. Tạo cấu trúc bảng (Schema)
const BlockedTimeSchema: Schema = new Schema(
  {
    // ID của Thợ bị khóa lịch (Liên kết với bảng User)
    stylist: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    
    // Giờ bắt đầu khóa (Ví dụ: 09:00 ngày 24/04)
    startTime: { 
      type: Date, 
      required: true 
    },
    
    // Giờ kết thúc khóa (Ví dụ: 09:45 ngày 24/04)
    endTime: { 
      type: Date, 
      required: true 
    },
    
    // Lý do khóa (Để sau này hiển thị cho Lễ tân biết tại sao khóa)
    reason: { 
      type: String, 
      default: 'Khách vãng lai' 
    },
  },
  { 
    timestamps: true // Tự động sinh ra ngày tạo (createdAt) và ngày cập nhật (updatedAt)
  }
);

// 3. Xuất model ra để dùng ở các file khác
export default mongoose.model<IBlockedTime>('BlockedTime', BlockedTimeSchema);