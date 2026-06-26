import nodemailer from "nodemailer";
import { prisma } from "./prisma";

export async function getSmtpConfig() {
  const settings = await prisma.setting.findMany({
    where: {
      key: {
        in: ["smtp_host", "smtp_port", "smtp_user", "smtp_pass", "smtp_from_name"],
      },
    },
  });

  const config: Record<string, string> = {};
  settings.forEach((s) => {
    config[s.key] = s.value;
  });

  return config;
}

export async function createTransporter() {
  const config = await getSmtpConfig();
  
  if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
    throw new Error("Chưa cấu hình SMTP");
  }

  return nodemailer.createTransport({
    host: config.smtp_host,
    port: parseInt(config.smtp_port || "465", 10),
    secure: parseInt(config.smtp_port || "465", 10) === 465, // true for 465, false for other ports
    auth: {
      user: config.smtp_user,
      pass: config.smtp_pass,
    },
  });
}

// Lấy danh sách email của Admin
async function getAdminEmails() {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", active: true, contactEmail: { not: null } },
    select: { contactEmail: true }
  });
  return admins.map(a => a.contactEmail).filter(Boolean);
}

export async function sendLowStockEmail(productName: string, stockQuantity: number) {
  try {
    const config = await getSmtpConfig();
    const emails = await getAdminEmails();
    if (emails.length === 0) return;

    const transporter = await createTransporter();
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f59e0b; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0;">Cảnh báo: Sắp hết hàng ⚠️</h2>
        </div>
        <div style="padding: 20px;">
          <p>Xin chào Admin,</p>
          <p>Sản phẩm <strong>${productName}</strong> hiện đang sắp hết hàng trong kho.</p>
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;">Số lượng tồn kho hiện tại: <strong style="color: #d97706; font-size: 20px;">${stockQuantity}</strong></p>
          </div>
          <p>Vui lòng kiểm tra và nhập thêm hàng sớm để không bị gián đoạn hoạt động kinh doanh.</p>
          <br/>
          <p>Trân trọng,<br/><strong>Hệ thống quản lý Device Manager</strong></p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${config.smtp_from_name || "Device Manager"}" <${config.smtp_user}>`,
      to: emails.join(", "),
      subject: `[CẢNH BÁO] Sản phẩm ${productName} sắp hết hàng`,
      html,
    });
  } catch (error) {
    console.error("Lỗi khi gửi email Sắp hết hàng:", error);
  }
}

export async function sendOutOfStockEmail(productName: string) {
  try {
    const config = await getSmtpConfig();
    const emails = await getAdminEmails();
    if (emails.length === 0) return;

    const transporter = await createTransporter();
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #dc2626; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0;">Cảnh báo khẩn: HẾT HÀNG 🚨</h2>
        </div>
        <div style="padding: 20px;">
          <p>Xin chào Admin,</p>
          <p>Sản phẩm <strong>${productName}</strong> đã <strong>HẾT HÀNG</strong> trong hệ thống.</p>
          <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; font-size: 16px;">Số lượng tồn kho hiện tại: <strong style="color: #991b1b; font-size: 20px;">0</strong></p>
          </div>
          <p>Sản phẩm này sẽ không thể tiếp tục đặt hàng trên hệ thống. Vui lòng cập nhật kho khẩn cấp!</p>
          <br/>
          <p>Trân trọng,<br/><strong>Hệ thống quản lý Device Manager</strong></p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"${config.smtp_from_name || "Device Manager"}" <${config.smtp_user}>`,
      to: emails.join(", "),
      subject: `[KHẨN CẤP] Sản phẩm ${productName} ĐÃ HẾT HÀNG`,
      html,
    });
  } catch (error) {
    console.error("Lỗi khi gửi email Hết hàng:", error);
  }
}

export interface DailyReportData {
  date: string;
  totalRevenue: number;
  totalOrders: number;
  totalItems: number;
  commissions?: {
    totalCommission: number;
    totalTips: number;
  };
}

export async function sendDailyReportEmail(data: DailyReportData) {
  try {
    const config = await getSmtpConfig();
    const emails = await getAdminEmails();
    if (emails.length === 0) return;

    const transporter = await createTransporter();
    
    let commissionHtml = '';
    if (data.commissions && (data.commissions.totalCommission > 0 || data.commissions.totalTips > 0)) {
      commissionHtml = `
        <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
          <h3 style="margin: 0 0 15px 0; color: #4b5563;">💰 Thu nhập của Band nhạc</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Tổng Hoa hồng:</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: bold; color: #1f2937;">${data.commissions.totalCommission.toLocaleString('vi-VN')} ₫</td>
            </tr>
            <tr>
              <td style="padding: 10px; color: #6b7280;">Tổng Tiền Tips:</td>
              <td style="padding: 10px; text-align: right; font-weight: bold; color: #10b981;">${data.commissions.totalTips.toLocaleString('vi-VN')} ₫</td>
            </tr>
          </table>
        </div>
      `;
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
        <div style="background-color: #3b82f6; padding: 20px; text-align: center; color: white;">
          <h2 style="margin: 0;">📊 Báo cáo Doanh thu Hàng ngày</h2>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Ngày: ${data.date}</p>
        </div>
        <div style="padding: 20px;">
          <h3 style="margin: 0 0 15px 0; color: #4b5563;">Tổng quan Kinh doanh</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Tổng Doanh thu:</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: bold; color: #3b82f6; font-size: 18px;">${data.totalRevenue.toLocaleString('vi-VN')} ₫</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Số lượng Đơn hàng:</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: bold; color: #1f2937;">${data.totalOrders.toLocaleString('vi-VN')}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; color: #6b7280;">Sản phẩm đã bán:</td>
              <td style="padding: 10px; border-bottom: 1px solid #f3f4f6; text-align: right; font-weight: bold; color: #1f2937;">${data.totalItems.toLocaleString('vi-VN')}</td>
            </tr>
          </table>

          ${commissionHtml}

          <div style="margin-top: 30px; padding: 15px; background-color: #f8fafc; border-radius: 6px; font-size: 13px; color: #64748b; text-align: center;">
            Đây là email tự động từ hệ thống NSG Startup.<br/>Vui lòng không trả lời email này.
          </div>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: \`"\${config.smtp_from_name || "Device Manager"}" <\${config.smtp_user}>\`,
      to: emails.join(", "),
      subject: \`[BÁO CÁO] Doanh thu ngày \${data.date}\`,
      html,
    });
  } catch (error) {
    console.error("Lỗi khi gửi báo cáo doanh thu:", error);
  }
}
