"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

interface CreateRoomModalProps {
  onClose: () => void
  onCreate: (name: string) => void
}

export function CreateRoomModal({ onClose, onCreate }: CreateRoomModalProps) {
  const [roomName, setRoomName] = useState("")

  const handleCreate = () => {
    if (roomName.trim()) {
      onCreate(roomName.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-kakao-dark">새 채팅방 만들기</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 폼 */}
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="roomName" className="text-kakao-dark font-medium">
              채팅방 이름
            </Label>
            <Input
              id="roomName"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              placeholder="예: 신입크루동아리 모임"
              className="mt-2"
              autoFocus
            />
          </div>
          <p className="text-xs text-gray-500">채팅방 코드를 공유하면 친구들이 참여할 수 있어요</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              취소
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!roomName.trim()}
              className="flex-1 bg-kakao-yellow hover:bg-kakao-yellow/90 text-kakao-dark font-medium"
            >
              만들기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
