"use client"

import { Button } from "@/components/ui/button"
import { Menu, Search, MoreVertical } from "lucide-react"

interface ChatHeaderProps {
  roomName: string
  memberCount: number
  onMenuClick?: () => void
}

export function ChatHeader({ roomName, memberCount, onMenuClick }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-kakao-chat-bg border-b border-kakao-chat-bg/80">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-kakao-dark" onClick={onMenuClick}>
          <Menu className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="font-semibold text-kakao-dark">{roomName}</h1>
          <span className="text-xs text-kakao-dark/70">{memberCount}명 참여중</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="text-kakao-dark">
          <Search className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-kakao-dark">
          <MoreVertical className="w-5 h-5" />
        </Button>
      </div>
    </div>
  )
}
