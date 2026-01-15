import type { NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const sx = searchParams.get("sx")
  const sy = searchParams.get("sy")
  const ex = searchParams.get("ex")
  const ey = searchParams.get("ey")

  if (!sx || !sy || !ex || !ey) {
    return Response.json({ error: "Missing coordinates" }, { status: 400 })
  }

  const apiKey = process.env.ODSAY_API_KEY
  if (!apiKey) {
    return Response.json({ error: "ODsay API key not configured" }, { status: 500 })
  }

  try {
    const url = `https://api.odsay.com/v1/api/searchPubTransPathT?SX=${sx}&SY=${sy}&EX=${ex}&EY=${ey}&apiKey=${encodeURIComponent(apiKey)}`

    console.log("[v0] ODsay API URL:", url)

    const response = await fetch(url, {
      headers: {
        Referer: "https://v0.dev",
      },
    })

    const data = await response.json()
    console.log("[v0] ODsay raw response:", JSON.stringify(data).slice(0, 500))

    if (data.error || !data.result?.path) {
      console.log("[v0] ODsay API error or no path:", JSON.stringify(data.error || data))
      return Response.json({
        duration: 0,
        steps: [],
        error: data.error?.message || "No path found",
      })
    }

    // 첫 번째 경로 사용
    const path = data.result.path[0]
    const info = path.info

    // 경로 상세 정보 파싱
    const steps: Array<{
      type: "walk" | "subway" | "bus"
      duration: number
      description: string
      lineNumber?: string
      startName?: string
      endName?: string
      stationCount?: number
    }> = []

    if (path.subPath) {
      for (const sub of path.subPath) {
        if (sub.trafficType === 3) {
          // 도보
          if (sub.sectionTime > 0) {
            steps.push({
              type: "walk",
              duration: sub.sectionTime,
              description: `도보 ${sub.sectionTime}분`,
            })
          }
        } else if (sub.trafficType === 1) {
          // 지하철
          steps.push({
            type: "subway",
            duration: sub.sectionTime,
            description: `${sub.lane?.[0]?.name || "지하철"}`,
            lineNumber: sub.lane?.[0]?.name,
            startName: sub.startName,
            endName: sub.endName,
            stationCount: sub.stationCount,
          })
        } else if (sub.trafficType === 2) {
          // 버스
          steps.push({
            type: "bus",
            duration: sub.sectionTime,
            description: `${sub.lane?.[0]?.busNo || "버스"}번`,
            lineNumber: sub.lane?.[0]?.busNo,
            startName: sub.startName,
            endName: sub.endName,
            stationCount: sub.stationCount,
          })
        }
      }
    }

    const result = {
      duration: info.totalTime,
      transferCount: info.busTransitCount + info.subwayTransitCount,
      walkTime: info.totalWalk,
      payment: info.payment,
      pathType:
        info.busTransitCount > 0 && info.subwayTransitCount > 0
          ? "bus+subway"
          : info.subwayTransitCount > 0
            ? "subway"
            : "bus",
      steps,
    }

    console.log("[v0] ODsay parsed result:", JSON.stringify(result))
    return Response.json(result)
  } catch (error) {
    console.error("[v0] ODsay fetch error:", error)
    return Response.json({ duration: 0, steps: [], error: "Fetch failed" })
  }
}
