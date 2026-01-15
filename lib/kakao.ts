// 카카오맵 API 유틸리티

const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY

interface KakaoPlace {
  id: string
  place_name: string
  category_name: string
  address_name: string
  road_address_name: string
  phone: string
  place_url: string
  x: string // longitude
  y: string // latitude
}

interface KakaoSearchResponse {
  documents: KakaoPlace[]
  meta: {
    total_count: number
    pageable_count: number
    is_end: boolean
  }
}

interface PlaceRecommendation {
  name: string
  address: string
  url: string
  category: string
  phone?: string
  x: string
  y: string
}

// 키워드로 장소 검색
export async function searchPlacesByKeyword(
  keyword: string,
  region?: string,
  category?: string,
): Promise<PlaceRecommendation[]> {
  if (!KAKAO_REST_API_KEY) {
    throw new Error("KAKAO_REST_API_KEY is not set")
  }

  const query = region ? `${region} ${keyword}` : keyword
  const categoryGroupCode = category || "FD6" // FD6: 음식점

  const url = new URL("https://dapi.kakao.com/v2/local/search/keyword.json")
  url.searchParams.set("query", query)
  url.searchParams.set("category_group_code", categoryGroupCode)
  url.searchParams.set("size", "15") // 더 많이 가져와서 필터링

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Kakao API error: ${response.status}`)
  }

  const data: KakaoSearchResponse = await response.json()

  return data.documents.map((place) => ({
    name: place.place_name,
    address: place.road_address_name || place.address_name,
    url: place.place_url,
    category: place.category_name.split(">").pop()?.trim() || "음식점",
    phone: place.phone,
    x: place.x,
    y: place.y,
  }))
}

// 지역명으로 좌표 검색
export async function getCoordinatesByAddress(address: string): Promise<{ x: string; y: string } | null> {
  if (!KAKAO_REST_API_KEY) {
    throw new Error("KAKAO_REST_API_KEY is not set")
  }

  const url = new URL("https://dapi.kakao.com/v2/local/search/address.json")
  url.searchParams.set("query", address)

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Kakao API error: ${response.status}`)
  }

  const data = await response.json()

  if (data.documents.length === 0) {
    // 키워드 검색으로 재시도
    const keywordUrl = new URL("https://dapi.kakao.com/v2/local/search/keyword.json")
    keywordUrl.searchParams.set("query", address)
    keywordUrl.searchParams.set("size", "1")

    const keywordResponse = await fetch(keywordUrl.toString(), {
      headers: {
        Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
      },
    })

    const keywordData = await keywordResponse.json()

    if (keywordData.documents.length > 0) {
      return {
        x: keywordData.documents[0].x,
        y: keywordData.documents[0].y,
      }
    }

    return null
  }

  return {
    x: data.documents[0].x,
    y: data.documents[0].y,
  }
}

// 두 지점 사이의 대략적인 이동 시간 계산 (직선 거리 기반)
export function estimateTravelTime(origin: { x: string; y: string }, destination: { x: string; y: string }): number {
  const x1 = Number.parseFloat(origin.x)
  const y1 = Number.parseFloat(origin.y)
  const x2 = Number.parseFloat(destination.x)
  const y2 = Number.parseFloat(destination.y)

  // Haversine formula
  const R = 6371 // 지구 반경 (km)
  const dLat = ((y2 - y1) * Math.PI) / 180
  const dLon = ((x2 - x1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((y1 * Math.PI) / 180) * Math.cos((y2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c

  // 대중교통 평균 속도 약 30km/h로 계산 (대기시간 포함)
  const travelTimeMinutes = Math.round((distance / 30) * 60)

  return Math.max(travelTimeMinutes, 10) // 최소 10분
}

// 중간 지점 찾기 (여러 좌표의 중심점)
export function findMidpoint(coordinates: Array<{ x: string; y: string }>): { x: string; y: string } {
  const sumX = coordinates.reduce((acc, coord) => acc + Number.parseFloat(coord.x), 0)
  const sumY = coordinates.reduce((acc, coord) => acc + Number.parseFloat(coord.y), 0)

  return {
    x: (sumX / coordinates.length).toString(),
    y: (sumY / coordinates.length).toString(),
  }
}
