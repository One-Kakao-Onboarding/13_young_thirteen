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
    const regionLower = options.region.toLowerCase()
    results = results.filter((r) => {
      const regionMatch = r.region.toLowerCase().includes(regionLower)
      const addressMatch = r.address.toLowerCase().includes(regionLower)
      return regionMatch || addressMatch
    })
  }

  if (options.category) {
    const categoryLower = options.category.toLowerCase()
    results = results.filter((r) => r.category.toLowerCase().includes(categoryLower))
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
