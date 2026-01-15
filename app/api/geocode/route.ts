import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "주소가 필요합니다" }, { status: 400 })
  }

  const KAKAO_REST_API_KEY = process.env.KAKAO_REST_API_KEY

  if (!KAKAO_REST_API_KEY) {
    return NextResponse.json({ error: "카카오 API 키가 설정되지 않았습니다" }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`,
      {
        headers: {
          Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
        },
      },
    )

    if (!response.ok) {
      throw new Error("카카오 API 호출 실패")
    }

    const data = await response.json()

    if (data.documents && data.documents.length > 0) {
      const doc = data.documents[0]
      return NextResponse.json({
        lat: Number.parseFloat(doc.y),
        lng: Number.parseFloat(doc.x),
        address: doc.address_name || address,
      })
    }

    return NextResponse.json({ error: "주소를 찾을 수 없습니다" }, { status: 404 })
  } catch (error) {
    console.error("지오코딩 오류:", error)
    return NextResponse.json({ error: "지오코딩 실패" }, { status: 500 })
  }
}
