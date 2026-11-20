import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebase';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'נדרשת כתובת אימייל תקינה' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = Date.now() + 10 * 60 * 1000;

    // שמירת קוד האימות באוסף הייעודי של עגלת הקפה
    const otpRef = doc(db, 'coffee_otps', cleanEmail);
    await setDoc(otpRef, {
      otpCode,
      otpExpiry,
      createdAt: Date.now()
    });

    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: 'an.chess.mysterious@gmail.com',
        pass: 'hfyndmadneaffkge',
      },
    });

    const info = await transporter.sendMail({
      from: '"עגלת הקפה" <an.chess.mysterious@gmail.com>',
      replyTo: 'an.chess.mysterious@gmail.com',
      to: cleanEmail,
      subject: `☕ קוד כניסה לעגלת הקפה: ${otpCode}`,
      text: `שלום,\nקוד הכניסה החד-פעמי שלך להזמנה מעגלת הקפה הוא: ${otpCode}\nהקוד תקף ל-10 דקות.`,
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 460px; margin: 0 auto; padding: 28px; background: #1c1917; color: #f5f5f4; border-radius: 16px; border: 1px solid #292524;">
          <div style="text-align: center; margin-bottom: 16px;">
            <span style="font-size: 36px;">☕</span>
            <h2 style="color: #fbbf24; margin: 8px 0 4px 0; font-size: 22px;">עגלת הקפה — קוד כניסה</h2>
            <p style="font-size: 13px; color: #a8a29e; margin: 0;">הקפה והמאפים שלך במרחק קליק</p>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; color: #e7e5e4; text-align: center;">
            היי, הנה הקוד החד-פעמי שלך להתחברות וביצוע הזמנה לאיסוף מהיר:
          </p>
          
          <div style="text-align: center; margin: 20px 0;">
            <div style="font-size: 30px; font-weight: bold; background: #0c0a09; padding: 14px 28px; display: inline-block; border-radius: 12px; color: #f59e0b; letter-spacing: 6px; border: 1px solid #44403c;">
              ${otpCode}
            </div>
          </div>
          
          <p style="margin-top: 20px; font-size: 12px; color: #78716c; text-align: center; border-top: 1px solid #292524; padding-top: 14px;">
            הקוד תקף ל-10 דקות הקרובות • נתראה ליד העגלה! 🥐
          </p>
        </div>
      `,
    });

    if (info.rejected && info.rejected.length > 0) {
      return NextResponse.json({ success: false, error: 'שרת הדואר דחה את הכתובת שהוזנה' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'הקוד נשלח בהצלחה למייל!' });
  } catch (error: any) {
    console.error("Email send error:", error);
    return NextResponse.json({ success: false, error: 'שגיאה בשליחת המייל: ' + error.message }, { status: 500 });
  }
}