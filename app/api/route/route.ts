import { type NextRequest, NextResponse } from "next/server"

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY

export async function POST(request: NextRequest) {
  try {
    const { origin, destination } = await request.json()

    if (!KAKAO_REST_API_KEY) {
      // API 키가 없으면 직선거리 기반 예상 시간 계산
      const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng)
      const duration = Math.round((distance / 30) * 60) // 평균 30km/h 기준

      return NextResponse.json({
        duration: Math.max(duration, 5),
        distance: Math.round(distance * 1000),
      })
    }

    // 카카오 모빌리티 자동차 길찾기 API
    const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}&priority=RECOMMEND`

    const response = await fetch(url, {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    })

    if (!response.ok) {
      // API 실패 시 직선거리 기반 계산
      const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng)
      const duration = Math.round((distance / 30) * 60)

      return NextResponse.json({
        duration: Math.max(duration, 5),
        distance: Math.round(distance * 1000),
      })
    }

    const data = await response.json()

    if (data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      const summary = route.summary

      return NextResponse.json({
        duration: Math.round(summary.duration / 60), // 초 -> 분
        distance: summary.distance, // 미터
        taxiFare: summary.fare?.taxi,
        tollFare: summary.fare?.toll,
      })
    }

    // 결과가 없으면 직선거리 기반 계산
    const distance = calculateDistance(origin.lat, origin.lng, destination.lat, destination.lng)
    const duration = Math.round((distance / 30) * 60)

    return NextResponse.json({
      duration: Math.max(duration, 5),
      distance: Math.round(distance * 1000),
    })
  } catch (error) {
    console.error("Route API error:", error)
    return NextResponse.json({ error: "길찾기 정보를 가져올 수 없습니다." }, { status: 500 })
  }
}

// Haversine 공식으로 직선거리 계산 (km)
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
