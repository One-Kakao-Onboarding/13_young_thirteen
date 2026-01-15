import PlaceDetailContent from "./place-detail-content"

interface PageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function PlaceDetailPage({ params, searchParams }: PageProps) {
  const { id } = await params
  const query = await searchParams

  let memberTravelInfo = undefined
  if (typeof query.memberTravel === "string") {
    try {
      memberTravelInfo = JSON.parse(decodeURIComponent(query.memberTravel))
    } catch {
      memberTravelInfo = undefined
    }
  }

  const roomId = typeof query.roomId === "string" ? query.roomId : undefined

  const placeData = {
    name: typeof query.name === "string" ? decodeURIComponent(query.name) : "",
    address: typeof query.address === "string" ? decodeURIComponent(query.address) : "",
    category: typeof query.category === "string" ? decodeURIComponent(query.category) : undefined,
    description: typeof query.description === "string" ? decodeURIComponent(query.description) : undefined,
    tags: typeof query.tags === "string" ? decodeURIComponent(query.tags) : undefined,
    image_url: typeof query.image_url === "string" ? decodeURIComponent(query.image_url) : undefined,
    review_count: typeof query.review_count === "string" ? Number.parseInt(query.review_count) : undefined,
    latitude: typeof query.lat === "string" ? Number.parseFloat(query.lat) : undefined,
    longitude: typeof query.lng === "string" ? Number.parseFloat(query.lng) : undefined,
    memberTravelInfo,
  }

  return <PlaceDetailContent id={id} place={placeData} roomId={roomId} />
}
