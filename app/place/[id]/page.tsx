import { Suspense } from "react"
import PlaceDetailContent from "./place-detail-content"

export default function PlaceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-kakao-bg flex items-center justify-center">
          <p className="text-kakao-dark">로딩 중...</p>
        </div>
      }
    >
      <PlaceDetailContent params={params} />
    </Suspense>
  )
}
