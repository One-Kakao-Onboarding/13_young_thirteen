import { type NextRequest, NextResponse } from "next/server"
import { getCacheKey, getFromCache, setToCache } from "@/lib/route-cache"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const startLat = searchParams.get("startLat")
  const startLng = searchParams.get("startLng")
  const endLat = searchParams.get("endLat")
  const endLng = searchParams.get("endLng")

  if (!startLat || !startLng || !endLat || !endLng) {
    return NextResponse.json({ error: "Missing coordinates" }, { status: 400 })
  }

  const cacheKey = getCacheKey(+startLat, +startLng, +endLat, +endLng)
  const cached = getFromCache(cacheKey)
  if (cached) {
    console.log("[v0] API Route Cache HIT:", cacheKey)
    return NextResponse.json({
      duration: cached.duration,
      transferCount: cached.transferCount,
      walkTime: cached.walkTime,
      pathType: cached.pathType,
      payment: cached.payment,
      steps: cached.steps,
      fromCache: true,
    })
  }

  const apiKey = process.env.ODSAY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: "ODsay API key not configured" }, { status: 500 })
  }

  const origin = request.headers.get("origin") || request.headers.get("referer") || "https://v0.dev"

  const url = `https://api.odsay.com/v1/api/searchPubTransPathT?SX=${startLng}&SY=${startLat}&EX=${endLng}&EY=${endLat}&apiKey=${encodeURIComponent(apiKey)}`

  try {
    const res = await fetch(url, {
      headers: {
        Referer: origin,
        Origin: origin,
      },
    })

    const data = await res.json()

    if (data.error || !data.result?.path?.[0]) {
      return NextResponse.json({ error: data.error || "No path found" }, { status: 400 })
    }

    const path = data.result.path[0]
    const info = path.info

    let pathType: "subway" | "bus" | "subway+bus" = "subway+bus"
    if (path.pathType === 1) pathType = "subway"
    else if (path.pathType === 2) pathType = "bus"

    const steps: Array<{
      type: "walk" | "subway" | "bus"
      startName?: string
      endName?: string
      lineName?: string
      sectionTime: number
      stationCount?: number
      graphPos?: Array<{ lat: number; lng: number }>
    }> = []

    if (path.subPath) {
      for (const sub of path.subPath) {
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
    }

    const result = {
      duration: info.totalTime,
      transferCount: info.busTransitCount + info.subwayTransitCount,
      walkTime: info.totalWalk,
      pathType,
      payment: info.payment,
      steps,
    }

    setToCache(cacheKey, result)
    console.log("[v0] API Route Cached:", cacheKey)

    return NextResponse.json(result)
  } catch (err) {
    console.log("[v0] ODsay fetch error:", err)
    return NextResponse.json({ error: "Failed to fetch route" }, { status: 500 })
  }
}
