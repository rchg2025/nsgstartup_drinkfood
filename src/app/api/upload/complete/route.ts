import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { google } from "googleapis";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { fileId } = await req.json();
    if (!fileId) {
      return NextResponse.json({ error: "Missing fileId" }, { status: 400 });
    }

    const settings = await prisma.setting.findMany({
      where: {
        key: { in: ["gdrive_client_email", "gdrive_private_key"] },
      },
    });

    const config: Record<string, string> = {};
    settings.forEach((s) => (config[s.key] = s.value));

    if (!config.gdrive_client_email || !config.gdrive_private_key) {
      return NextResponse.json({ error: "Google Drive is not configured" }, { status: 400 });
    }

    let privateKey = config.gdrive_private_key;
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    const authClient = new google.auth.JWT({
      email: config.gdrive_client_email,
      key: privateKey,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth: authClient });

    // Make the file publicly accessible
    await drive.permissions.create({
      fileId: fileId,
      supportsAllDrives: true,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    // We can return a thumbnail or uc?export=view URL
    const url = `https://drive.google.com/uc?export=view&id=${fileId}`;
    return NextResponse.json({ url });
  } catch (error) {
    console.error("UPLOAD COMPLETE ERROR:", error);
    return NextResponse.json({ error: "Failed to complete upload" }, { status: 500 });
  }
}
