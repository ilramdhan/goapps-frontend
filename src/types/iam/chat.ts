export interface RawReadReceipt {
  userId?: string
  user_id?: string
  readAt?: string
  read_at?: string
}

export interface RawParticipant {
  userId?: string
  user_id?: string
  username?: string
  fullName?: string
  full_name?: string
  avatarUrl?: string
  avatar_url?: string
  role?: string
  isOnline?: boolean
  is_online?: boolean
  joinedAt?: string
  joined_at?: string
}

export interface RawMessage {
  messageId?: string
  message_id?: string
  conversationId?: string
  conversation_id?: string
  senderUserId?: string
  sender_user_id?: string
  senderName?: string
  sender_name?: string
  body?: string
  isEdited?: boolean
  is_edited?: boolean
  isDeleted?: boolean
  is_deleted?: boolean
  replyToId?: string
  reply_to_id?: string
  readReceipts?: RawReadReceipt[]
  read_receipts?: RawReadReceipt[]
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

export interface RawConversation {
  conversationId?: string
  conversation_id?: string
  type?: string
  name?: string
  avatarUrl?: string
  avatar_url?: string
  participants?: RawParticipant[]
  lastMessage?: RawMessage
  last_message?: RawMessage
  unreadCount?: number
  unread_count?: number
  createdAt?: string
  created_at?: string
  updatedAt?: string
  updated_at?: string
}

export type ConversationType = "DIRECT" | "GROUP"
export type ParticipantRole = "OWNER" | "ADMIN" | "MEMBER"

export interface ReadReceipt {
  userId: string
  readAt: string
}

export interface Participant {
  userId: string
  username: string
  fullName: string
  avatarUrl: string
  role: ParticipantRole
  isOnline: boolean
  joinedAt: string
}

export interface ChatMessage {
  messageId: string
  conversationId: string
  senderUserId: string
  senderName: string
  body: string
  isEdited: boolean
  isDeleted: boolean
  replyToId: string
  readReceipts: ReadReceipt[]
  createdAt: string
  updatedAt: string
}

export interface Conversation {
  conversationId: string
  type: ConversationType
  name: string
  avatarUrl: string
  participants: Participant[]
  lastMessage: ChatMessage | null
  unreadCount: number
  createdAt: string
  updatedAt: string
}

export interface EditHistoryEntry {
  historyId: number
  body: string
  editedBy: string
  editedAt: string
}

export type ChatEventType =
  | "message_received"
  | "message_edited"
  | "message_deleted"
  | "typing"
  | "read_receipt"
  | "presence"

export interface ChatSSEEvent {
  type: ChatEventType
  conversationId?: string
  messageId?: string
  message?: ChatMessage
  userId?: string
  userName?: string
  isTyping?: boolean
  readAt?: string
  isOnline?: boolean
  body?: string
  isEdited?: boolean
  isDeleted?: boolean
  createdAt?: string
  updatedAt?: string
  senderUserId?: string
  senderName?: string
  replyToId?: string
  readReceipts?: ReadReceipt[]
}

export function normalizeReadReceipt(raw: RawReadReceipt): ReadReceipt {
  return {
    userId: raw.userId ?? raw.user_id ?? "",
    readAt: raw.readAt ?? raw.read_at ?? "",
  }
}

export function normalizeParticipant(raw: RawParticipant): Participant {
  return {
    userId: raw.userId ?? raw.user_id ?? "",
    username: raw.username ?? "",
    fullName: raw.fullName ?? raw.full_name ?? "",
    avatarUrl: raw.avatarUrl ?? raw.avatar_url ?? "",
    role: (raw.role as ParticipantRole) ?? "MEMBER",
    isOnline: raw.isOnline ?? raw.is_online ?? false,
    joinedAt: raw.joinedAt ?? raw.joined_at ?? "",
  }
}

export function normalizeMessage(raw: RawMessage): ChatMessage {
  const receipts = (raw.readReceipts ?? raw.read_receipts ?? []).map(normalizeReadReceipt)
  return {
    messageId: raw.messageId ?? raw.message_id ?? "",
    conversationId: raw.conversationId ?? raw.conversation_id ?? "",
    senderUserId: raw.senderUserId ?? raw.sender_user_id ?? "",
    senderName: raw.senderName ?? raw.sender_name ?? "",
    body: raw.body ?? "",
    isEdited: raw.isEdited ?? raw.is_edited ?? false,
    isDeleted: raw.isDeleted ?? raw.is_deleted ?? false,
    replyToId: raw.replyToId ?? raw.reply_to_id ?? "",
    readReceipts: receipts,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? "",
  }
}

export function normalizeConversation(raw: RawConversation): Conversation {
  const rawMsg = raw.lastMessage ?? raw.last_message
  return {
    conversationId: raw.conversationId ?? raw.conversation_id ?? "",
    type: (raw.type as ConversationType) ?? "DIRECT",
    name: raw.name ?? "",
    avatarUrl: raw.avatarUrl ?? raw.avatar_url ?? "",
    participants: (raw.participants ?? []).map(normalizeParticipant),
    lastMessage: rawMsg ? normalizeMessage(rawMsg) : null,
    unreadCount: raw.unreadCount ?? raw.unread_count ?? 0,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    updatedAt: raw.updatedAt ?? raw.updated_at ?? "",
  }
}

export function getConversationDisplayName(conv: Conversation, currentUserId: string): string {
  if (conv.type === "GROUP") return conv.name || "Group Chat"
  const other = conv.participants.find((p) => p.userId !== currentUserId)
  return other?.fullName || other?.username || "Unknown User"
}

export function getConversationAvatar(conv: Conversation, currentUserId: string): string {
  if (conv.type === "GROUP") return conv.avatarUrl || ""
  const other = conv.participants.find((p) => p.userId !== currentUserId)
  return other?.avatarUrl || ""
}
