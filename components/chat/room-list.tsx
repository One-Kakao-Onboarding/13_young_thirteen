"use client"

import { Button } from "@/components/ui/button"
import { Plus, MessageSquare, LogOut } from "lucide-react"
import Image from "next/image"

interface Room {
  id: string
  name: string
  lastMessage?: string
  memberCount: number
  updatedAt: string
}

interface RoomListProps {
  rooms: Room[]
  onRoomSelect: (roomId: string) => void
  onCreateRoom: () => void
  onLogout: () => void
  userNickname?: string
}

export function RoomList({ rooms, onRoomSelect, onCreateRoom, onLogout, userNickname }: RoomListProps) {
  return (
    <div className="h-full flex flex-col bg-white">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-3 bg-kakao-yellow">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-kakao-dark">채팅</h1>
          {userNickname && <span className="text-sm text-kakao-dark/70">({userNickname})</span>}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="text-kakao-dark" onClick={onLogout} title="로그아웃">
            <LogOut className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-kakao-dark" onClick={onCreateRoom}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* 채팅방 목록 */}
      <div className="flex-1 overflow-y-auto">
        {rooms.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8">
            <MessageSquare className="w-12 h-12 mb-4 text-gray-300" />
            <p className="text-center">채팅방이 없습니다.</p>
            <p className="text-sm text-center mt-1">새 채팅방을 만들어보세요!</p>
          </div>
        ) : (
          rooms.map((room) => (
            <button
              key={room.id}
              onClick={() => onRoomSelect(room.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              {/* 채팅방 아이콘 */}
              <div className="w-12 h-12 rounded-full bg-kakao-yellow flex items-center justify-center overflow-hidden">
                <Image
                  src="/cute-yellow-cat-chunsik-kakao-character.jpg"
                  alt="춘식"
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>

              {/* 채팅방 정보 */}
              <div className="flex-1 min-w-0 text-left">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-kakao-dark truncate">{room.name}</span>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                    {new Date(room.updatedAt).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-sm text-gray-500 truncate">{room.lastMessage || "새 채팅방"}</p>
                  <span className="text-xs text-gray-400 ml-2 flex-shrink-0">{room.memberCount}명</span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
