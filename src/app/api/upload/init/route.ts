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
    const { fileName, mimeType } = await req.json();
    if (!fileName || !mimeType) {
      return NextResponse.json({ error: "Missing fileName or mimeType" }, { status: 400 });
    }

    const settings = await prisma.setting.findMany({
      where: {
        key: { in: ["gdrive_client_email", "gdrive_private_key", "gdrive_folder_id"] },
      },
    });

    const config: Record<string, string> = {};
    settings.forEach((s) => (config[s.key] = s.value));

    if (!config.gdrive_client_email || !config.gdrive_private_key || !config.gdrive_folder_id) {
      return NextResponse.json({ error: "Google Drive is not configured" }, { status: 400 });
    }

    // Format private key (replace literal \n with actual newlines if needed)
    let privateKey = config.gdrive_private_key;
    if (privateKey.includes("\\n")) {
      privateKey = privateKey.replace(/\\n/g, "\n");
    }

    const authClient = new google.auth.JWT(
      config.gdrive_client_email,
      undefined,
      privateKey,
      ["https://www.googleapis.com/auth/drive.file"]
    );

    const token = await authClient.getAccessToken();

    if (!token.token) {
      throw new Error("Failed to get access token");
    }

    const metadata = {
      name: fileName,
      parents: [config.gdrive_folder_id],
    };

    const res = await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.token}`,
          "Content-Type": "application/json",
          "X-Upload-Content-Type": mimeType,
        },
        body: JSON.stringify(metadata),
      }
    );

    const locationUrl = res.headers.get("location");

    if (!locationUrl) {
      const errBody = await res.text();
      console.error("GDRIVE INIT ERROR:", errBody);
      throw new Error("Failed to get resumable upload URL");
    }

    return NextResponse.json({ uploadUrl: locationUrl });
  } catch (error) {
    console.error("UPLOAD INIT ERROR:", error);
    return NextResponse.json({ error: "Failed to initialize upload" }, { status: 500 });
  }
}
