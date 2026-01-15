"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"
import { MapPin, Search, Navigation } from "lucide-react"

interface OnboardingModalProps {
  onComplete: (nickname: string, location: string, coordinates?: { lat: number; lng: number }) => void
}

declare global {
  interface Window {
    daum: {
      Postcode: new (config: {
        oncomplete: (data: {
          address: string
          roadAddress: string
          jibunAddress: string
          zonecode: string
        }) => void
      }) => { open: () => void }
    }
  }
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [nickname, setNickname] = useState("")
  const [location, setLocation] = useState("")
  const [coordinates, setCoordinates] = useState<{ lat: number; lng: number } | null>(null)
  const [isLoadingGPS, setIsLoadingGPS] = useState(false)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // 다음 우편번호 스크립트 로드
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"
    script.async = true
    script.onload = () => setScriptLoaded(true)
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  const handleNext = () => {
    if (step === 1 && nickname.trim()) {
      setStep(2)
    } else if (step === 2 && location.trim()) {
      onComplete(nickname.trim(), location.trim(), coordinates || undefined)
    }
  }

  // 다음 우편번호 검색
  const handleAddressSearch = () => {
    if (!scriptLoaded || !window.daum) return

    new window.daum.Postcode({
      oncomplete: async (data) => {
        const address = data.roadAddress || data.jibunAddress
        setLocation(address)

        // 카카오 API로 좌표 변환 시도
        try {
          const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
          if (response.ok) {
            const result = await response.json()
            if (result.lat && result.lng) {
              setCoordinates({ lat: result.lat, lng: result.lng })
            }
          }
        } catch (error) {
          console.error("좌표 변환 실패:", error)
        }
      },
    }).open()
  }

  // 현재 위치 가져오기
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("이 브라우저에서는 위치 정보를 사용할 수 없습니다.")
      return
    }

    setIsLoadingGPS(true)

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords
        setCoordinates({ lat: latitude, lng: longitude })

        // 역지오코딩으로 주소 변환
        try {
          const response = await fetch(`/api/reverse-geocode?lat=${latitude}&lng=${longitude}`)
          if (response.ok) {
            const result = await response.json()
            if (result.address) {
              setLocation(result.address)
            } else {
              setLocation(`위도: ${latitude.toFixed(6)}, 경도: ${longitude.toFixed(6)}`)
            }
          } else {
            setLocation(`위도: ${latitude.toFixed(6)}, 경도: ${longitude.toFixed(6)}`)
          }
        } catch (error) {
          console.error("역지오코딩 실패:", error)
          setLocation(`위도: ${latitude.toFixed(6)}, 경도: ${longitude.toFixed(6)}`)
        }

        setIsLoadingGPS(false)
      },
      (error) => {
        console.error("위치 정보 가져오기 실패:", error)
        alert("위치 정보를 가져올 수 없습니다. 주소 검색을 이용해주세요.")
        setIsLoadingGPS(false)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  return (
    <div className="fixed inset-0 bg-kakao-chat-bg flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* 헤더 */}
        <div className="bg-kakao-yellow px-6 py-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white flex items-center justify-center overflow-hidden">
            <Image
              src="/cute-yellow-cat-chunsik-kakao-character-smiling.jpg"
              alt="춘식"
              width={80}
              height={80}
              className="object-cover"
            />
          </div>
          <h1 className="text-xl font-bold text-kakao-dark">안녕하세요!</h1>
          <p className="text-sm text-kakao-dark/80 mt-1">춘식이와 함께 모임 장소를 찾아봐요</p>
        </div>

        {/* 폼 */}
        <div className="p-6">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="nickname" className="text-kakao-dark font-medium">
                  닉네임을 알려주세요
                </Label>
                <Input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="예: 홍길동"
                  className="mt-2"
                  autoFocus
                />
              </div>
              <Button
                onClick={handleNext}
                disabled={!nickname.trim()}
                className="w-full bg-kakao-yellow hover:bg-kakao-yellow/90 text-kakao-dark font-medium"
              >
                다음
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="location" className="text-kakao-dark font-medium">
                  출발 위치를 알려주세요
                </Label>
                <p className="text-xs text-gray-500 mt-1">정확한 주소가 있으면 이동 시간 계산이 정확해져요</p>

                {/* 주소 입력 필드 */}
                <div className="mt-2 relative">
                  <Input
                    id="location"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="주소 검색 또는 직접 입력"
                    className="pr-10"
                    readOnly
                    onClick={handleAddressSearch}
                  />
                  <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>

                {/* 좌표 표시 */}
                {coordinates && (
                  <p className="text-xs text-green-600 mt-1">
                    좌표: {coordinates.lat.toFixed(6)}, {coordinates.lng.toFixed(6)}
                  </p>
                )}

                {/* 버튼들 */}
                <div className="flex gap-2 mt-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddressSearch}
                    disabled={!scriptLoaded}
                    className="flex-1 text-sm bg-transparent"
                  >
                    <Search className="w-4 h-4 mr-1" />
                    주소 검색
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGetCurrentLocation}
                    disabled={isLoadingGPS}
                    className="flex-1 text-sm bg-transparent"
                  >
                    <Navigation className="w-4 h-4 mr-1" />
                    {isLoadingGPS ? "확인 중..." : "현재 위치"}
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  이전
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!location.trim()}
                  className="flex-1 bg-kakao-yellow hover:bg-kakao-yellow/90 text-kakao-dark font-medium"
                >
                  시작하기
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
