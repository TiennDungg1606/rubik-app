import nodemailer from "nodemailer";

export async function sendResetPasswordEmail(to, resetLink) {
  // Cấu hình transporter với Gmail (nên dùng App Password)
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER, // ví dụ: yourgmail@gmail.com
      pass: process.env.GMAIL_PASS, // App Password
    },
  });

  const mailOptions = {
    from: `Rubik App <${process.env.GMAIL_USER}>`,
    to,
    subject: "Đặt lại mật khẩu Rubik App",
    html: `<p>Bạn vừa yêu cầu đặt lại mật khẩu Rubik App.</p>
      <p>Nhấn vào link sau để đặt lại mật khẩu:</p>
      <a href="${resetLink}">${resetLink}</a>
      <p>Nếu không phải bạn, hãy bỏ qua email này.</p>`
  };

  await transporter.sendMail(mailOptions);
}
