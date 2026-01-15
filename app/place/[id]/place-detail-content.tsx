"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Navigation,
  Clock,
  MapPin,
  Users,
  Train,
  Bus,
  Footprints,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"

declare global {
  interface Window {
    kakao: any
  }
}

interface RouteStep {
  type: "walk" | "subway" | "bus"
  startName?: string
  endName?: string
  lineName?: string
  sectionTime: number
  stationCount?: number
  graphPos?: Array<{ lat: number; lng: number }>
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

interface PlaceData {
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

interface Props {
  id: string
  place: PlaceData
  roomId?: string
}

const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  강남: { lat: 37.4979, lng: 127.0276 },
  강남역: { lat: 37.4979, lng: 127.0276 },
  홍대: { lat: 37.5563, lng: 126.9226 },
  홍대입구: { lat: 37.5563, lng: 126.9226 },
  "홍대/연남": { lat: 37.5563, lng: 126.9226 },
  연남동: { lat: 37.5663, lng: 126.9244 },
  연남: { lat: 37.5663, lng: 126.9244 },
  성수: { lat: 37.5445, lng: 127.0557 },
  성수동: { lat: 37.5445, lng: 127.0557 },
  종로: { lat: 37.5704, lng: 126.9922 },
  "종로/을지로": { lat: 37.5704, lng: 126.9922 },
  을지로: { lat: 37.5662, lng: 126.9916 },
  이태원: { lat: 37.5347, lng: 126.9945 },
  "이태원/한남": { lat: 37.5347, lng: 126.9945 },
  한남: { lat: 37.5347, lng: 127.0063 },
  한남동: { lat: 37.5347, lng: 127.0063 },
  신촌: { lat: 37.5596, lng: 126.9428 },
  이대: { lat: 37.5569, lng: 126.9462 },
  신사: { lat: 37.5163, lng: 127.0204 },
  압구정: { lat: 37.5271, lng: 127.0286 },
  청담: { lat: 37.5199, lng: 127.0472 },
  삼성: { lat: 37.5089, lng: 127.0634 },
  삼성역: { lat: 37.5089, lng: 127.0634 },
  잠실: { lat: 37.5133, lng: 127.1001 },
  건대: { lat: 37.5404, lng: 127.0696 },
  건대입구: { lat: 37.5404, lng: 127.0696 },
  왕십리: { lat: 37.5615, lng: 127.0378 },
  명동: { lat: 37.5636, lng: 126.9869 },
  동대문: { lat: 37.5712, lng: 127.0095 },
  혜화: { lat: 37.5822, lng: 127.0011 },
  대학로: { lat: 37.5822, lng: 127.0011 },
  서울역: { lat: 37.5547, lng: 126.9706 },
  용산: { lat: 37.5299, lng: 126.9645 },
  여의도: { lat: 37.5219, lng: 126.9245 },
  영등포: { lat: 37.5156, lng: 126.9078 },
  마포: { lat: 37.5538, lng: 126.9515 },
  합정: { lat: 37.5495, lng: 126.9137 },
  망원: { lat: 37.5563, lng: 126.9105 },
  상수: { lat: 37.5478, lng: 126.9227 },
  광화문: { lat: 37.5759, lng: 126.9769 },
  북촌: { lat: 37.5826, lng: 126.9831 },
  서촌: { lat: 37.5796, lng: 126.9712 },
  익선동: { lat: 37.5743, lng: 126.9887 },
  인사동: { lat: 37.5743, lng: 126.985 },
}

function getCoordsByLocation(location: string): { lat: number; lng: number } | null {
  if (LOCATION_COORDS[location]) {
    return LOCATION_COORDS[location]
  }
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (location.includes(key) || key.includes(location)) {
      return coords
    }
  }
  return null
}

const MEMBER_COLORS = [
  "#FF6B6B", // 빨강
  "#4ECDC4", // 청록
  "#45B7D1", // 하늘
  "#96CEB4", // 연두
  "#FFEAA7", // 노랑
  "#DDA0DD", // 보라
  "#98D8C8", // 민트
  "#F7DC6F", // 금색
]

const SUBWAY_LINE_COLORS: Record<string, string> = {
  "1호선": "#0052A4",
  "2호선": "#00A84D",
  "3호선": "#EF7C1C",
  "4호선": "#00A5DE",
  "5호선": "#996CAC",
  "6호선": "#CD7C2F",
  "7호선": "#747F00",
  "8호선": "#E6186C",
  "9호선": "#BDB092",
  경의중앙선: "#77C4A3",
  분당선: "#F5A200",
  신분당선: "#D4003B",
  경춘선: "#0C8E72",
  공항철도: "#0090D2",
  인천1호선: "#7CA8D5",
  인천2호선: "#ED8B00",
  수인선: "#F5A200",
  우이신설선: "#B0CE18",
  신림선: "#6789CA",
  "GTX-A": "#9A6292",
}

function getSubwayLineColor(lineName: string): string {
  for (const [key, color] of Object.entries(SUBWAY_LINE_COLORS)) {
    if (lineName.includes(key)) {
      return color
    }
  }
  return "#0052A4" // 기본 파란색
}

function getRouteColor(step: RouteStep, memberColor: string): string {
  if (step.type === "subway" && step.lineName) {
    return getSubwayLineColor(step.lineName)
  } else if (step.type === "bus") {
    return "#2ECC71" // 버스 녹색
  } else if (step.type === "walk") {
    return "#888888" // 도보 회색
  }
  return memberColor
}

export default function PlaceDetailContent({ id, place, roomId }: Props) {
  const router = useRouter()
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const initialized = useRef(false)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    place.latitude && place.longitude ? { lat: place.latitude, lng: place.longitude } : null,
  )
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState<string | null>(null)
  const [expandedMembers, setExpandedMembers] = useState<Set<string>>(new Set())
  const [memberRoutes, setMemberRoutes] = useState<Map<string, MemberTravelInfo>>(new Map())
  const [loadingRoutes, setLoadingRoutes] = useState(false)
  const polylinesRef = useRef<any[]>([])
  const [memberColorMap, setMemberColorMap] = useState<Map<string, string>>(new Map())

  const fetchAllRoutesParallel = async (
    members: MemberTravelInfo[],
    destLat: number,
    destLng: number,
  ): Promise<Map<string, MemberTravelInfo>> => {
    console.log(`[v0] Fetching ${members.length} routes in parallel`)
    const startTime = Date.now()

    const routePromises = members.map(async (member) => {
      let memberLat = member.lat
      let memberLng = member.lng

      if (!memberLat || !memberLng) {
        const guessedCoords = getCoordsByLocation(member.nickname)
        if (guessedCoords) {
          memberLat = guessedCoords.lat
          memberLng = guessedCoords.lng
        }
      }

      if (!memberLat || !memberLng) {
        return { nickname: member.nickname, info: member }
      }

      try {
        const res = await fetch(
          `/api/odsay?startLat=${memberLat}&startLng=${memberLng}&endLat=${destLat}&endLng=${destLng}`,
        )

        if (!res.ok) {
          return { nickname: member.nickname, info: { ...member, lat: memberLat, lng: memberLng } }
        }

        const data = await res.json()

        if (data.fromCache) {
          console.log(`[v0] Route for ${member.nickname}: CACHED`)
        }

        if (data.error) {
          return { nickname: member.nickname, info: { ...member, lat: memberLat, lng: memberLng } }
        }

        return {
          nickname: member.nickname,
          info: {
            ...member,
            lat: memberLat,
            lng: memberLng,
            duration: data.duration,
            transferCount: data.transferCount,
            walkTime: data.walkTime,
            pathType: data.pathType,
            payment: data.payment,
            steps: data.steps,
          },
        }
      } catch (err) {
        console.log(`[v0] Route fetch error for ${member.nickname}:`, err)
        return { nickname: member.nickname, info: { ...member, lat: memberLat, lng: memberLng } }
      }
    })

    const results = await Promise.all(routePromises)
    const routeMap = new Map<string, MemberTravelInfo>()

    for (const { nickname, info } of results) {
      routeMap.set(nickname, info)
    }

    const elapsed = Date.now() - startTime
    console.log(`[v0] All ${members.length} routes fetched in ${elapsed}ms (parallel)`)

    return routeMap
  }

  const fetchODsayRoute = async (
    startLat: number,
    startLng: number,
    endLat: number,
    endLng: number,
  ): Promise<{
    duration: number
    transferCount: number
    walkTime: number
    pathType: "subway" | "bus" | "subway+bus"
    payment: number
    steps: RouteStep[]
  } | null> => {
    try {
      const res = await fetch(`/api/odsay?startLat=${startLat}&startLng=${startLng}&endLat=${endLat}&endLng=${endLng}`)

      if (!res.ok) {
        return null
      }

      const data = await res.json()

      if (data.error) {
        return null
      }

      return data
    } catch (err) {
      return null
    }
  }

  const drawRouteOnMap = (
    map: any,
    memberLat: number,
    memberLng: number,
    destLat: number,
    destLng: number,
    steps: RouteStep[],
    memberColor: string,
  ) => {
    if (!window.kakao?.maps) return

    let lastLat = memberLat
    let lastLng = memberLng

    // 화살표 그리기 함수
    const drawArrowsOnPath = (path: any[], color: string) => {
      if (path.length < 2) return

      // 경로를 따라 일정 간격으로 화살표 추가
      const interval = Math.max(1, Math.floor(path.length / 5)) // 최대 5개 화살표

      for (let i = interval; i < path.length; i += interval) {
        const prev = path[i - 1]
        const curr = path[i]

        const prevLat = prev.getLat()
        const prevLng = prev.getLng()
        const currLat = curr.getLat()
        const currLng = curr.getLng()

        // 방향 계산
        const angle = (Math.atan2(currLng - prevLng, currLat - prevLat) * 180) / Math.PI

        // 화살표 마커 생성
        const arrowContent = document.createElement("div")
        arrowContent.innerHTML = `
          <div style="
            width: 0;
            height: 0;
            border-left: 5px solid transparent;
            border-right: 5px solid transparent;
            border-bottom: 10px solid ${color};
            transform: rotate(${-angle}deg);
            filter: drop-shadow(0 1px 1px rgba(0,0,0,0.3));
          "></div>
        `

        const arrowOverlay = new window.kakao.maps.CustomOverlay({
          position: curr,
          content: arrowContent,
          zIndex: 3,
        })
        arrowOverlay.setMap(map)
        polylinesRef.current.push(arrowOverlay)
      }
    }

    steps.forEach((step, index) => {
      if (step.graphPos && step.graphPos.length > 0) {
        const path = step.graphPos.map((pos) => new window.kakao.maps.LatLng(pos.lat, pos.lng))

        // 이전 위치와 현재 경로 시작점 연결 (도보)
        if (index === 0 || step.type !== "walk") {
          const walkPath = [new window.kakao.maps.LatLng(lastLat, lastLng), path[0]]
          // 도보 테두리
          const walkLineBorder = new window.kakao.maps.Polyline({
            path: walkPath,
            strokeWeight: 6,
            strokeColor: "#ffffff",
            strokeOpacity: 1,
            strokeStyle: "solid",
          })
          walkLineBorder.setMap(map)
          polylinesRef.current.push(walkLineBorder)
          // 도보 선
          const walkLine = new window.kakao.maps.Polyline({
            path: walkPath,
            strokeWeight: 3,
            strokeColor: "#888888",
            strokeOpacity: 0.8,
            strokeStyle: "dash",
          })
          walkLine.setMap(map)
          polylinesRef.current.push(walkLine)
        }

        const strokeColor = getRouteColor(step, memberColor)
        const strokeWeight = step.type === "subway" ? 6 : 5

        // 테두리 선 (흰색)
        const borderLine = new window.kakao.maps.Polyline({
          path,
          strokeWeight: strokeWeight + 3,
          strokeColor: "#ffffff",
          strokeOpacity: 1,
          strokeStyle: "solid",
        })
        borderLine.setMap(map)
        polylinesRef.current.push(borderLine)

        // 메인 선
        const polyline = new window.kakao.maps.Polyline({
          path,
          strokeWeight,
          strokeColor,
          strokeOpacity: 1,
          strokeStyle: "solid",
        })
        polyline.setMap(map)
        polylinesRef.current.push(polyline)

        // 화살표 추가
        drawArrowsOnPath(path, strokeColor)

        const lastPos = step.graphPos[step.graphPos.length - 1]
        lastLat = lastPos.lat
        lastLng = lastPos.lng
      }
    })

    // 마지막 도보 구간
    const finalWalkPath = [
      new window.kakao.maps.LatLng(lastLat, lastLng),
      new window.kakao.maps.LatLng(destLat, destLng),
    ]
    // 테두리
    const finalWalkBorder = new window.kakao.maps.Polyline({
      path: finalWalkPath,
      strokeWeight: 6,
      strokeColor: "#ffffff",
      strokeOpacity: 1,
      strokeStyle: "solid",
    })
    finalWalkBorder.setMap(map)
    polylinesRef.current.push(finalWalkBorder)
    // 선
    const finalWalkLine = new window.kakao.maps.Polyline({
      path: finalWalkPath,
      strokeWeight: 3,
      strokeColor: "#888888",
      strokeOpacity: 0.8,
      strokeStyle: "dash",
    })
    finalWalkLine.setMap(map)
    polylinesRef.current.push(finalWalkLine)
  }

  useEffect(() => {
    if (initialized.current) return
    if (!place.name || !place.address) {
      return
    }
    initialized.current = true

    const init = async () => {
      let kakaoKey: string | null = null
      try {
        const keyRes = await fetch("/api/kakao-key")
        if (!keyRes.ok) {
          throw new Error("Failed to fetch kakao key")
        }
        const keyData = await keyRes.json()
        kakaoKey = keyData.key
      } catch (err) {
        setMapError("카카오 API 키를 불러올 수 없습니다")
        return
      }

      if (!kakaoKey) {
        setMapError("KAKAO_JS_KEY 환경변수를 확인해주세요")
        return
      }

      if (!window.kakao?.maps) {
        try {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement("script")
            script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoKey}&autoload=false&libraries=services`
            script.onload = () => {
              if (window.kakao && window.kakao.maps) {
                window.kakao.maps.load(() => {
                  resolve()
                })
              } else {
                reject(new Error("Kakao SDK loaded but maps not available"))
              }
            }
            script.onerror = () => {
              reject(new Error("카카오맵 SDK 스크립트 로딩 실패"))
            }
            document.head.appendChild(script)
          })
        } catch (err) {
          setMapError("카카오맵 SDK 로딩 실패. 카카오 개발자센터에서 플랫폼(Web)을 등록해주세요.")
          return
        }
      }

      if (!window.kakao?.maps) {
        setMapError("카카오맵을 초기화할 수 없습니다")
        return
      }

      let destLat = place.latitude,
        destLng = place.longitude

      if (!destLat || !destLng) {
        const found = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
          const geocoder = new window.kakao.maps.services.Geocoder()
          geocoder.addressSearch(place.address, (r: any, s: any) => {
            if (s === window.kakao.maps.services.Status.OK) {
              resolve({ lat: +r[0].y, lng: +r[0].x })
            } else {
              new window.kakao.maps.services.Places().keywordSearch(
                place.name + " " + place.address,
                (d: any, st: any) => {
                  if (st === window.kakao.maps.services.Status.OK && d[0]) {
                    resolve({ lat: +d[0].y, lng: +d[0].x })
                  } else resolve(null)
                },
              )
            }
          })
        })
        if (found) {
          destLat = found.lat
          destLng = found.lng
        }
      }

      if (!destLat || !destLng) {
        setMapError("장소 좌표를 찾을 수 없습니다")
        return
      }

      if (!mapRef.current) {
        setMapError("지도 컨테이너를 찾을 수 없습니다")
        return
      }

      setCoords({ lat: destLat, lng: destLng })

      const destPos = new window.kakao.maps.LatLng(destLat, destLng)
      const map = new window.kakao.maps.Map(mapRef.current, { center: destPos, level: 5 })
      mapInstanceRef.current = map

      // 목적지 마커 생성
      const destMarkerContent = document.createElement("div")
      destMarkerContent.style.cursor = "pointer"
      destMarkerContent.onclick = () => {
        window.open(`https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${destLat},${destLng}`, "_blank")
      }
      destMarkerContent.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center;">
          <div style="background: #FEE500; padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: bold; color: #3C1E1E; box-shadow: 0 2px 8px rgba(0,0,0,0.2); white-space: nowrap;">${place.name}</div>
          <div style="width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-top: 10px solid #FEE500; margin-top: -1px;"></div>
          <div style="width: 12px; height: 12px; background: #FF6B6B; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>
          <div style="margin-top: 4px; font-size: 10px; color: #666;">클릭하여 카카오맵 열기</div>
        </div>
      `
      const destOverlay = new window.kakao.maps.CustomOverlay({
        position: destPos,
        content: destMarkerContent,
        yAnchor: 1.2,
        zIndex: 10,
      })
      destOverlay.setMap(map)

      const bounds = new window.kakao.maps.LatLngBounds()
      bounds.extend(destPos)

      const colorMap = new Map<string, string>()

      if (place.memberTravelInfo && place.memberTravelInfo.length > 0) {
        setLoadingRoutes(true)

        place.memberTravelInfo.forEach((member, i) => {
          colorMap.set(member.nickname, MEMBER_COLORS[i % MEMBER_COLORS.length])
        })
        setMemberColorMap(colorMap)

        const routeMap = await fetchAllRoutesParallel(place.memberTravelInfo, destLat, destLng)
        setMemberRoutes(routeMap)

        // 멤버 마커 및 경로 그리기
        for (let i = 0; i < place.memberTravelInfo.length; i++) {
          const member = place.memberTravelInfo[i]
          const color = MEMBER_COLORS[i % MEMBER_COLORS.length]
          const routeInfo = routeMap.get(member.nickname)

          const memberLat = routeInfo?.lat
          const memberLng = routeInfo?.lng

          if (memberLat && memberLng) {
            const memberPos = new window.kakao.maps.LatLng(memberLat, memberLng)
            bounds.extend(memberPos)

            // 멤버 마커
            const markerContent = document.createElement("div")
            markerContent.innerHTML = `
              <div style="display: flex; flex-direction: column; align-items: center;">
                <div style="background: ${color}; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; color: white; box-shadow: 0 2px 6px rgba(0,0,0,0.2); white-space: nowrap;">${member.nickname}</div>
                <div style="width: 0; height: 0; border-left: 6px solid transparent; border-right: 6px solid transparent; border-top: 8px solid ${color}; margin-top: -1px;"></div>
              </div>
            `
            const customOverlay = new window.kakao.maps.CustomOverlay({
              position: memberPos,
              content: markerContent,
              yAnchor: 1.3,
              zIndex: 5,
            })
            customOverlay.setMap(map)

            // 경로 그리기
            if (routeInfo?.steps && routeInfo.steps.length > 0) {
              drawRouteOnMap(map, memberLat, memberLng, destLat, destLng, routeInfo.steps, color)
            } else {
              // 폴백: 점선
              const simplePath = [
                new window.kakao.maps.LatLng(memberLat, memberLng),
                new window.kakao.maps.LatLng(destLat, destLng),
              ]
              const simpleLine = new window.kakao.maps.Polyline({
                path: simplePath,
                strokeWeight: 3,
                strokeColor: color,
                strokeOpacity: 0.6,
                strokeStyle: "dash",
              })
              simpleLine.setMap(map)
              polylinesRef.current.push(simpleLine)
            }
          }
        }

        setLoadingRoutes(false)
      }

      // 범위 조정
      if (place.memberTravelInfo && place.memberTravelInfo.length > 0) {
        map.setBounds(bounds, 80)
      }

      setMapReady(true)
    }

    init()
  }, [place])

  const formatDuration = (m: number) => (m < 60 ? `${m}분` : `${Math.floor(m / 60)}시간${m % 60 ? ` ${m % 60}분` : ""}`)

  const StepIcon = ({ type, color }: { type: "walk" | "subway" | "bus"; color?: string }) => {
    switch (type) {
      case "subway":
        return <Train className="w-4 h-4" style={{ color: color || "#0052A4" }} />
      case "bus":
        return <Bus className="w-4 h-4" style={{ color: color || "#2ECC71" }} />
      case "walk":
        return <Footprints className="w-4 h-4 text-gray-500" />
    }
  }

  const getPathTypeLabel = (type?: string) => {
    switch (type) {
      case "subway":
        return "지하철"
      case "bus":
        return "버스"
      case "subway+bus":
        return "지하철+버스"
      default:
        return "대중교통"
    }
  }

  const toggleMemberExpand = (nickname: string) => {
    setExpandedMembers((prev) => {
      const next = new Set(prev)
      if (next.has(nickname)) {
        next.delete(nickname)
      } else {
        next.add(nickname)
      }
      return next
    })
  }

  const getMemberInfo = (member: MemberTravelInfo): MemberTravelInfo => {
    return memberRoutes.get(member.nickname) || member
  }

  const handleBack = () => {
    if (roomId) {
      // roomId가 있으면 채팅방으로 돌아가기 위해 메인 페이지로 이동 후 채팅방 입장
      // localStorage에 돌아갈 roomId 저장
      localStorage.setItem("returnToRoom", roomId)
      router.push("/")
    } else {
      router.back()
    }
  }

  if (!place.name) {
    return (
      <div className="min-h-screen bg-kakao-bg flex items-center justify-center">
        <p className="text-kakao-dark">장소 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-kakao-bg flex flex-col">
      <header className="bg-kakao-header border-b border-kakao-dark/10 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="text-kakao-dark" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-kakao-dark truncate">{place.name}</h1>
      </header>

      <div className="relative">
        <div ref={mapRef} className="w-full h-80 bg-gray-200 flex items-center justify-center">
          {mapError && (
            <div className="text-center text-red-500 p-4">
              <p>{mapError}</p>
              <p className="text-sm text-gray-500 mt-1">KAKAO_JS_KEY 환경변수를 확인해주세요</p>
            </div>
          )}
          {!mapError && !mapReady && (
            <div className="text-center text-gray-500">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
              <p>지도 로딩 중...</p>
            </div>
          )}
        </div>

        {mapReady && memberColorMap.size > 0 && (
          <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm rounded-lg p-2 shadow-lg text-xs">
            <div className="font-semibold mb-1 text-gray-700">참여자</div>
            {Array.from(memberColorMap.entries()).map(([nickname, color]) => (
              <div key={nickname} className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-gray-600">{nickname}</span>
              </div>
            ))}
            <div className="mt-1.5 pt-1.5 border-t border-gray-200">
              <div className="font-semibold mb-1 text-gray-700">교통수단</div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1 rounded" style={{ backgroundColor: "#0052A4" }} />
                <span className="text-gray-600">지하철</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-1 rounded" style={{ backgroundColor: "#2ECC71" }} />
                <span className="text-gray-600">버스</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-0.5 border-t border-dashed border-gray-500" />
                <span className="text-gray-600">도보</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          <div className="flex gap-4 items-start">
            {place.image_url && (
              <div className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden">
                <Image
                  src={place.image_url || "/placeholder.svg"}
                  alt={place.name}
                  fill
                  className="object-cover"
                  crossOrigin="anonymous"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-kakao-dark">{place.name}</h2>
              {place.category && <p className="text-sm text-gray-600">{place.category}</p>}
              <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{place.address}</span>
              </div>
              {place.review_count && (
                <p className="text-xs text-gray-400 mt-1">리뷰 {place.review_count.toLocaleString()}개</p>
              )}
              {place.price_range && <p className="text-xs text-gray-400 mt-1">가격대: {place.price_range}</p>}
              {place.convenience && <p className="text-xs text-gray-400 mt-1">편의성: {place.convenience}</p>}
            </div>
          </div>

          {place.description && <p className="mt-3 text-sm text-gray-700 leading-relaxed">{place.description}</p>}

          {place.tags && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {place.tags.split(",").map((tag, i) => (
                <span key={i} className="px-2 py-0.5 bg-kakao-yellow/30 text-kakao-dark text-xs rounded-full">
                  #{tag.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {place.memberTravelInfo && place.memberTravelInfo.length > 0 && (
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-kakao-dark" />
              <h3 className="font-semibold text-kakao-dark">대중교통 이동 경로</h3>
              {loadingRoutes && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
            </div>

            <div className="space-y-2">
              {place.memberTravelInfo.map((member, index) => {
                const memberInfo = getMemberInfo(member)
                const isExpanded = expandedMembers.has(member.nickname)
                const memberColor = memberColorMap.get(member.nickname) || MEMBER_COLORS[index % MEMBER_COLORS.length]

                return (
                  <div
                    key={member.nickname}
                    className="bg-white rounded-lg overflow-hidden shadow-sm"
                    style={{ borderLeft: `4px solid ${memberColor}` }}
                  >
                    <button
                      onClick={() => toggleMemberExpand(member.nickname)}
                      className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: memberColor }}
                        >
                          {member.nickname.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-kakao-dark">{member.nickname}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {memberInfo.duration > 0 ? formatDuration(memberInfo.duration) : "계산 중..."}
                            </span>
                            {memberInfo.pathType && (
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded">
                                {getPathTypeLabel(memberInfo.pathType)}
                              </span>
                            )}
                            {memberInfo.transferCount !== undefined && memberInfo.transferCount > 0 && (
                              <span>환승 {memberInfo.transferCount}회</span>
                            )}
                          </div>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>

                    {isExpanded && memberInfo.steps && memberInfo.steps.length > 0 && (
                      <div className="px-3 pb-3 border-t border-gray-100">
                        <div className="pt-3 space-y-2">
                          {memberInfo.steps.map((step, stepIndex) => {
                            const stepColor = getRouteColor(step, memberColor)
                            return (
                              <div
                                key={stepIndex}
                                className="flex items-start gap-2 text-sm"
                                style={{ borderLeft: `3px solid ${stepColor}`, paddingLeft: "8px" }}
                              >
                                <StepIcon type={step.type} color={step.type === "subway" ? stepColor : undefined} />
                                <div className="flex-1">
                                  {step.type === "walk" ? (
                                    <span className="text-gray-600">도보 {step.sectionTime}분</span>
                                  ) : step.type === "subway" ? (
                                    <div>
                                      <span
                                        className="font-medium px-1.5 py-0.5 rounded text-white text-xs"
                                        style={{ backgroundColor: stepColor }}
                                      >
                                        {step.lineName}
                                      </span>
                                      <span className="text-gray-700 ml-1">
                                        {step.startName} → {step.endName}
                                      </span>
                                      <span className="text-gray-500 text-xs ml-1">
                                        ({step.stationCount}개역, {step.sectionTime}분)
                                      </span>
                                    </div>
                                  ) : (
                                    <div>
                                      <span
                                        className="font-medium px-1.5 py-0.5 rounded text-white text-xs"
                                        style={{ backgroundColor: stepColor }}
                                      >
                                        {step.lineName}
                                      </span>
                                      <span className="text-gray-700 ml-1">
                                        {step.startName} → {step.endName}
                                      </span>
                                      <span className="text-gray-500 text-xs ml-1">
                                        ({step.stationCount}개 정류장, {step.sectionTime}분)
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {memberInfo.payment && (
                          <div className="mt-3 pt-2 border-t border-gray-100 text-xs text-gray-500">
                            예상 요금: {memberInfo.payment.toLocaleString()}원
                          </div>
                        )}

                        {/* 길찾기 버튼 */}
                        {memberInfo.lat && memberInfo.lng && coords && (
                          <div className="mt-3">
                            <a
                              href={`https://map.kakao.com/link/by/traffic/${encodeURIComponent(member.nickname)},${memberInfo.lat},${memberInfo.lng}/${encodeURIComponent(place.name)},${coords.lat},${coords.lng}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center gap-2 w-full py-2 bg-kakao-yellow text-kakao-dark rounded-lg text-sm font-medium hover:bg-kakao-yellow/80 transition-colors"
                            >
                              <Navigation className="w-4 h-4" />
                              카카오맵에서 길찾기
                            </a>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
