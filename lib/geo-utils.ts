// 좌표 변환용 간이 매핑 (카카오 API 없이 사용)
const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  // 서울 주요 지역
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
  "을지로/충무로": { lat: 37.5662, lng: 126.9916 },
  충무로: { lat: 37.5612, lng: 126.9944 },
  이태원: { lat: 37.5347, lng: 126.9945 },
  "이태원/한남": { lat: 37.5347, lng: 126.9945 },
  한남: { lat: 37.5347, lng: 127.0063 },
  한남동: { lat: 37.5347, lng: 127.0063 },
  신촌: { lat: 37.5596, lng: 126.9428 },
  이대: { lat: 37.5569, lng: 126.9462 },
  신사: { lat: 37.5163, lng: 127.0204 },
  "압구정/신사": { lat: 37.5217, lng: 127.0245 },
  압구정: { lat: 37.5271, lng: 127.0286 },
  청담: { lat: 37.5199, lng: 127.0472 },
  삼성: { lat: 37.5089, lng: 127.0634 },
  삼성역: { lat: 37.5089, lng: 127.0634 },
  잠실: { lat: 37.5133, lng: 127.1001 },
  "잠실/송리단길": { lat: 37.5133, lng: 127.1001 },
  송리단길: { lat: 37.5056, lng: 127.1123 },
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
  "망원/합정": { lat: 37.5529, lng: 126.9121 },
  상수: { lat: 37.5478, lng: 126.9227 },
  광화문: { lat: 37.5759, lng: 126.9769 },
  "서촌/광화문": { lat: 37.5778, lng: 126.9741 },
  북촌: { lat: 37.5826, lng: 126.9831 },
  서촌: { lat: 37.5796, lng: 126.9712 },
  익선동: { lat: 37.5743, lng: 126.9887 },
  인사동: { lat: 37.5743, lng: 126.985 },

  // 경기도
  수원: { lat: 37.2636, lng: 127.0286 },
  수원역: { lat: 37.2658, lng: 127.0014 },
  용인: { lat: 37.2411, lng: 127.1776 },
  성남: { lat: 37.4201, lng: 127.1265 },
  분당: { lat: 37.3825, lng: 127.1193 },
  판교: { lat: 37.3947, lng: 127.1112 },
  일산: { lat: 37.6593, lng: 126.7699 },
  고양: { lat: 37.6584, lng: 126.832 },
  부천: { lat: 37.5035, lng: 126.766 },
  안양: { lat: 37.3943, lng: 126.9568 },
  평촌: { lat: 37.3894, lng: 126.9512 },
  광명: { lat: 37.4786, lng: 126.8644 },
  안산: { lat: 37.3219, lng: 126.8309 },
  의정부: { lat: 37.7381, lng: 127.0337 },
  남양주: { lat: 37.636, lng: 127.2165 },
  화성: { lat: 37.1997, lng: 126.8313 },
  동탄: { lat: 37.2005, lng: 127.0969 },
  파주: { lat: 37.7126, lng: 126.7616 },
  김포: { lat: 37.6152, lng: 126.7156 },
  광주: { lat: 37.4295, lng: 127.2551 }, // 경기도 광주
  하남: { lat: 37.5393, lng: 127.2148 },
  구리: { lat: 37.5944, lng: 127.1297 },
  오산: { lat: 37.1499, lng: 127.0773 },
  시흥: { lat: 37.38, lng: 126.8031 },
  군포: { lat: 37.3616, lng: 126.9352 },
  의왕: { lat: 37.3448, lng: 126.9682 },
  과천: { lat: 37.4292, lng: 126.9876 },

  // 인천
  인천: { lat: 37.4563, lng: 126.7052 },
  부평: { lat: 37.5074, lng: 126.7218 },
  송도: { lat: 37.3833, lng: 126.6572 },
}

// 두 좌표 사이의 거리 계산 (Haversine formula)
export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371 // 지구 반지름 (km)
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c // km
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180)
}

// 지역명으로 좌표 찾기
export function getCoordsByLocation(location: string): { lat: number; lng: number } | null {
  // 정확한 매칭
  if (LOCATION_COORDS[location]) {
    return LOCATION_COORDS[location]
  }

  // 부분 매칭 (예: "서울 강남구" -> "강남")
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    if (location.includes(key) || key.includes(location)) {
      return coords
    }
  }

  const normalizedLocation = location.replace(/[\s시구동역]/g, "")
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    const normalizedKey = key.replace(/[\s시구동역]/g, "")
    if (normalizedLocation.includes(normalizedKey) || normalizedKey.includes(normalizedLocation)) {
      return coords
    }
  }

  console.log(`[v0] Could not find coords for location: ${location}, using Seoul center as fallback`)
  return { lat: 37.5665, lng: 126.978 } // 서울 시청
}

export function estimateTravelTime(distanceKm: number): {
  duration: number // 분
  transport: "transit"
} {
  // 대중교통 기준: 평균 시속 25km/h + 환승/대기 시간 10~15분
  const baseTime = Math.round((distanceKm / 25) * 60)
  const waitTime = distanceKm > 5 ? 15 : 10
  const duration = Math.max(10, baseTime + waitTime)
  return { duration, transport: "transit" }
}
