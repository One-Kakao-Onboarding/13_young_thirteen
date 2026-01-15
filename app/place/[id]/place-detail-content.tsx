"use client"

import { useEffect, useState, useRef, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { ArrowLeft, Navigation, Clock, MapPin, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"

declare global {
  interface Window {
    kakao: any
  }
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
}

interface RouteInfo {
  duration: number
  distance: number
  taxiFare?: number
  tollFare?: number
}

export default function PlaceDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [place, setPlace] = useState<PlaceInfo | null>(null)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null)
  const [isLoadingRoute, setIsLoadingRoute] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [kakaoJsKey, setKakaoJsKey] = useState<string | null>(null)

  // URL 파라미터에서 장소 정보 파싱
  useEffect(() => {
    const name = searchParams.get("name")
    const address = searchParams.get("address")
    const category = searchParams.get("category")
    const description = searchParams.get("description")
    const tags = searchParams.get("tags")
    const image_url = searchParams.get("image_url")
    const review_count = searchParams.get("review_count")
    const lat = searchParams.get("lat")
    const lng = searchParams.get("lng")

    if (name && address) {
      setPlace({
        name: decodeURIComponent(name),
        address: decodeURIComponent(address),
        category: category ? decodeURIComponent(category) : undefined,
        description: description ? decodeURIComponent(description) : undefined,
        tags: tags ? decodeURIComponent(tags) : undefined,
        image_url: image_url ? decodeURIComponent(image_url) : undefined,
        review_count: review_count ? Number.parseInt(review_count) : undefined,
        latitude: lat ? Number.parseFloat(lat) : undefined,
        longitude: lng ? Number.parseFloat(lng) : undefined,
      })
    }
  }, [searchParams])

  // 카카오 JS 키 가져오기
  useEffect(() => {
    fetch("/api/kakao-key")
      .then((res) => res.json())
      .then((data) => {
        if (data.key) {
          setKakaoJsKey(data.key)
        }
      })
      .catch(console.error)
  }, [])

  // 카카오맵 SDK 로드
  useEffect(() => {
    if (!kakaoJsKey) return

    if (window.kakao?.maps) {
      setMapLoaded(true)
      return
    }

    const script = document.createElement("script")
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${kakaoJsKey}&autoload=false&libraries=services`
    script.async = true
    script.onload = () => {
      window.kakao.maps.load(() => {
        setMapLoaded(true)
      })
    }
    document.head.appendChild(script)
  }, [kakaoJsKey])

  // 사용자 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          console.error("위치 정보 에러:", error)
          setLocationError("위치 정보를 가져올 수 없습니다. 위치 권한을 확인해주세요.")
          setUserLocation({ lat: 37.5666805, lng: 126.9784147 })
        },
      )
    } else {
      setLocationError("이 브라우저에서는 위치 정보를 지원하지 않습니다.")
      setUserLocation({ lat: 37.5666805, lng: 126.9784147 })
    }
  }, [])

  // 지도 초기화 및 마커 표시
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || !place) return

    if (place.latitude && place.longitude) {
      initMap(place.latitude, place.longitude)
    } else {
      const geocoder = new window.kakao.maps.services.Geocoder()
      geocoder.addressSearch(place.address, (result: any, status: any) => {
        if (status === window.kakao.maps.services.Status.OK) {
          initMap(Number.parseFloat(result[0].y), Number.parseFloat(result[0].x))
        } else {
          const ps = new window.kakao.maps.services.Places()
          ps.keywordSearch(place.name + " " + place.address, (data: any, status: any) => {
            if (status === window.kakao.maps.services.Status.OK && data.length > 0) {
              initMap(Number.parseFloat(data[0].y), Number.parseFloat(data[0].x))
            }
          })
        }
      })
    }
  }, [mapLoaded, place])

  const initMap = (lat: number, lng: number) => {
    if (!mapRef.current) return

    const position = new window.kakao.maps.LatLng(lat, lng)
    const options = {
      center: position,
      level: 3,
    }

    const map = new window.kakao.maps.Map(mapRef.current, options)

    const marker = new window.kakao.maps.Marker({
      position: position,
      map: map,
    })

    const infowindow = new window.kakao.maps.InfoWindow({
      content: `<div style="padding:5px;font-size:12px;width:150px;text-align:center;">${place?.name}</div>`,
    })
    infowindow.open(map, marker)

    if (userLocation) {
      const userPosition = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng)
      new window.kakao.maps.Marker({
        position: userPosition,
        map: map,
        image: new window.kakao.maps.MarkerImage(
          "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png",
          new window.kakao.maps.Size(24, 35),
        ),
      })

      const bounds = new window.kakao.maps.LatLngBounds()
      bounds.extend(position)
      bounds.extend(userPosition)
      map.setBounds(bounds)

      fetchRouteInfo(lat, lng)
    }

    if (!place?.latitude || !place?.longitude) {
      setPlace((prev) =>
        prev
          ? {
              ...prev,
              latitude: lat,
              longitude: lng,
            }
          : null,
      )
    }
  }

  const fetchRouteInfo = async (destLat: number, destLng: number) => {
    if (!userLocation) return

    setIsLoadingRoute(true)
    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: { lat: userLocation.lat, lng: userLocation.lng },
          destination: { lat: destLat, lng: destLng },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setRouteInfo(data)
      }
    } catch (error) {
      console.error("길찾기 정보 에러:", error)
    } finally {
      setIsLoadingRoute(false)
    }
  }

  const openKakaoMapNavigation = () => {
    if (!place?.latitude || !place?.longitude) return

    const kakaoMapUrl = `https://map.kakao.com/link/to/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`
    window.open(kakaoMapUrl, "_blank")
  }

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}분`
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return mins > 0 ? `${hours}시간 ${mins}분` : `${hours}시간`
  }

  const formatDistance = (meters: number) => {
    if (meters < 1000) return `${meters}m`
    return `${(meters / 1000).toFixed(1)}km`
  }

  if (!place) {
    return (
      <div className="min-h-screen bg-kakao-bg flex items-center justify-center">
        <p className="text-kakao-dark">장소 정보를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-kakao-bg flex flex-col">
      {/* 헤더 */}
      <header className="bg-kakao-header border-b border-kakao-dark/10 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-kakao-dark">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="font-bold text-kakao-dark truncate">{place.name}</h1>
      </header>

      {/* 지도 */}
      <div ref={mapRef} className="w-full h-64 bg-gray-200" />

      {/* 길찾기 정보 카드 */}
      {userLocation && (
        <div className="bg-white mx-4 -mt-6 rounded-xl shadow-lg p-4 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-kakao-yellow" />
                {isLoadingRoute ? (
                  <span className="text-sm text-gray-500">계산 중...</span>
                ) : routeInfo ? (
                  <div>
                    <span className="text-lg font-bold text-kakao-dark">{formatDuration(routeInfo.duration)}</span>
                    <span className="text-sm text-gray-500 ml-1">소요</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">정보 없음</span>
                )}
              </div>
              {routeInfo && (
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <MapPin className="w-4 h-4" />
                  <span>{formatDistance(routeInfo.distance)}</span>
                </div>
              )}
            </div>
            <Button
              onClick={openKakaoMapNavigation}
              className="bg-kakao-yellow text-kakao-dark hover:bg-kakao-yellow/90"
            >
              <Navigation className="w-4 h-4 mr-1" />
              길찾기
            </Button>
          </div>
          {routeInfo?.taxiFare && (
            <p className="text-xs text-gray-500 mt-2">예상 택시비: {routeInfo.taxiFare.toLocaleString()}원</p>
          )}
          {locationError && <p className="text-xs text-orange-500 mt-2">{locationError} (기본 위치: 서울 시청)</p>}
        </div>
      )}

      {/* 장소 정보 */}
      <div className="flex-1 p-4 space-y-4">
        {place.image_url && (
          <div className="relative w-full h-48 rounded-xl overflow-hidden">
            <Image src={place.image_url || "/placeholder.svg"} alt={place.name} fill className="object-cover" />
          </div>
        )}

        <div className="bg-white rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-kakao-dark">{place.name}</h2>
            {place.category && (
              <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{place.category}</span>
            )}
          </div>

          {place.description && <p className="text-sm text-gray-600">{place.description}</p>}

          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{place.address}</span>
          </div>

          {place.tags && (
            <div className="flex flex-wrap gap-1">
              {place.tags.split(" ").map((tag, index) => (
                <span key={index} className="text-xs px-2 py-1 rounded-full bg-kakao-yellow/30 text-kakao-dark">
                  {tag}
                </span>
              ))}
            </div>
          )}

          {place.review_count && <p className="text-sm text-gray-500">리뷰 {place.review_count.toLocaleString()}개</p>}
        </div>

        <Button
          variant="outline"
          className="w-full bg-transparent"
          onClick={() => {
            if (place.latitude && place.longitude) {
              window.open(
                `https://map.kakao.com/link/map/${encodeURIComponent(place.name)},${place.latitude},${place.longitude}`,
                "_blank",
              )
            }
          }}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          카카오맵에서 보기
        </Button>
      </div>
    </div>
  )
}
