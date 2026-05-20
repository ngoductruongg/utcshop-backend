import mongoose from 'mongoose';

const productCommentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  content: { type: String, required: true } // Chỉ cần chữ, không cần sao
}, { timestamps: true });

export default mongoose.model('ProductComment', productCommentSchema);