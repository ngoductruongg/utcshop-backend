import nodemailer from 'nodemailer';
import dotenv from 'dotenv'; // Thêm công cụ đọc biến môi trường

dotenv.config(); // Kích hoạt đọc file .env NGAY TẠI ĐÂY

// Cấu hình Bác đưa thư
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Đảm bảo gọi đúng tên biến trong file .env
    pass: process.env.EMAIL_PASS,
  },
});

export const sendWelcomeEmail = async (toEmail: string, userName: string) => {
  try {
    const mailOptions = {
      from: `"Tiệm Tóc UTC" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '🎉 Đăng ký tài khoản thành công!',
      html: `
        <h2>Chào mừng ${userName} đến với Tiệm Tóc UTC!</h2>
        <p>Cảm ơn bạn đã đăng ký tài khoản. Bây giờ bạn đã có thể đăng nhập và đặt lịch cắt tóc ngay lập tức.</p>
        <p>Chúc bạn có một trải nghiệm tuyệt vời!</p>
        <br/>
        <p><i>Trân trọng,<br/>Đội ngũ Tiệm Tóc UTC</i></p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Đã gửi email thành công tới: ${toEmail}`);
  } catch (error) {
    console.error('Lỗi khi gửi email:', error);
  }
};
// Hàm gửi mã OTP quên mật khẩu
export const sendOTPEmail = async (toEmail: string, otp: string) => {
  try {
    const mailOptions = {
      from: `"Tiệm Tóc UTC" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '🔑 Mã xác nhận lấy lại mật khẩu',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Yêu cầu đặt lại mật khẩu</h2>
          <p>Mã xác nhận (OTP) của bạn là: <b style="font-size: 24px; color: red;">${otp}</b></p>
          <p>Mã này sẽ hết hạn sau <b>15 phút</b>.</p>
          <p>Nếu bạn không yêu cầu đổi mật khẩu, vui lòng bỏ qua email này.</p>
        </div>
      `,
    };

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail(mailOptions);
    console.log(`Đã gửi mã OTP thành công tới: ${toEmail}`);
  } catch (error) {
    console.error('Lỗi khi gửi mã OTP:', error);
  }
};