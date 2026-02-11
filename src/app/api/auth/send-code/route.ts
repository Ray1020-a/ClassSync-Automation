// src/app/api/auth/send-code/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

// 建立一個簡單的記憶體暫存 (在正式環境建議用 Redis)
const codeStorage = new Map();

export async function POST(request: Request) {
  const { email } = await request.json();
  const userId = email.split('@')[0];

  if (!email.endsWith('@tschool.tp.edu.tw')) {
    return NextResponse.json({ error: '限 @tschool.tp.edu.tw 登入' }, { status: 403 });
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // 將驗證碼存入暫存，5 分鐘後過期
  codeStorage.set(userId, code);
  setTimeout(() => codeStorage.delete(userId), 5 * 60 * 1000);

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
  });

  try {
    await transporter.sendMail({
      from: `"ClassSync" <${process.env.SMTP_USER}>`,
      to: email,
      subject: `登入驗證碼：${code}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px; max-width: 400px;">
          <h2 style="color: #2563eb;">ClassSync 課表同步系統</h2>
          <p>您好，您的登入驗證碼如下：</p>
          <div style="background: #f3f4f6; padding: 15px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937; margin: 20px 0;">
            ${code}
          </div>
          <p style="font-size: 12px; color: #9ca3af;">此驗證碼僅用於登入驗證，請勿洩漏給他人。如果不是您本人操作，請忽略此郵件。</p>
        </div>
      `,
    });
    const mailOptions = {
      
    };

    console.log(`[驗證碼] ${email} -> ${code}`); // 開發調試用
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '郵件發送失敗' }, { status: 500 });
  }
}

// 導出暫存供下一個 API 使用 (僅限同一個伺服器實例)
export { codeStorage };