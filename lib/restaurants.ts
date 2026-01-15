import restaurantsData from "@/data/restaurants.json"

export interface Restaurant {
  name: string
  category: string
  address: string
  latitude: number
  longitude: number
  description: string
  tags: string
  image_url: string
  review_count: number
  region: string
  price_range?: string
  convenience?: string
}

const restaurants: Restaurant[] = restaurantsData as Restaurant[]

// 지역별 필터링
export function filterByRegion(region: string): Restaurant[] {
  const regionLower = region.toLowerCase()
  return restaurants.filter((r) => {
    const regionMatch = r.region.toLowerCase().includes(regionLower)
    const addressMatch = r.address.toLowerCase().includes(regionLower)
    return regionMatch || addressMatch
  })
}

// 카테고리별 필터링
export function filterByCategory(category: string): Restaurant[] {
  const categoryLower = category.toLowerCase()
  return restaurants.filter((r) => r.category.toLowerCase().includes(categoryLower))
}

// 태그별 필터링 (데이트, 친구, 회식 등)
export function filterByTag(tag: string): Restaurant[] {
  const tagLower = tag.toLowerCase()
  return restaurants.filter((r) => r.tags.toLowerCase().includes(tagLower))
}

// 복합 필터링
export function searchRestaurants(options: {
  region?: string
  category?: string
  purpose?: string
  keyword?: string
}): Restaurant[] {
  let results = [...restaurants]

  if (options.region) {
    const regionLower = options.region.toLowerCase().trim()
    results = results.filter((r) => {
      const restaurantRegion = r.region.toLowerCase()
      // 정확히 일치하거나, 포함 관계 체크
      return (
        restaurantRegion === regionLower ||
        restaurantRegion.includes(regionLower) ||
        regionLower.includes(restaurantRegion) ||
        r.address.toLowerCase().includes(regionLower)
      )
    })
    console.log("[v0] After region filter:", results.length, "results for region:", options.region)
  }

  if (options.category) {
    const categoryLower = options.category.toLowerCase().trim()
    results = results.filter((r) => {
      const restaurantCategory = r.category.toLowerCase()
      return restaurantCategory.includes(categoryLower) || categoryLower.includes(restaurantCategory)
    })
    console.log("[v0] After category filter:", results.length, "results for category:", options.category)
  }

  if (options.purpose) {
    const purposeLower = options.purpose.toLowerCase()
    results = results.filter((r) => r.tags.toLowerCase().includes(purposeLower))
  }

  if (options.keyword) {
    const keywordLower = options.keyword.toLowerCase()
    results = results.filter((r) => {
      return (
        r.name.toLowerCase().includes(keywordLower) ||
        r.category.toLowerCase().includes(keywordLower) ||
        r.description.toLowerCase().includes(keywordLower) ||
        r.tags.toLowerCase().includes(keywordLower)
      )
    })
  }

  // 리뷰 수로 정렬 (인기순)
  results.sort((a, b) => b.review_count - a.review_count)

  return results
}

// 중간 지점에서 가장 가까운 맛집 찾기
export function findNearestRestaurants(
  centerLat: number,
  centerLng: number,
  options?: { category?: string; purpose?: string; limit?: number },
): Restaurant[] {
  let results = [...restaurants]

  if (options?.category) {
    const categoryLower = options.category.toLowerCase()
    results = results.filter((r) => r.category.toLowerCase().includes(categoryLower))
  }

  if (options?.purpose) {
    const purposeLower = options.purpose.toLowerCase()
    results = results.filter((r) => r.tags.toLowerCase().includes(purposeLower))
  }

  // 거리 계산 및 정렬
  results = results
    .map((r) => ({
      ...r,
      distance: calculateDistance(centerLat, centerLng, r.latitude, r.longitude),
    }))
    .sort((a, b) => a.distance - b.distance)

  return results.slice(0, options?.limit || 4)
}

// Haversine 거리 계산 (km)
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

export function calculateTravelTimeVariance(travelTimes: number[]): number {
  if (travelTimes.length === 0) return Number.POSITIVE_INFINITY
  if (travelTimes.length === 1) return 0

  const mean = travelTimes.reduce((a, b) => a + b, 0) / travelTimes.length
  const squaredDiffs = travelTimes.map((t) => Math.pow(t - mean, 2))
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / travelTimes.length
  return Math.sqrt(variance) // 표준편차 반환
}

export function calculateRecommendationScore(
  restaurant: Restaurant,
  memberTravelTimes: number[],
): {
  totalScore: number
  popularityScore: number
  equalityScore: number
  avgTravelTime: number
  travelVariance: number
} {
  // 1. 인지도 점수 (리뷰 수 기반, 0-50점)
  const maxReviewCount = 50000 // 정규화 기준
  const popularityScore = Math.min(restaurant.review_count / maxReviewCount, 1) * 50

  // 2. 이동시간 균등성 점수 (표준편차가 낮을수록 높은 점수, 0-50점)
  const travelVariance = calculateTravelTimeVariance(memberTravelTimes)
  // 표준편차 0분 = 50점, 30분 이상 = 0점
  const equalityScore = Math.max(0, 50 - (travelVariance / 30) * 50)

  // 평균 이동시간
  const avgTravelTime =
    memberTravelTimes.length > 0 ? memberTravelTimes.reduce((a, b) => a + b, 0) / memberTravelTimes.length : 0

  return {
    totalScore: popularityScore + equalityScore,
    popularityScore: Math.round(popularityScore),
    equalityScore: Math.round(equalityScore),
    avgTravelTime: Math.round(avgTravelTime),
    travelVariance: Math.round(travelVariance),
  }
}

export function sortByRecommendationScore(
  restaurants: Array<Restaurant & { memberTravelInfo?: Array<{ duration: number }> }>,
): Array<
  Restaurant & {
    memberTravelInfo?: Array<{ duration: number }>
    scoreDetails?: ReturnType<typeof calculateRecommendationScore>
  }
> {
  return restaurants
    .map((r) => {
      const times = r.memberTravelInfo?.map((m) => m.duration) || []
      const scoreDetails = calculateRecommendationScore(r, times)
      return { ...r, scoreDetails }
    })
    .sort((a, b) => {
      return (b.scoreDetails?.totalScore || 0) - (a.scoreDetails?.totalScore || 0)
    })
}

// 모든 지역 목록 반환
export function getAllRegions(): string[] {
  const regions = new Set(restaurants.map((r) => r.region))
  return Array.from(regions)
}

// 모든 카테고리 목록 반환
export function getAllCategories(): string[] {
  const categories = new Set(restaurants.map((r) => r.category))
  return Array.from(categories)
}

export function findRestaurantByName(name: string): Restaurant | null {
  const nameLower = name.toLowerCase().trim()

  // 정확히 일치
  let found = restaurants.find((r) => r.name.toLowerCase() === nameLower)
  if (found) return found

  // 부분 일치
  found = restaurants.find((r) => r.name.toLowerCase().includes(nameLower) || nameLower.includes(r.name.toLowerCase()))
  return found || null
}

export function getAllRestaurantNames(): string[] {
  return restaurants.map((r) => r.name)
}

export function getRandomRestaurants(count = 4, category?: string): Restaurant[] {
  let pool = [...restaurants]

  if (category) {
    const categoryLower = category.toLowerCase().trim()
    pool = pool.filter((r) => r.category.toLowerCase().includes(categoryLower))
  }

  // Fisher-Yates 셔플
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }

  return pool.slice(0, count)
}
