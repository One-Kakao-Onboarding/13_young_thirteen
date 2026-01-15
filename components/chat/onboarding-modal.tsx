"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Image from "next/image"

interface OnboardingModalProps {
  onComplete: (nickname: string, location: string) => void
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1)
  const [nickname, setNickname] = useState("")
  const [location, setLocation] = useState("")

  const handleNext = () => {
    if (step === 1 && nickname.trim()) {
      setStep(2)
    } else if (step === 2 && location.trim()) {
      onComplete(nickname.trim(), location.trim())
    }
  }

  return (
    <div className="fixed inset-0 bg-kakao-chat-bg flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* 헤더 */}
        <div className="bg-kakao-yellow px-6 py-8 text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white flex items-center justify-center overflow-hidden">
            <Image src="/cute-yellow-cat-chunsik-kakao-character-smiling.jpg" alt="춘식" width={80} height={80} className="object-cover" />
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
                  거주 지역을 알려주세요
                </Label>
                <p className="text-xs text-gray-500 mt-1">모임 장소 추천에 활용됩니다</p>
                <Input
                  id="location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="예: 강남, 종로, 인천"
                  className="mt-2"
                  autoFocus
                />
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
