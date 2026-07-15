import { generateMetadata as genMeta } from "@/config/site"
import { ChatPageClient } from "./chat-page-client"

export const metadata = genMeta("Chat")

export default function ChatPage() {
  return <ChatPageClient />
}
