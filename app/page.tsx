"use client"
import { useState, useEffect, useRef, useCallback } from "react"
import { getSupabase } from "@/lib/supabase"
import { OnboardingModal } from "@/components/chat/onboarding-modal"
import { RoomList } from "@/components/chat/room-list"
import { CreateRoomModal } from "@/components/chat/create-room-modal"
import { JoinRoomModal } from "@/components/chat/join-room-modal"
import { ChatBubble } from "@/components/chat/chat-bubble"
import { ChatInput } from "@/components/chat/chat-input"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Copy, UserPlus, Check } from "lucide-react"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface User {
  id: string
  nickname: string
  location: string
}

interface Room {
  id: string
  name: string
  lastMessage?: string
  memberCount: number
  updatedAt: string
}

interface Message {
  id: number
  room_id: string
  sender_id: string
  sender_name: string
  content: string
  message_type: string
  metadata: Record<string, unknown> | null
  created_at: string
}

function generateUUID(): string {
  return crypto.randomUUID()
}

function getStoredUser(): User | null {
  if (typeof window === "undefined") return null
  const stored = localStorage.getItem("chunsik_user")
  return stored ? JSON.parse(stored) : null
}

function storeUser(user: User): void {
  if (typeof window === "undefined") return
  localStorage.setItem("chunsik_user", JSON.stringify(user))
}

export default function ChunSikChat() {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [rooms, setRooms] = useState<Room[]>([])
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isSending, setIsSending] = useState(false)

  const channelRef = useRef<RealtimeChannel | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // 스크롤 하단 이동
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // 초기 로딩: 사용자 정보 확인
  useEffect(() => {
    const storedUser = getStoredUser()
    if (storedUser) {
      setUser(storedUser)
    }
    setIsLoading(false)
  }, [])

  // 사용자가 있으면 채팅방 목록 로드
  useEffect(() => {
    if (user) {
      loadRooms()
    }
  }, [user])

  // 채팅방 목록 로드
  const loadRooms = async () => {
    if (!user) return
    const supabase = getSupabase()

    const { data: memberData } = await supabase.from("chat_room_members").select("room_id").eq("user_id", user.id)

    if (memberData && memberData.length > 0) {
      const roomIds = memberData.map((m) => m.room_id)
      const { data: roomsData } = await supabase
        .from("chat_rooms")
        .select("*")
        .in("id", roomIds)
        .order("created_at", { ascending: false })

      if (roomsData) {
        // 각 채팅방의 멤버 수와 마지막 메시지 가져오기
        const roomsWithDetails = await Promise.all(
          roomsData.map(async (room) => {
            const { count } = await supabase
              .from("chat_room_members")
              .select("*", { count: "exact", head: true })
              .eq("room_id", room.id)

            const { data: lastMsg } = await supabase
              .from("chat_messages")
              .select("content")
              .eq("room_id", room.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single()

            return {
              id: room.id,
              name: room.name,
              lastMessage: lastMsg?.content,
              memberCount: (count || 0) + 1, // +1 for chunsik
              updatedAt: room.created_at,
            }
          }),
        )
        setRooms(roomsWithDetails)
      }
    }
  }

  // 온보딩 완료
  const handleOnboardingComplete = async (nickname: string, location: string) => {
    const supabase = getSupabase()
    const userId = generateUUID()

    // 사용자 정보 저장
    const { error } = await supabase.from("users").insert({
      id: userId,
      nickname,
      location,
    })

    if (error) {
      console.error("Failed to create user:", error)
      return
    }

    const newUser = { id: userId, nickname, location }
    storeUser(newUser)
    setUser(newUser)
  }

  // 채팅방 생성
  const handleCreateRoom = async (name: string) => {
    if (!user) return
    const supabase = getSupabase()
    const roomId = generateUUID()

    // 채팅방 생성
    const { error: roomError } = await supabase.from("chat_rooms").insert({
      id: roomId,
      name,
    })

    if (roomError) {
      console.error("Failed to create room:", roomError)
      return
    }

    // 멤버로 추가
    const { error: memberError } = await supabase.from("chat_room_members").insert({
      room_id: roomId,
      user_id: user.id,
    })

    if (memberError) {
      console.error("Failed to add member:", memberError)
      return
    }

    // 춘식이 환영 메시지
    await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_id: "chunsik",
      sender_name: "춘식",
      content: `안녕하세요! 저는 모임 장소를 추천해주는 춘식이에요 🐱\n\n"춘식아"로 시작하는 말로 저를 불러주시면 맛집을 추천해드릴게요!\n\n예: "춘식아 맛집 추천해줘"`,
      message_type: "text",
    })

    setShowCreateModal(false)
    await loadRooms()
    enterRoom(roomId)
  }

  // 채팅방 참여
  const handleJoinRoom = async (roomCode: string) => {
    if (!user) return
    const supabase = getSupabase()

    // 채팅방 존재 확인
    const { data: room, error: roomError } = await supabase.from("chat_rooms").select("*").eq("id", roomCode).single()

    if (roomError || !room) {
      alert("존재하지 않는 채팅방입니다.")
      return
    }

    // 이미 멤버인지 확인
    const { data: existingMember } = await supabase
      .from("chat_room_members")
      .select("*")
      .eq("room_id", roomCode)
      .eq("user_id", user.id)
      .single()

    if (!existingMember) {
      // 멤버로 추가
      const { error: memberError } = await supabase.from("chat_room_members").insert({
        room_id: roomCode,
        user_id: user.id,
      })

      if (memberError) {
        console.error("Failed to join room:", memberError)
        return
      }

      // 입장 메시지
      await supabase.from("chat_messages").insert({
        room_id: roomCode,
        sender_id: "system",
        sender_name: "시스템",
        content: `${user.nickname}님이 입장하셨습니다.`,
        message_type: "system",
      })
    }

    setShowJoinModal(false)
    await loadRooms()
    enterRoom(roomCode)
  }

  // 채팅방 입장
  const enterRoom = async (roomId: string) => {
    if (!user) return
    const supabase = getSupabase()

    // 기존 구독 해제
    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    setCurrentRoomId(roomId)

    // 채팅방 정보 로드
    const { data: roomData } = await supabase.from("chat_rooms").select("*").eq("id", roomId).single()

    if (roomData) {
      const { count } = await supabase
        .from("chat_room_members")
        .select("*", { count: "exact", head: true })
        .eq("room_id", roomId)

      setCurrentRoom({
        id: roomData.id,
        name: roomData.name,
        memberCount: (count || 0) + 1,
        updatedAt: roomData.created_at,
      })
    }

    // 메시지 로드
    const { data: messagesData } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true })

    setMessages(messagesData || [])

    const setupSubscription = () => {
      const channel = supabase
        .channel(`room:${roomId}:${Date.now()}`) // 고유한 채널명으로 변경
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "chat_messages",
            filter: `room_id=eq.${roomId}`,
          },
          (payload) => {
            const newMsg = payload.new as Message
            setMessages((prev) => {
              // 중복 방지: ID 또는 내용+시간으로 체크
              const exists = prev.some(
                (m) =>
                  m.id === newMsg.id ||
                  (m.content === newMsg.content &&
                    m.sender_id === newMsg.sender_id &&
                    Math.abs(new Date(m.created_at).getTime() - new Date(newMsg.created_at).getTime()) < 2000),
              )
              if (exists) return prev
              return [...prev, newMsg]
            })
          },
        )
        .subscribe((status) => {
          console.log("[v0] Realtime subscription status:", status)
          if (status === "SUBSCRIBED") {
            console.log("[v0] Successfully subscribed to room:", roomId)
          } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.log("[v0] Subscription failed, retrying...")
            // 실패시 재시도
            setTimeout(() => {
              if (channelRef.current) {
                supabase.removeChannel(channelRef.current)
              }
              setupSubscription()
            }, 1000)
          }
        })

      channelRef.current = channel
    }

    setupSubscription()
  }

  // 채팅방 나가기
  const leaveRoom = async () => {
    const supabase = getSupabase()

    if (channelRef.current) {
      await supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    setCurrentRoomId(null)
    setCurrentRoom(null)
    setMessages([])
    await loadRooms()
  }

  // 메시지 전송
  const sendMessage = async (content: string) => {
    if (!user || !currentRoomId || isSending) return

    setIsSending(true)
    const supabase = getSupabase()

    const tempId = Date.now()
    const optimisticMessage: Message = {
      id: tempId,
      room_id: currentRoomId,
      sender_id: user.id,
      sender_name: user.nickname,
      content,
      message_type: "text",
      metadata: null,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, optimisticMessage])

    // 메시지 저장
    const { data, error } = await supabase
      .from("chat_messages")
      .insert({
        room_id: currentRoomId,
        sender_id: user.id,
        sender_name: user.nickname,
        content,
        message_type: "text",
      })
      .select()
      .single()

    if (error) {
      console.error("Failed to send message:", error)
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setIsSending(false)
      return
    }

    if (data) {
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...data } : m)))
    }

    // 춘식이 호출 감지 ("춘식아"로 시작)
    if (content.includes("춘식아")) {
      // AI 응답 요청
      try {
        const response = await fetch("/api/chat/chunsik", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            roomId: currentRoomId,
            userId: user.id,
            userLocation: user.location,
            message: content,
          }),
        })

        if (!response.ok) {
          console.error("Failed to get AI response")
        }
      } catch (err) {
        console.error("AI request error:", err)
      }
    }

    setIsSending(false)
  }

  // 채팅방 코드 복사
  const copyRoomCode = async () => {
    if (!currentRoomId) return
    await navigator.clipboard.writeText(currentRoomId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 로딩
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kakao-chat-bg">
        <p className="text-kakao-dark">로딩 중...</p>
      </div>
    )
  }

  // 온보딩
  if (!user) {
    return <OnboardingModal onComplete={handleOnboardingComplete} />
  }

  // 채팅방 내부
  if (currentRoomId && currentRoom) {
    return (
      <div className="h-screen flex flex-col bg-kakao-chat-bg">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-2 py-2 bg-kakao-chat-bg">
          <Button variant="ghost" size="icon" className="text-kakao-dark" onClick={leaveRoom}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 text-center">
            <h1 className="font-semibold text-kakao-dark">{currentRoom.name}</h1>
            <span className="text-xs text-kakao-dark/70">{currentRoom.memberCount}명</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="text-kakao-dark" onClick={copyRoomCode}>
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </Button>
            <Button variant="ghost" size="icon" className="text-kakao-dark" onClick={() => setShowJoinModal(true)}>
              <UserPlus className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* 메시지 목록 */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {messages.map((msg) => (
            <ChatBubble
              key={msg.id}
              content={msg.content}
              senderName={msg.sender_name}
              senderId={msg.sender_id}
              isMe={msg.sender_id === user.id}
              isChunSik={msg.sender_id === "chunsik"}
              timestamp={msg.created_at}
              messageType={msg.message_type}
              metadata={msg.metadata as ChatBubbleProps["metadata"]}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* 입력창 */}
        <ChatInput onSend={sendMessage} disabled={isSending} />

        {/* 참여 모달 */}
        {showJoinModal && <JoinRoomModal onClose={() => setShowJoinModal(false)} onJoin={handleJoinRoom} />}
      </div>
    )
  }

  // 채팅방 목록
  return (
    <div className="h-screen flex flex-col">
      <RoomList rooms={rooms} onRoomSelect={enterRoom} onCreateRoom={() => setShowCreateModal(true)} />

      {/* 하단 참여 버튼 */}
      <div className="p-4 bg-white border-t">
        <Button variant="outline" className="w-full bg-transparent" onClick={() => setShowJoinModal(true)}>
          초대 코드로 참여하기
        </Button>
      </div>

      {/* 모달들 */}
      {showCreateModal && <CreateRoomModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateRoom} />}
      {showJoinModal && <JoinRoomModal onClose={() => setShowJoinModal(false)} onJoin={handleJoinRoom} />}
    </div>
  )
}

interface ChatBubbleProps {
  metadata?: {
    places?: Array<{
      name: string
      address: string
      url: string
      category?: string
    }>
  }
}
