import { getCacheKey, getFromCache, setToCache } from "./route-cache"

const ODSAY_API_KEY = process.env.ODSAY_API_KEY

export interface RouteStep {
  type: "walk" | "subway" | "bus"
  startName?: string
  endName?: string
  lineName?: string
  sectionTime: number
  stationCount?: number
  graphPos?: Array<{ lat: number; lng: number }>
}

export interface TransitInfo {
  duration: number
  transferCount: number
  walkTime: number
  payment: number
  pathType: "subway" | "bus" | "subway+bus"
  steps: RouteStep[]
}

export async function getTransitRoute(
  startLat: number,
  startLng: number,
  endLat: number,
  endLng: number,
): Promise<TransitInfo | null> {
  const cacheKey = getCacheKey(startLat, startLng, endLat, endLng)
  const cached = getFromCache(cacheKey)
  if (cached) {
    console.log("[v0] Cache HIT for route:", cacheKey)
    return {
      duration: cached.duration,
      transferCount: cached.transferCount,
      walkTime: cached.walkTime,
      payment: cached.payment,
      pathType: cached.pathType as "subway" | "bus" | "subway+bus",
      steps: cached.steps,
    }
  }
  console.log("[v0] Cache MISS for route:", cacheKey)

  if (!ODSAY_API_KEY) {
    console.log("[v0] ODsay API key is not configured")
    return null
  }

  try {
    const url = `https://api.odsay.com/v1/api/searchPubTransPathT?SX=${startLng}&SY=${startLat}&EX=${endLng}&EY=${endLat}&apiKey=${encodeURIComponent(ODSAY_API_KEY)}`

    const response = await fetch(url, {
      headers: {
        Referer: "https://v0.dev",
        Origin: "https://v0.dev",
      },
    })

    const responseText = await response.text()
    let data
    try {
      data = JSON.parse(responseText)
    } catch (e) {
      return null
    }

    if (data.error || !data.result?.path || data.result.path.length === 0) {
      return null
    }

    const bestPath = data.result.path[0]
    const info = bestPath.info

    let pathType: "subway" | "bus" | "subway+bus"
    switch (bestPath.pathType) {
      case 1:
        pathType = "subway"
        break
      case 2:
        pathType = "bus"
        break
      default:
        pathType = "subway+bus"
    }

    const steps: RouteStep[] = []
    const subPath = bestPath.subPath || []

    for (const sub of subPath) {
      // graphPos 파싱 (정류장 좌표)
      let graphPos: Array<{ lat: number; lng: number }> | undefined
      if (sub.passStopList?.stations) {
        graphPos = sub.passStopList.stations.map((s: any) => ({
          lat: Number.parseFloat(s.y),
          lng: Number.parseFloat(s.x),
        }))
      }

      if (sub.trafficType === 3 && sub.sectionTime > 0) {
        steps.push({
          type: "walk",
          sectionTime: sub.sectionTime,
          startName: sub.startName,
          endName: sub.endName,
        })
      } else if (sub.trafficType === 1) {
        steps.push({
          type: "subway",
          startName: sub.startName,
          endName: sub.endName,
          lineName: sub.lane?.[0]?.name || "지하철",
          sectionTime: sub.sectionTime,
          stationCount: sub.stationCount,
          graphPos,
        })
      } else if (sub.trafficType === 2) {
        steps.push({
          type: "bus",
          startName: sub.startName,
          endName: sub.endName,
          lineName: sub.lane?.[0]?.busNo || "버스",
          sectionTime: sub.sectionTime,
          stationCount: sub.stationCount,
          graphPos,
        })
      }
    }

    const result: TransitInfo = {
      duration: info.totalTime,
      transferCount: Math.max(0, info.busTransitCount + info.subwayTransitCount - 1),
      walkTime: Math.round(info.totalWalk / 60),
      payment: info.payment,
      pathType,
      steps,
    }

    setToCache(cacheKey, result)
    console.log("[v0] Cached route:", cacheKey)

    return result
  } catch (error) {
    console.error("[v0] ODsay API fetch error:", error)
    return null
  }
}

export async function getTransitRoutesBatch(
  routes: Array<{ startLat: number; startLng: number; endLat: number; endLng: number; id: string }>,
): Promise<Map<string, TransitInfo | null>> {
  console.log(`[v0] Batch fetching ${routes.length} routes in parallel`)

  const results = await Promise.all(
    routes.map(async (route) => {
      const result = await getTransitRoute(route.startLat, route.startLng, route.endLat, route.endLng)
      return { id: route.id, result }
    }),
  )

  const resultMap = new Map<string, TransitInfo | null>()
  for (const { id, result } of results) {
    resultMap.set(id, result)
  }

  console.log(`[v0] Batch complete: ${resultMap.size} results`)
  return resultMap
}
