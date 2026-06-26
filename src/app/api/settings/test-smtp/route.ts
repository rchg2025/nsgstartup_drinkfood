import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  
  if (role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const { host, port, user, pass, fromName } = await req.json();

    if (!host || !user || !pass) {
      return NextResponse.json({ error: "Vui lòng điền đầy đủ Host, Username và Password" }, { status: 400 });
    }

    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port || "465", 10),
      secure: parseInt(port || "465", 10) === 465,
      auth: {
        user,
        pass,
      },
    });

    // Test connection first
    await transporter.verify();

    // Get admin email to send the test email
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", active: true, email: { not: "" } },
      select: { email: true }
    });
    
    let toEmail = user; // Fallback to send to itself
    if (admins.length > 0) {
      toEmail = admins[0].email;
    }

    await transporter.sendMail({
      from: `"${fromName || "System Test"}" <${user}>`,
      to: toEmail,
      subject: "Test kết nối SMTP thành công",
      html: `
        <div style="padding: 20px; font-family: sans-serif;">
          <h2>🎉 Chúc mừng!</h2>
          <p>Hệ thống đã kết nối thành công với máy chủ SMTP của bạn.</p>
          <p>Từ giờ, hệ thống sẽ gửi email cảnh báo tự động thông qua cấu hình này.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Lỗi test SMTP:", error);
    return NextResponse.json({ error: error.message || "Lỗi khi gửi email test" }, { status: 500 });
  }
}
