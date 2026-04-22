"use client";
import { useEffect, useState, useRef } from "react";
import { useSession } from "next-auth/react";

export default function ChatPage() {
  const { data: session } = useSession();
  const currentUserId = (session?.user as any)?.id;

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [messageInput, setMessageInput] = useState("");
  
  // New chat modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [userSearchText, setUserSearchText] = useState("");
  const [creating, setCreating] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showChatList, setShowChatList] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial load conversations
  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (res.ok) {
        setConversations(await res.json());
      }
    } catch (e) {}
  };

  useEffect(() => {
    fetchConversations();
    // Load user list for new chat
    fetch("/api/users/list")
      .then(r => r.json())
      .then(data => setAllUsers(data.filter((u: any) => u.id !== currentUserId)))
      .catch();
  }, [currentUserId]);

  // Handle opening a conversation
  const loadMessages = async (convId: string) => {
    try {
      const res = await fetch(`/api/chat/${convId}/messages`);
      if (res.ok) {
        setMessages(await res.json());
        
        // Mark as read locally in the conversation list
        setConversations(prev => prev.map(c => 
          c.id === convId ? { ...c, unreadCount: 0 } : c
        ));
      }
    } catch(e) {}
  };

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
    } else {
      setMessages([]);
    }
  }, [activeConvId]);

  // Set up SSE
  useEffect(() => {
    if (!currentUserId) return;
    
    const connectSSE = () => {
      // Find the latest message ID we know about across all conversations
      let lastId = "";
      // Wait, we just don't pass lastMessageId so it hooks into the newest
      const eventSource = new EventSource(`/api/chat/stream`, { withCredentials: true });
      
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "messages") {
            const newMsgs = payload.data;
            
            const hasNewOtherMsg = newMsgs.some((m: any) => m.senderId !== currentUserId);
            if (hasNewOtherMsg) {
               import("@/lib/audio").then(audio => audio.playTingTing());
            }

            // Add messages to active window if they belong there
            const msgsForActive = newMsgs.filter((m: any) => m.conversationId === activeConvId);
            if (msgsForActive.length > 0) {
              setMessages(prev => [...prev, ...msgsForActive]);
              // Also hit the GET endpoint silently in the background to mark them Read
              fetch(`/api/chat/${activeConvId}/messages`);
            }
            // Add unread count to conversations that are not active
            setConversations(prev => prev.map(c => {
              const msgsForC = newMsgs.filter((m: any) => m.conversationId === c.id);
              if (msgsForC.length > 0) {
                // Update latest message text
                const latest = msgsForC[msgsForC.length - 1];
                return {
                  ...c,
                  messages: [latest],
                  unreadCount: (activeConvId === c.id) ? 0 : (c.unreadCount + msgsForC.filter((m: any) => m.senderId !== currentUserId).length),
                  updatedAt: latest.createdAt
                };
              }
              return c;
            }).sort((a,b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
          }
        } catch (e) {}
      };

      eventSourceRef.current = eventSource;
    };

    connectSSE();

    return () => {
      eventSourceRef.current?.close();
    };
  }, [currentUserId, activeConvId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !activeConvId) return;
    
    const content = messageInput.trim();
    setMessageInput(""); 
    
    try {
      await fetch(`/api/chat/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content })
      });
      // Real placement is handled entirely by SSE endpoint polling
    } catch {}
  };

  const createConversation = async () => {
    if (selectedUsers.length === 0) return;
    setCreating(true);
    try {
      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          participantIds: selectedUsers,
          isGroup: isGroup,
          name: groupName
        })
      });
      if (res.ok) {
        const data = await res.json();
        await fetchConversations();
        setActiveConvId(data.id);
        setShowNewModal(false);
        setSelectedUsers([]);
        setGroupName("");
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch {}
    setCreating(false);
  };

  // Dedup messages for UI
  const uniqueMessages = Array.from(new Map(messages.map(m => [m.id, m])).values());

  const activeConv = Object.values(conversations).find(c => c.id === activeConvId);

  return (
    <div style={{ 
      display: "flex", 
      ...(isMobile ? {
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 74, // Tab menu is 64px + 10px spacing
        zIndex: 50,
        backgroundColor: "#fff"
      } : {
        height: "calc(100vh - 60px)",
        margin: "-24px"
      })
    }}>
      {/* Sidebar ListView */}
      {(showChatList || !isMobile) && (
        <div style={{ width: isMobile ? "100%" : 320, background: "#fff", borderRight: "1px solid #e2e8f0", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 20, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>💬 Tin nhắn</h2>
          <button className="btn" style={{ padding: "8px 12px", background: "var(--purple)", color: "white", borderRadius: 8, fontWeight: 700 }} onClick={() => setShowNewModal(true)}>
            + Mới
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {conversations.map(c => (
             <div 
               key={c.id} 
               onClick={() => {
                 setActiveConvId(c.id);
                 if (isMobile) setShowChatList(false);
               }}
               style={{ 
                 padding: "16px 20px", 
                 borderBottom: "1px solid #f1f5f9", 
                 cursor: "pointer",
                 background: activeConvId === c.id ? "#f8fafc" : "transparent",
                 display: "flex",
                 alignItems: "center",
                 gap: 12
               }}
             >
               <div style={{ width: 44, height: 44, borderRadius: "50%", background: c.isGroup ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 700, flexShrink: 0 }}>
                  {c.isGroup ? "👥" : c.displayName?.charAt(0).toUpperCase()}
               </div>
               <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: 15, display: "flex", alignItems: "center", gap: 6 }}>
                      {c.displayName || (c.isGroup ? "Nhóm chat" : "Trò chuyện")}
                      {!c.isGroup && c.isOnline && (
                         <span style={{width: 8, height: 8, borderRadius: "50%", background: "var(--green)", flexShrink: 0}} title="Trực tuyến" />
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      {c.unreadCount > 0 && (
                        <span style={{ background: "var(--red)", color: "white", borderRadius: 12, padding: "2px 6px", fontSize: 11, fontWeight: 800 }}>
                          {c.unreadCount}
                        </span>
                      )}
                      <button 
                        onClick={async (e) => {
                           e.stopPropagation();
                           if (!confirm("Bạn có muốn ẩn/rời khỏi đoạn chat này không? Bạn có thể mở lại nó bất cứ lúc nào bằng cách tạo mới chat.")) return;
                           await fetch(`/api/chat/conversations?id=${c.id}`, { method: "DELETE" });
                           setConversations(prev => prev.filter(x => x.id !== c.id));
                           if (activeConvId === c.id) setActiveConvId(null);
                        }}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: "50%", background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 16 }}
                        title="Ẩn / Rời khỏi đoạn chat"
                      >✕</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 4 }}>
                    {c.messages?.[0]?.senderId === currentUserId ? "Bạn: " : (c.messages?.[0]?.sender?.name ? c.messages[0].sender.name + ": " : "")} 
                    {c.messages?.[0]?.content || "Chưa có tin nhắn"}
                  </div>
               </div>
             </div>
          ))}
          {conversations.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
              Chưa có đoạn chat nào.
            </div>
          )}
        </div>
      </div>
      )}

      {/* Main Chat Area */}
      {(!showChatList || !isMobile) && activeConvId ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc" }}>
          {/* Header */}
          <div style={{ padding: "20px 24px", background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 12 }}>
             {isMobile && !showChatList && (
               <button onClick={() => setShowChatList(true)} style={{ background: "transparent", border: "none", fontSize: 24, cursor: "pointer", marginRight: 8 }}>
                 ←
               </button>
             )}
             <div style={{ width: 40, height: 40, borderRadius: "50%", background: activeConv?.isGroup ? "linear-gradient(135deg, #10b981, #059669)" : "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700 }}>
                {activeConv?.isGroup ? "👥" : activeConv?.displayName?.charAt(0).toUpperCase()}
             </div>
             <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>{activeConv?.displayName || (activeConv?.isGroup ? "Nhóm chat" : "Trò chuyện")}</h3>
                <div style={{ fontSize: 12, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}>
                   {activeConv?.isGroup ? (
                     `${activeConv.participants.length} thành viên`
                   ) : activeConv?.isOnline ? (
                     <><span style={{width: 8, height: 8, borderRadius: "50%", background: "var(--green)", display: "inline-block"}}></span> Trực tuyến</>
                   ) : (
                     <><span style={{width: 8, height: 8, borderRadius: "50%", background: "var(--red)", display: "inline-block"}}></span> Ngoại tuyến</>
                   )}
                </div>
             </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            {uniqueMessages.map(m => {
              const myMsg = m.senderId === currentUserId || (m.id.startsWith("opt-"));
              return (
                <div key={m.id} style={{ display: "flex", flexDirection: "column", alignItems: myMsg ? "flex-end" : "flex-start" }}>
                  {!myMsg && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2, marginLeft: 8 }}>{m.sender?.name}</div>
                  )}
                  <div style={{
                    background: myMsg ? "var(--purple)" : "#fff",
                    color: myMsg ? "white" : "#1e293b",
                    padding: "10px 16px",
                    borderRadius: myMsg ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    maxWidth: "75%",
                    lineHeight: 1.5,
                    wordBreak: "break-word"
                  }}>
                    {m.content}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: "16px 24px", background: "#fff", borderTop: "1px solid #e2e8f0" }}>
            <form onSubmit={handleSendMessage} style={{ display: "flex", gap: 12 }}>
              <input 
                type="text"
                placeholder="Nhập tin nhắn..."
                value={messageInput}
                onChange={e => setMessageInput(e.target.value)}
                style={{ flex: 1, border: "1px solid #e2e8f0", borderRadius: 24, padding: "10px 20px", outline: "none", fontSize: 16 }}
              />
              <button type="submit" disabled={!messageInput.trim()} style={{ background: "var(--purple)", color: "white", border: "none", borderRadius: "50%", width: 42, height: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: messageInput.trim() ? "pointer" : "not-allowed", opacity: messageInput.trim() ? 1 : 0.5 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
              </button>
            </form>
          </div>
        </div>
      ) : (!showChatList || !isMobile) ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", flexDirection: "column", color: "var(--text-muted)" }}>
           <div style={{ fontSize: 64, marginBottom: 16 }}>💬</div>
           <h3 style={{ fontSize: 20 }}>Chào mừng bạn đến với mục Trò chuyện</h3>
           <p>Chọn một cuộc trò chuyện để bắt đầu.</p>
        </div>
      ) : null}

      {/* New Conversation Modal */}
      {showNewModal && (
        <div className="modal-overlay" onClick={() => !creating && setShowNewModal(false)}>
          <div className="modal" style={{ width: 400 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Tạo hội thoại mới</h2>
              <button className="modal-close" onClick={() => !creating && setShowNewModal(false)}>✕</button>
            </div>
            
            <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="radio" checked={!isGroup} onChange={() => setIsGroup(false)} /> Cá nhân
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                <input type="radio" checked={isGroup} onChange={() => setIsGroup(true)} /> Giới hạn nhóm
              </label>
            </div>

            {isGroup && (
              <div style={{ marginBottom: 16 }}>
                <label className="form-label">Tên nhóm</label>
                <input type="text" className="form-input" value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Nhập tên nhóm..." />
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <input type="text" className="form-input" value={userSearchText} onChange={e => setUserSearchText(e.target.value)} placeholder="🔍 Tìm kiếm thành viên..." />
            </div>

            <div style={{ marginBottom: 24, maxHeight: 250, overflowY: "auto", border: "1px solid #e2e8f0", borderRadius: 8, padding: 8 }}>
              {allUsers.filter(u => u.name.toLowerCase().includes(userSearchText.toLowerCase())).map(u => (
                <label key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px", cursor: "pointer", borderRadius: 4, background: selectedUsers.includes(u.id) ? "rgba(82, 34, 208, 0.05)" : "transparent" }}>
                   <input type="checkbox" checked={selectedUsers.includes(u.id)} onChange={(e) => {
                     if (e.target.checked) {
                       if (!isGroup) setSelectedUsers([u.id]);
                       else setSelectedUsers([...selectedUsers, u.id]);
                     } else {
                       setSelectedUsers(selectedUsers.filter(id => id !== u.id));
                     }
                   }} />
                   <div style={{ fontWeight: 600 }}>{u.name}</div>
                   <div style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{u.role}</div>
                </label>
              ))}
            </div>

            <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={creating || selectedUsers.length === 0} onClick={createConversation}>
              {creating ? "Đang tạo..." : "Khởi tạo Chat"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
