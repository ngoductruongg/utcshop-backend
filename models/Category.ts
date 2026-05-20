import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    unique: true // Tên danh mục không được trùng nhau
  },
  description: { 
    type: String 
  }
}, { timestamps: true });

export default mongoose.model('Category', categorySchema);