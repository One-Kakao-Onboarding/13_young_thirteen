"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { X } from "lucide-react"

interface JoinRoomModalProps {
  onClose: () => void
  onJoin: (roomCode: string) => void
}

export function JoinRoomModal({ onClose, onJoin }: JoinRoomModalProps) {
  const [roomCode, setRoomCode] = useState("")

  const handleJoin = () => {
    if (roomCode.trim()) {
      onJoin(roomCode.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold text-kakao-dark">채팅방 참여하기</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* 폼 */}
        <div className="p-4 space-y-4">
          <div>
            <Label htmlFor="roomCode" className="text-kakao-dark font-medium">
              채팅방 코드
            </Label>
            <Input
              id="roomCode"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              placeholder="채팅방 코드를 입력하세요"
              className="mt-2"
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
              취소
            </Button>
            <Button
              onClick={handleJoin}
              disabled={!roomCode.trim()}
              className="flex-1 bg-kakao-yellow hover:bg-kakao-yellow/90 text-kakao-dark font-medium"
            >
              참여하기
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
