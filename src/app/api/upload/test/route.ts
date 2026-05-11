import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || (session.user as any).role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { clientEmail, privateKey, folderId } = await req.json();

    if (!clientEmail || !privateKey || !folderId) {
      return NextResponse.json({ error: "Thiếu thông tin kết nối" }, { status: 400 });
    }

    let pKey = privateKey;
    if (pKey.includes("\\n")) {
      pKey = pKey.replace(/\\n/g, "\n");
    }

    const authClient = new google.auth.JWT({
      email: clientEmail,
      key: pKey,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });

    const drive = google.drive({ version: "v3", auth: authClient });

    // Try to get folder metadata
    const response = await drive.files.get({
      fileId: folderId,
      fields: "id, name, mimeType",
      supportsAllDrives: true,
    });

    if (response.data) {
      return NextResponse.json({ success: true, folder: response.data });
    } else {
      throw new Error("Không lấy được thông tin thư mục");
    }
  } catch (error: any) {
    console.error("DRIVE TEST ERROR:", error);
    return NextResponse.json({ error: error.message || "Lỗi kết nối Google Drive" }, { status: 500 });
  }
}
