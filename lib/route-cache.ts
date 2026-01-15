// 경로 계산 결과 캐싱을 위한 유틸리티

interface CachedRoute {
  duration: number
  transferCount: number
  walkTime: number
  pathType: "subway" | "bus" | "subway+bus" | "unknown"
  payment: number
  steps: Array<{
    type: "walk" | "subway" | "bus"
    startName?: string
    endName?: string
    lineName?: string
    sectionTime: number
    stationCount?: number
    graphPos?: Array<{ lat: number; lng: number }>
  }>
  cachedAt: number
}

// 메모리 캐시 (서버 재시작 시 초기화됨)
const routeCache = new Map<string, CachedRoute>()

// 캐시 유효 시간 (1시간)
const CACHE_TTL = 60 * 60 * 1000

// 좌표를 반올림하여 캐시 키 생성 (소수점 3자리 = 약 100m 단위)
function roundCoord(coord: number): number {
  return Math.round(coord * 1000) / 1000
}

export function getCacheKey(startLat: number, startLng: number, endLat: number, endLng: number): string {
  return `${roundCoord(startLat)},${roundCoord(startLng)}->${roundCoord(endLat)},${roundCoord(endLng)}`
}

export function getFromCache(key: string): CachedRoute | null {
  const cached = routeCache.get(key)
  if (!cached) return null

  // TTL 체크
  if (Date.now() - cached.cachedAt > CACHE_TTL) {
    routeCache.delete(key)
    return null
  }

  return cached
}

export function setToCache(key: string, route: Omit<CachedRoute, "cachedAt">): void {
  routeCache.set(key, {
    ...route,
    cachedAt: Date.now(),
  })

  // 캐시 크기 제한 (최대 500개)
  if (routeCache.size > 500) {
    const firstKey = routeCache.keys().next().value
    if (firstKey) routeCache.delete(firstKey)
  }
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: routeCache.size,
    keys: Array.from(routeCache.keys()),
  }
}
