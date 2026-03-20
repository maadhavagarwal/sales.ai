"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Send, Search, Archive, Trash2, Bell, Pin, AtSign, FileText, Loader } from "lucide-react"
import DashboardLayout from "@/components/layout/DashboardLayout"
import { Card, Badge } from "@/components/ui"
import {
  deleteConversation,
  getConversationMessages,
  getConversations,
  getUnreadMessageCount,
  pinConversation,
  sendMessage,
} from "@/services/api"

interface Message {
  id: string
  sender: string
  senderEmail: string
  content: string
  timestamp: string
  read: boolean
  attachments?: string[]
}

interface Conversation {
  id: string
  participants: string[]
  lastMessage: string
  lastTimestamp: string
  unreadCount: number
  pinned: boolean
}

export default function MessagingModule() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])

  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [messageInput, setMessageInput] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [notifications, setNotifications] = useState(3)
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const normalizeConversation = (conv: any): Conversation => ({
    id: String(conv.id),
    participants: Array.isArray(conv.participants) ? conv.participants : [],
    lastMessage: conv.last_message || conv.lastMessage || "",
    lastTimestamp: conv.last_timestamp || conv.lastTimestamp || new Date().toISOString(),
    unreadCount: Number(conv.unread_count || conv.unreadCount || 0),
    pinned: Boolean(conv.pinned),
  })

  const normalizeMessage = (msg: any): Message => ({
    id: String(msg.id),
    sender: msg.sender || "Unknown",
    senderEmail: msg.sender_email || msg.senderEmail || "",
    content: msg.content || "",
    timestamp: msg.timestamp || new Date().toISOString(),
    read: Boolean(msg.read ?? true),
    attachments: msg.attachments || [],
  })

  const loadConversations = useCallback(async () => {
    const data = await getConversations()
    const items = (Array.isArray(data) ? data : []).map(normalizeConversation)
    setConversations(items)
    if (!selectedConversation && items.length > 0) {
      setSelectedConversation(items[0].id)
    }
  }, [selectedConversation])

  const loadMessages = useCallback(async (conversationId: string) => {
    const data = await getConversationMessages(conversationId)
    setMessages((Array.isArray(data) ? data : []).map(normalizeMessage))
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const bootstrap = async () => {
      try {
        await loadConversations()
        const unread = await getUnreadMessageCount()
        setNotifications(Number(unread?.unread_count || 0))
      } catch (error) {
        console.error("Messaging bootstrap failed:", error)
        setConversations([])
        setMessages([])
        setNotifications(0)
      }
    }
    bootstrap()
  }, [loadConversations])

  useEffect(() => {
    if (!selectedConversation) return
    loadMessages(selectedConversation).catch((error) => {
      console.error("Loading messages failed:", error)
      setMessages([])
    })
  }, [selectedConversation, loadMessages])

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (!token) return
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").trim()
    if (!/^https?:\/\//i.test(apiBase)) return
    const wsBase = apiBase.replace(/^http/i, "ws").replace(/\/$/, "")
    const ws = new WebSocket(`${wsBase}/api/messaging/ws?token=${encodeURIComponent(token)}`)

    ws.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload?.event === "message:new") {
          await loadConversations()
          const activeConversation = selectedConversation
          if (activeConversation && payload.conversation_id === activeConversation) {
            await loadMessages(activeConversation)
          }
        }
      } catch {
        // Ignore malformed websocket events.
      }
    }

    ws.onerror = () => {
      // Keep UI functional even if websocket transport is unavailable.
    }

    return () => ws.close()
  }, [selectedConversation, loadConversations, loadMessages])

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return

    setIsLoading(true)
    try {
      await sendMessage(selectedConversation, messageInput)
      setMessageInput("")
      await loadMessages(selectedConversation)
      await loadConversations()
    } finally {
      setIsLoading(false)
    }
  }

  const handleArchive = async (convId: string) => {
    await deleteConversation(convId)
    await loadConversations()
    if (selectedConversation === convId) {
      setSelectedConversation(null)
      setMessages([])
    }
  }

  const handlePin = async (convId: string) => {
    await pinConversation(convId)
    await loadConversations()
  }

  const filteredConversations = conversations.filter((conv) =>
    conv.participants.some((p) =>
      p.toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const pinnedConvs = filteredConversations.filter((c) => c.pinned)
  const unpinnedConvs = filteredConversations.filter((c) => !c.pinned)

  return (
    <DashboardLayout
      title="Messaging Center"
      subtitle="Unified inbox, chat, and notifications"
      actions={
        <div className="flex items-center gap-3">
          <div className="relative">
            <Bell className="w-5 h-5 text-[--primary]" />
            {notifications > 0 && (
              <Badge
                variant="pro"
                size="xs"
                className="absolute -top-2 -right-2 bg-red-500 text-white"
              >
                {notifications}
              </Badge>
            )}
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* Inbox */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <Card variant="glass" padding="md">
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-[--text-muted]" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-black/40 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[--primary]"
              />
            </div>
          </Card>

          <div className="flex-1 overflow-y-auto space-y-2">
            {/* Pinned Conversations */}
            {pinnedConvs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-[--text-muted] uppercase tracking-widest px-2">
                  Pinned
                </p>
                {pinnedConvs.map((conv) => (
                  <motion.div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedConversation === conv.id
                        ? "bg-[--primary]/20 border-[--primary]"
                        : "bg-black/40 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{conv.participants.join(", ")}</p>
                        <p className="text-xs text-[--text-muted] line-clamp-1">
                          {conv.lastMessage}
                        </p>
                        <p className="text-[10px] text-[--text-muted] mt-1">
                          {new Date(conv.lastTimestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {conv.unreadCount > 0 && (
                          <Badge variant="pro" size="xs">
                            {conv.unreadCount}
                          </Badge>
                        )}
                        <Pin className="w-3 h-3 text-[--primary]" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Unpinned Conversations */}
            {unpinnedConvs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-bold text-[--text-muted] uppercase tracking-widest px-2">
                  All Messages
                </p>
                {unpinnedConvs.map((conv) => (
                  <motion.div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv.id)}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      selectedConversation === conv.id
                        ? "bg-[--primary]/20 border-[--primary]"
                        : "bg-black/40 border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="font-semibold text-sm">{conv.participants.join(", ")}</p>
                        <p className="text-xs text-[--text-muted] line-clamp-1">
                          {conv.lastMessage}
                        </p>
                        <p className="text-[10px] text-[--text-muted] mt-1">
                          {new Date(conv.lastTimestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      {conv.unreadCount > 0 && (
                        <Badge variant="pro" size="xs">
                          {conv.unreadCount}
                        </Badge>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}

            {filteredConversations.length === 0 && (
              <div className="text-center py-8">
                <p className="text-[--text-muted] text-sm">No conversations found</p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        {selectedConversation ? (
          <div className="lg:col-span-2 flex flex-col bg-black/40 border border-white/10 rounded-lg">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="font-bold">
                  {conversations.find((c) => c.id === selectedConversation)?.participants.join(", ")}
                </h3>
                <p className="text-xs text-[--text-muted]">
                  {conversations.find((c) => c.id === selectedConversation)?.participants.length} participants
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    handlePin(selectedConversation)
                  }
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <Pin className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleArchive(selectedConversation)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-all"
                >
                  <Archive className="w-4 h-4" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.sender === "You" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.sender === "You"
                          ? "bg-[--primary]/30 border border-[--primary]"
                          : "bg-white/10 border border-white/10"
                      }`}
                    >
                      {msg.sender !== "You" && (
                        <p className="text-xs font-bold text-[--primary] mb-1">{msg.sender}</p>
                      )}
                      <p className="text-sm">{msg.content}</p>
                      <p className="text-[10px] text-[--text-muted] mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-white/10 flex gap-2">
              <input
                type="text"
                placeholder="Type a message..."
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                className="flex-1 px-4 py-2 bg-black/60 border border-white/10 rounded-lg text-sm focus:outline-none focus:border-[--primary]"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || isLoading}
                className="p-2 bg-[--primary] hover:bg-[--primary]/80 rounded-lg disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
              <button className="p-2 hover:bg-white/10 rounded-lg transition-all">
                <FileText className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 flex items-center justify-center bg-black/40 border border-white/10 rounded-lg">
            <div className="text-center">
              <AtSign className="w-12 h-12 text-[--text-muted] mx-auto mb-4" />
              <p className="text-[--text-muted]">Select a conversation to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
