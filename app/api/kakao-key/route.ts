import { NextResponse } from "next/server"

export async function GET() {
  // 서버에서 카카오 JS 키를 안전하게 전달
  const kakaoJsKey = process.env.KAKAO_JS_KEY

  if (!kakaoJsKey) {
    return NextResponse.json({ error: "Kakao JS key not configured" }, { status: 500 })
  }

  return NextResponse.json({ key: kakaoJsKey })
}
