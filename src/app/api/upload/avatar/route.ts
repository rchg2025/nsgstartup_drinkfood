import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { PassThrough } from "stream";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // 2. Lấy cấu hình từ DB
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["gdrive_client_email", "gdrive_private_key", "gdrive_folder_id"] } }
    });

    const getSetting = (k: string) => settings.find(s => s.key === k)?.value;
    const clientEmail = getSetting("gdrive_client_email");
    let privateKey = getSetting("gdrive_private_key");
    const folderId = getSetting("gdrive_folder_id");

    if (!clientEmail || !privateKey || !folderId) {
      return NextResponse.json({ error: "Google Drive chưa được cấu hình. Vui lòng liên hệ Admin." }, { status: 500 });
    }

    // Fix escaped newlines in private key
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    // 3. Khởi tạo Google Auth
    const authClient = new google.auth.JWT({
      email: clientEmail,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth: authClient });

    // 4. Upload file
    const fileMetadata = {
      name: `${session.user.id}_${Date.now()}_${file.name}`,
      parents: [folderId],
    };

    const bufferStream = new PassThrough();
    bufferStream.end(buffer);

    const media = {
      mimeType: file.type || "application/octet-stream",
      body: bufferStream,
    };

    const uploadRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: "id",
      supportsAllDrives: true,
    });

    const fileId = uploadRes.data.id;
    if (!fileId) {
      throw new Error("Không lấy được ID của file sau khi upload");
    }

    // 5. Phân quyền cho file thành public để ai cũng xem được (avatar mà)
    await drive.permissions.create({
      fileId: fileId,
      supportsAllDrives: true,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // 6. Tạo public URL
    const publicUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return NextResponse.json({ url: publicUrl });

  } catch (error: any) {
    console.error("Lỗi upload avatar:", error);
    return NextResponse.json({ error: "Lỗi khi upload ảnh lên Google Drive: " + error.message }, { status: 500 });
  }
}
