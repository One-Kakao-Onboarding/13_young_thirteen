"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { Clock, Bus, Banknote, MapPin } from "lucide-react"

interface RouteStep {
  type: "walk" | "subway" | "bus"
  startName?: string
  endName?: string
  lineName?: string
  sectionTime: number
  stationCount?: number
}

interface MemberTravelInfo {
  nickname: string
  duration: number
  distance?: number
  transport: "transit"
  transferCount?: number
  walkTime?: number
  pathType?: "subway" | "bus" | "subway+bus"
  payment?: number
  steps?: RouteStep[]
  lat?: number
  lng?: number
}

interface PlaceInfo {
  name: string
  address: string
  category?: string
  description?: string
  tags?: string
  image_url?: string
  review_count?: number
  latitude?: number
  longitude?: number
  memberTravelInfo?: MemberTravelInfo[]
  price_range?: string
  convenience?: string
}

interface ChatBubbleProps {
  content: string
  senderName: string
  senderId: string
  isMe: boolean
  isChunSik: boolean
  timestamp: string
  messageType?: string
  metadata?: {
    places?: PlaceInfo[]
  }
  roomId?: string
}

export function ChatBubble({
  content,
  senderName,
  isMe,
  isChunSik,
  timestamp,
  messageType = "text",
  metadata,
  roomId,
}: ChatBubbleProps) {
  const router = useRouter()

  console.log("[v0] ChatBubble - messageType:", messageType, "senderName:", senderName, "content:", content)

  const formattedTime = new Date(timestamp).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  })

  const handlePlaceClick = (place: PlaceInfo, index: number) => {
    const memberTravelStr = place.memberTravelInfo ? encodeURIComponent(JSON.stringify(place.memberTravelInfo)) : ""

    const params = new URLSearchParams({
      name: place.name,
      address: place.address,
      ...(place.category && { category: place.category }),
      ...(place.description && { description: place.description }),
      ...(place.tags && { tags: place.tags }),
      ...(place.image_url && { image_url: place.image_url }),
      ...(place.review_count && { review_count: place.review_count.toString() }),
      ...(place.latitude && { lat: place.latitude.toString() }),
      ...(place.longitude && { lng: place.longitude.toString() }),
      ...(memberTravelStr && { memberTravel: memberTravelStr }),
      ...(roomId && { roomId }),
    })
    router.push(`/place/${index}?${params.toString()}`)
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}분`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins ? `${hours}시간 ${mins}분` : `${hours}시간`
  }

  const TransportIcon = () => <Bus className="w-3 h-3" />

  if (messageType === "system") {
    return (
      <div className="flex justify-center my-3">
        <div className="px-4 py-1.5 rounded-full bg-kakao-dark/10 text-kakao-dark/70 text-xs">{content}</div>
      </div>
    )
  }

  // 내 메시지 (오른쪽)
  if (isMe) {
    return (
      <div className="flex justify-end items-end gap-1 mb-2">
        <span className="text-xs text-kakao-dark/60">{formattedTime}</span>
        <div className="max-w-[70%] px-3 py-2 rounded-lg bg-kakao-my-bubble text-kakao-dark">
          <p className="text-sm break-words whitespace-pre-wrap">{content}</p>
        </div>
      </div>
    )
  }

  // 춘식 또는 다른 사용자 메시지 (왼쪽)
  return (
    <div className="flex items-start gap-2 mb-2">
      {/* 프로필 이미지 */}
      <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-kakao-yellow flex items-center justify-center">
        {isChunSik ? (
          <Image
            src="/cute-yellow-cat-chunsik-kakao-character.jpg"
            alt="춘식"
            width={40}
            height={40}
            className="object-cover"
          />
        ) : (
          <span className="text-lg font-bold text-kakao-dark">{senderName.charAt(0)}</span>
        )}
      </div>

      <div className="flex flex-col">
        {/* 발신자 이름 */}
        <span className="text-xs text-kakao-dark/80 mb-1">{senderName}</span>

        <div className="flex items-end gap-1">
          <div className="max-w-[280px] sm:max-w-[320px]">
            {/* 일반 텍스트 메시지 */}
            {messageType === "text" && (
              <div className="px-3 py-2 rounded-lg bg-kakao-other-bubble text-kakao-dark">
                <p className="text-sm break-words whitespace-pre-wrap">{content}</p>
              </div>
            )}

            {messageType === "place_recommendation" && metadata?.places && (
              <div className="space-y-2">
                {metadata.places.map((place, index) => (
                  <button
                    key={index}
                    onClick={() => handlePlaceClick(place, index)}
                    className="block w-full text-left bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer"
                  >
                    {/* 이미지 */}
                    <div className="relative w-full h-36 bg-gray-100">
                      <Image
                        src={place.image_url || "/placeholder.svg?height=144&width=320&query=restaurant"}
                        alt={place.name}
                        fill
                        className="object-cover"
                      />
                      {/* 순위 배지 */}
                      <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-kakao-yellow flex items-center justify-center shadow">
                        <span className="text-sm font-bold text-kakao-dark">{index + 1}</span>
                      </div>
                      {/* 지도 보기 힌트 */}
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                          />
                        </svg>
                        지도 보기
                      </div>
                    </div>

                    {/* 정보 */}
                    <div className="p-3">
                      {/* 가게명과 카테고리 */}
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-kakao-dark text-base truncate">{place.name}</h4>
                        {place.category && (
                          <span className="text-xs text-gray-500 flex-shrink-0">{place.category}</span>
                        )}
                      </div>

                      {place.price_range && (
                        <div className="flex items-center gap-1 text-xs text-kakao-dark mb-1">
                          <Banknote className="w-3 h-3" />
                          <span className="font-medium">{place.price_range}</span>
                        </div>
                      )}

                      {/* 설명 */}
                      {place.description && (
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{place.description}</p>
                      )}

                      {/* 주소 */}
                      <div className="flex items-center gap-1 text-xs text-gray-500 mb-2">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{place.address}</span>
                      </div>

                      {place.convenience && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {place.convenience
                            .split(" ")
                            .slice(0, 4)
                            .map((item, i) => (
                              <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                                {item.replace("#", "")}
                              </span>
                            ))}
                        </div>
                      )}

                      {place.memberTravelInfo && place.memberTravelInfo.length > 0 ? (
                        <div className="bg-kakao-gray/50 rounded-lg p-2 mb-2">
                          <div className="flex items-center gap-1 text-xs text-kakao-dark/70 mb-1">
                            <Clock className="w-3 h-3" />
                            <span>대중교통 소요시간</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {place.memberTravelInfo.map((member, i) => (
                              <div key={i} className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full">
                                <span className="font-medium text-kakao-dark">{member.nickname}</span>
                                <TransportIcon />
                                <span className="text-kakao-dark/70">{formatDuration(member.duration)}</span>
                                {member.transferCount !== undefined && member.transferCount > 0 && (
                                  <span className="text-kakao-dark/50">(환승 {member.transferCount}회)</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="bg-kakao-gray/50 rounded-lg p-2 mb-2">
                          <div className="flex items-center gap-1 text-xs text-kakao-dark/50">
                            <Clock className="w-3 h-3" />
                            <span>소요시간 정보를 불러오는 중...</span>
                          </div>
                        </div>
                      )}

                      {/* 태그 */}
                      {place.tags && (
                        <div className="flex flex-wrap gap-1">
                          {place.tags
                            .split(" ")
                            .slice(0, 3)
                            .map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="text-xs px-2 py-0.5 rounded-full bg-kakao-yellow/30 text-kakao-dark"
                              >
                                {tag}
                              </span>
                            ))}
                        </div>
                      )}

                      {/* 리뷰 수 */}
                      {place.review_count && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zm-8 0h2v2H9V9z" />
                          </svg>
                          <span>리뷰 {place.review_count.toLocaleString()}개</span>
                        </div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="text-xs text-kakao-dark/60 flex-shrink-0">{formattedTime}</span>
        </div>
      </div>
    )
}\
