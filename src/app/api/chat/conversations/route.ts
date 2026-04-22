import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = (session.user as any).id;

  try {
    const conversations = await prisma.conversation.findMany({
      where: {
        participants: {
          some: {
            userId: currentUserId,
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: { 
                id: true, 
                name: true, 
                role: true, 
                avatar: true,
                lastActive: true
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1, // Get only the latest message
          include: {
            sender: {
              select: { name: true },
            },
          },
        },
        _count: {
          select: {
            messages: {
              where: {
                isRead: false,
                senderId: { not: currentUserId },
              },
            },
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    // Format for frontend
    const formatted = conversations.map(c => {
      let displayName = c.name;
      let isOnline = false;
      if (!c.isGroup) {
        const otherParticipant = c.participants.find(p => p.userId !== currentUserId);
        if (otherParticipant) {
          displayName = otherParticipant.user.name;
          const lastActiveTime = otherParticipant.user.lastActive 
            ? new Date(otherParticipant.user.lastActive).getTime() 
            : 0;
          // Online if active within the last 5 minutes (300000 ms)
          isOnline = (Date.now() - lastActiveTime) < 300000;
        } else {
          displayName = "Chat";
        }
      }
      return {
        ...c,
        displayName,
        isOnline,
        unreadCount: c._count.messages
      };
    });

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Failed to fetch conversations:", error);
    return NextResponse.json({ error: "Failed to fetch conversations" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = (session.user as any).id;

  try {
    const body = await req.json();
    const { participantIds, isGroup, name } = body;

    if (!participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ error: "Thành viên không hợp lệ" }, { status: 400 });
    }

    // Always include current user
    const finalParticipantIds = Array.from(new Set([...participantIds, currentUserId]));

    if (!isGroup) {
      if (finalParticipantIds.length !== 2) {
        return NextResponse.json({ error: "Chat cá nhân phải đúng 2 người" }, { status: 400 });
      }

      // Check if 1-1 conversation already exists
      const existingConv = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: finalParticipantIds.map(userId => ({
            participants: { some: { userId } },
          })),
        },
      });

      if (existingConv) {
        return NextResponse.json({ id: existingConv.id });
      }
    } else {
      if (finalParticipantIds.length < 2) {
        return NextResponse.json({ error: "Nhóm chat phải có từ 2 người trở lên" }, { status: 400 });
      }
    }

    const conversation = await prisma.conversation.create({
      data: {
        isGroup: !!isGroup,
        name: isGroup ? (name || "Nhóm mới") : null,
        participants: {
          create: finalParticipantIds.map(userId => ({ userId })),
        },
      },
    });

    return NextResponse.json(conversation);
  } catch (error) {
    console.error("Create conversation error:", error);
    return NextResponse.json({ error: "Không thể tạo hộp thoại" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const currentUserId = (session.user as any).id;
  const { searchParams } = new URL(req.url);
  const conversationId = searchParams.get("id");

  if (!conversationId) {
    return NextResponse.json({ error: "Missing conversation ID" }, { status: 400 });
  }

  try {
    await prisma.conversationParticipant.deleteMany({
      where: {
        conversationId,
        userId: currentUserId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Leave conversation error:", error);
    return NextResponse.json({ error: "Không thể rời đoạn chat" }, { status: 500 });
  }
}
