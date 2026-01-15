import { generateText } from "ai"
import { createClient } from "@supabase/supabase-js"
import {
  searchRestaurants,
  getAllRegions,
  getAllCategories,
  getRandomRestaurants,
  sortByRecommendationScore,
  calculateTravelTimeVariance,
  findRestaurantByName,
  getAllRestaurantNames,
} from "@/lib/restaurants"
import { getCoordsByLocation, calculateDistance, estimateTravelTime } from "@/lib/geo-utils"
import { getTransitRoute } from "@/lib/odsay"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function extractKeywordsFromChat(messages: string[]): string[] {
  const keywords: string[] = []
  const foodKeywords = [
    "한식",
    "양식",
    "일식",
    "중식",
    "분식",
    "카페",
    "술집",
    "고기",
    "피자",
    "파스타",
    "초밥",
    "라멘",
    "치킨",
    "버거",
    "샐러드",
    "브런치",
    "디저트",
  ]
  const purposeKeywords = ["종강", "축하", "생일", "기념일", "회식", "데이트", "소개팅", "미팅", "모임", "만남"]
  const moodKeywords = ["분위기", "조용한", "시끄러운", "넓은", "좁은", "예쁜", "힙한", "트렌디"]

  const allText = messages.join(" ").toLowerCase()

  foodKeywords.forEach((keyword) => {
    if (allText.includes(keyword.toLowerCase())) keywords.push(keyword)
  })
  purposeKeywords.forEach((keyword) => {
    if (allText.includes(keyword.toLowerCase())) keywords.push(keyword)
  })
  moodKeywords.forEach((keyword) => {
    if (allText.includes(keyword.toLowerCase())) keywords.push(keyword)
  })

  return [...new Set(keywords)] // 중복 제거
}

function extractRecommendCount(message: string): number {
  // "1개", "한 개", "하나만", "가장 가까운" 등 -> 1개
  if (/하나|1개|한\s?개|가장\s?(가까운|좋은|괜찮은)|딱\s?하나/.test(message)) {
    return 1
  }
  // "2개", "두 개" -> 2개
  if (/2개|두\s?개/.test(message)) {
    return 2
  }
  // "3개", "세 개" -> 3개
  if (/3개|세\s?개/.test(message)) {
    return 3
  }
  // "5개", "다섯 개" -> 5개
  if (/5개|다섯\s?개/.test(message)) {
    return 5
  }
  // 기본값 4개
  return 4
}

export async function POST(request: Request) {
  try {
    const { roomId, message } = await request.json()

    const supabase = createClient(supabaseUrl, supabaseKey)

    const { data: recentMessages } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(20)

    const chatHistory = (recentMessages || []).reverse()

    const participantMessages = chatHistory.filter((m) => m.sender_id !== "chunsik" && m.sender_name !== "춘식")

    const { data: members } = await supabase.from("chat_room_members").select("user_id").eq("room_id", roomId)

    const memberIds = members?.map((m) => m.user_id) || []

    const { data: users } = await supabase
      .from("users")
      .select("id, nickname, location, latitude, longitude")
      .in("id", memberIds)

    console.log("[v0] Users data from DB:", JSON.stringify(users))

    const userLocations =
      users?.map((u) => ({
        id: u.id,
        nickname: u.nickname,
        location: u.location,
        latitude: u.latitude,
        longitude: u.longitude,
      })) || []

    console.log("[v0] User locations:", JSON.stringify(userLocations))

    const participantTexts = participantMessages.map((m) => m.content)
    const conversationContext = participantTexts.length > 0 ? participantTexts.join("\n") : "(대화 내용 없음)"

    const actualKeywords = extractKeywordsFromChat(participantTexts)
    console.log("[v0] Actual keywords from participant chat:", actualKeywords)

    // 춘식 종료 감지
    if (
      message.includes("고마워") ||
      message.includes("고생했어") ||
      message.includes("잘가") ||
      message.includes("종료")
    ) {
      await supabase.from("chat_messages").insert({
        room_id: roomId,
        sender_id: "chunsik",
        sender_name: "춘식",
        content: "알겠어, 즐거운 모임 돼! 다음에 또 불러줘",
        message_type: "text",
      })
      return Response.json({ success: true })
    }

    // 인사 표현 감지 - 간단히 응답
    if (/^(안녕|ㅎㅇ|하이|헬로|hi|hello)/.test(message.toLowerCase())) {
      await supabase.from("chat_messages").insert({
        room_id: roomId,
        sender_id: "chunsik",
        sender_name: "춘식",
        content: "어, 안녕! 모임 장소 고민되면 말해줘",
        message_type: "text",
      })
      return Response.json({ success: true })
    }

    const restaurantNames = getAllRestaurantNames()
    const infoQueryPatterns = [
      /(.+?)[\s]*(가격|가격대|얼마|비싸|비용|금액)/,
      /(.+?)[\s]*(주소|어디|위치|어딨)/,
      /(.+?)[\s]*(편의시설|시설|주차|키즈|유아|단체)/,
      /(.+?)[\s]*(정보|알려줘|뭐야|어때)/,
      /(.+?)[\s]*(리뷰|평가|후기|별점)/,
      /(.+?)[\s]*(메뉴|뭐\s?파|뭐\s?있)/,
    ]

    let foundRestaurantQuery = false
    let queriedRestaurant = null

    // 메시지에서 매장명 추출 시도
    for (const name of restaurantNames) {
      if (message.includes(name)) {
        queriedRestaurant = findRestaurantByName(name)
        if (queriedRestaurant) {
          foundRestaurantQuery = true
          break
        }
      }
    }

    // 매장 정보 조회 요청인 경우
    if (foundRestaurantQuery && queriedRestaurant) {
      const r = queriedRestaurant

      if (/가격|가격대|얼마|비싸|비용|금액/.test(message) && !/정보|알려줘/.test(message)) {
        await supabase.from("chat_messages").insert({
          room_id: roomId,
          sender_id: "chunsik",
          sender_name: "춘식",
          content: `${r.name}의 평균 가격대는 ${r.price_range || "정보 없음"}이야`,
          message_type: "text",
        })
        return Response.json({ success: true })
      } else if (/주소|어디|위치|어딨/.test(message) && !/정보|알려줘/.test(message)) {
        await supabase.from("chat_messages").insert({
          room_id: roomId,
          sender_id: "chunsik",
          sender_name: "춘식",
          content: `${r.name} 주소는 ${r.address}야`,
          message_type: "text",
        })
        return Response.json({ success: true })
      } else {
        const placeCoords =
          r.latitude && r.longitude ? { lat: r.latitude, lng: r.longitude } : getCoordsByLocation(r.region || r.address)

        // 멤버들의 이동시간 계산
        const memberCoords = userLocations.map((user) => {
          if (user.latitude && user.longitude) {
            return { ...user, coords: { lat: user.latitude, lng: user.longitude } }
          }
          const coords = getCoordsByLocation(user.location)
          return { ...user, coords }
        })

        const memberTravelInfo = await Promise.all(
          memberCoords.map(async (member) => {
            if (!member.coords || !placeCoords) {
              return {
                nickname: member.nickname,
                duration: 30,
                transferCount: 0,
                walkTime: 0,
                pathType: "unknown",
                payment: 0,
                steps: [],
                transport: "transit" as const,
                lat: undefined,
                lng: undefined,
              }
            }

            const transitInfo = await getTransitRoute(
              member.coords.lat,
              member.coords.lng,
              placeCoords.lat,
              placeCoords.lng,
            )

            if (transitInfo) {
              return {
                nickname: member.nickname,
                duration: transitInfo.duration,
                transferCount: transitInfo.transferCount,
                walkTime: transitInfo.walkTime,
                pathType: transitInfo.pathType,
                payment: transitInfo.payment,
                steps: transitInfo.steps,
                transport: "transit" as const,
                lat: member.coords.lat,
                lng: member.coords.lng,
              }
            }

            const distanceKm = calculateDistance(member.coords.lat, member.coords.lng, placeCoords.lat, placeCoords.lng)
            const { duration, transport } = estimateTravelTime(distanceKm)

            return {
              nickname: member.nickname,
              duration,
              transferCount: 0,
              walkTime: 0,
              pathType: "unknown",
              payment: 0,
              steps: [],
              transport,
              lat: member.coords.lat,
              lng: member.coords.lng,
            }
          }),
        )

        await supabase.from("chat_messages").insert({
          room_id: roomId,
          sender_id: "chunsik",
          sender_name: "춘식",
          content: `${r.name} 정보 알려줄게`,
          message_type: "text",
        })

        await supabase.from("chat_messages").insert({
          room_id: roomId,
          sender_id: "chunsik",
          sender_name: "춘식",
          content: `${r.name} 매장 정보`,
          message_type: "place_recommendation",
          metadata: {
            places: [
              {
                name: r.name,
                address: r.address,
                category: r.category,
                description: r.description,
                tags: r.tags,
                image_url: r.image_url,
                review_count: r.review_count,
                price_range: r.price_range,
                convenience: r.convenience,
                latitude: placeCoords?.lat || r.latitude,
                longitude: placeCoords?.lng || r.longitude,
                memberTravelInfo: memberTravelInfo.filter((m): m is NonNullable<typeof m> => m !== null),
                avgTravelTime: Math.round(
                  memberTravelInfo.reduce((a, b) => a + b.duration, 0) / memberTravelInfo.length,
                ),
              },
            ],
          },
        })

        return Response.json({ success: true })
      }
    }

    const availableRegions = getAllRegions().join(", ")
    const availableCategories = getAllCategories().join(", ")

    const systemPrompt = `당신은 '춘식'이라는 이름의 모임 장소 추천 전문 챗봇입니다.

**핵심 페르소나:**
- 친근한 친구 같은 어조 (반드시 반말 사용: ~해, ~야, ~지?)
- 이모티콘은 절대 사용하지 않음 (건조하지만 챙겨주는 츤데레 느낌)
- 답변은 핵심만 간결하게

**입력 데이터:**
1. 채팅방 멤버 위치:
${userLocations.map((u) => `- ${u.nickname}: ${u.location}`).join("\n")}

2. 최근 대화 내용 (춘식 제외, 참여자들만):
${conversationContext}

3. 사용 가능한 지역 후보: ${availableRegions}
4. 사용 가능한 카테고리: ${availableCategories}

**[판단 우선순위 가이드] - 아래 순서대로 생각하고 추천할 것:**
1. **절대적 제약 사항 (최우선):** 대화 중 "알러지", "못 먹는 음식", "가기 싫은 지역", "너무 비싼 곳 제외" 같은 표현이 있다면 무조건 반영할 것.
2. **지리적 중간 지점 (중요):** 멤버들의 위치를 보고, 모두에게 이동 시간이 공평하거나 교통이 편리한 '중간 지점 지역'을 추론하여 선택할 것. (예: 홍대와 강남의 중간 → 용산/종로 등)
3. **모임 목적:** 술자리, 식사, 공부, 데이트 등 목적에 맞는 '카테고리'를 선택할 것.
4. **상세 취향:** 구체적인 메뉴나 분위기 선호도를 반영할 것.

**당신의 역할 및 수행 절차:**
1. 사용자의 말이 추천 요청인지, 단순 잡담인지 판단하기.
2. 추천 요청이라면, 위 [판단 우선순위]에 따라 최적의 '지역(region)'과 '카테고리(category)'를 결정하기.
   - 정보가 부족해도(예: 메뉴 안 정함) 당신이 알아서 센스 있게 중간 지점과 호불호 적은 메뉴로 추천할 것.
   - 대화 흐름상 이미 결정된 사항(예: "사당에서 보자")이 있으면 그걸 따를 것.
3. JSON 형식으로 결과를 생성하기.
4. 추천 이유(reason)를 작성할 때, "너희 위치가 여기랑 여기니까 중간인 OO으로 정했어" 처럼 논리적으로 설명할 것.

**응답 형식:**
- 장소를 추천할 때는 반드시 JSON 형태로만 응답하고, 그 외 잡담은 일반 텍스트로 응답.
- JSON 포맷:
{"action": "recommend", "region": "추천 지역(반드시 위 후보 중 하나)", "category": "음식 카테고리(대화에서 언급된 경우만)", "purpose": "추론된 목적", "keyword": "구체적 메뉴나 특징(예: 구워주는 고기집)", "reason": "추천 이유(반말)", "count": ${extractRecommendCount(message)}}

**주의사항:**
- 모임 장소 추천과 무관한 질문(날씨, 코딩, 수학 등)은 "난 장소 정하는 거 말고는 잘 몰라. 어디서 만날지 고민되면 말해줘!"라고 정중히 거절.
- region은 'random' 대신 가급적 멤버 위치를 고려해 특정 지역을 지정해 줄 것.
- 대화에 없는 키워드를 임의로 만들어내지 말 것.`

    const { text: aiResponse } = await generateText({
      model: "openai/gpt-4o-mini",
      system: systemPrompt,
      prompt: message,
    })

    console.log("[v0] AI Response:", aiResponse)

    // JSON 응답인지 확인
    const jsonMatch = aiResponse.match(/\{[\s\S]*"action"[\s\S]*\}/)

    if (jsonMatch) {
      try {
        const actionData = JSON.parse(jsonMatch[0])
        console.log("[v0] Parsed action data:", actionData)

        if (actionData.action === "recommend") {
          const finalCount = actionData.count || extractRecommendCount(message)
          const aiReason = actionData.reason || null

          let places

          if (actionData.region === "random" || !actionData.region) {
            places = getRandomRestaurants(10, actionData.category || undefined)
          } else {
            places = searchRestaurants({
              region: actionData.region,
              category: actionData.category || undefined,
              keyword: actionData.keyword || undefined,
            })
          }

          console.log("[v0] Found places:", places.length)

          if (places.length === 0 && actionData.region && actionData.region !== "random") {
            console.log("[v0] Retrying with region only")
            places = searchRestaurants({ region: actionData.region })
          }

          if (places.length === 0) {
            console.log("[v0] Falling back to random")
            places = getRandomRestaurants(10)
          }

          const candidatePlaces = places.slice(0, 10)

          if (candidatePlaces.length > 0) {
            const memberCoords = userLocations.map((user) => {
              // DB에 저장된 좌표가 있으면 사용
              if (user.latitude && user.longitude) {
                console.log(`[v0] Member ${user.nickname} using DB coords: ${user.latitude}, ${user.longitude}`)
                return { ...user, coords: { lat: user.latitude, lng: user.longitude } }
              }
              // 없으면 지역명으로 추정
              const coords = getCoordsByLocation(user.location)
              console.log(`[v0] Member ${user.nickname} location: ${user.location}, estimated coords:`, coords)
              return { ...user, coords }
            })

            const placesWithTravelInfo = await Promise.all(
              candidatePlaces.map(async (place) => {
                const placeCoords =
                  place.latitude && place.longitude
                    ? { lat: place.latitude, lng: place.longitude }
                    : getCoordsByLocation(place.region || place.address)

                console.log(`[v0] Place ${place.name} coords:`, placeCoords)

                if (!placeCoords) {
                  console.log(`[v0] No coords for place ${place.name}, returning empty memberTravelInfo`)
                  return { ...place, memberTravelInfo: [] }
                }

                const memberTravelInfo = await Promise.all(
                  memberCoords.map(async (member) => {
                    if (!member.coords) {
                      console.log(`[v0] No coords for member ${member.nickname}, using fallback 30min`)
                      return {
                        nickname: member.nickname,
                        duration: 30,
                        transferCount: 0,
                        walkTime: 0,
                        pathType: "unknown",
                        payment: 0,
                        steps: [],
                        transport: "transit" as const,
                        lat: undefined,
                        lng: undefined,
                      }
                    }

                    console.log(
                      `[v0] Calculating route for ${member.nickname}: (${member.coords.lat}, ${member.coords.lng}) -> (${placeCoords.lat}, ${placeCoords.lng})`,
                    )

                    const transitInfo = await getTransitRoute(
                      member.coords.lat,
                      member.coords.lng,
                      placeCoords.lat,
                      placeCoords.lng,
                    )

                    if (transitInfo) {
                      console.log(
                        `[v0] ODsay transit info for ${member.nickname}: ${transitInfo.duration}min, steps: ${transitInfo.steps?.length || 0}`,
                      )
                      return {
                        nickname: member.nickname,
                        duration: transitInfo.duration,
                        transferCount: transitInfo.transferCount,
                        walkTime: transitInfo.walkTime,
                        pathType: transitInfo.pathType,
                        payment: transitInfo.payment,
                        steps: transitInfo.steps,
                        transport: "transit" as const,
                        lat: member.coords.lat,
                        lng: member.coords.lng,
                      }
                    }

                    const distanceKm = calculateDistance(
                      member.coords.lat,
                      member.coords.lng,
                      placeCoords.lat,
                      placeCoords.lng,
                    )
                    const { duration, transport } = estimateTravelTime(distanceKm)
                    console.log(
                      `[v0] Fallback calc for ${member.nickname}: ${distanceKm.toFixed(1)}km = ${duration}min`,
                    )

                    return {
                      nickname: member.nickname,
                      duration,
                      transferCount: 0,
                      walkTime: 0,
                      pathType: "unknown",
                      payment: 0,
                      steps: [],
                      transport,
                      lat: member.coords.lat,
                      lng: member.coords.lng,
                    }
                  }),
                )

                console.log(`[v0] Place ${place.name} memberTravelInfo count: ${memberTravelInfo.length}`)

                return {
                  ...place,
                  latitude: placeCoords.lat,
                  longitude: placeCoords.lng,
                  memberTravelInfo: memberTravelInfo.filter((m): m is NonNullable<typeof m> => m !== null),
                }
              }),
            )

            const sortedPlaces = sortByRecommendationScore(placesWithTravelInfo)
            const topPlaces = sortedPlaces.slice(0, finalCount)

            const avgTravelTimes = topPlaces.map((p) => {
              const times = p.memberTravelInfo?.map((m) => m.duration) || []
              if (times.length === 0) return 0
              return Math.round(times.reduce((a, b) => a + b, 0) / times.length)
            })
            const travelVariances = topPlaces.map((p) => {
              const times = p.memberTravelInfo?.map((m) => m.duration) || []
              return Math.round(calculateTravelTimeVariance(times))
            })

            console.log("[v0] Top places count:", topPlaces.length)
            console.log("[v0] Avg travel times:", avgTravelTimes)

            const memberTravelText = userLocations
              .map((u) => {
                const firstPlace = topPlaces[0]
                const travelInfo = firstPlace?.memberTravelInfo?.find((m) => m.nickname === u.nickname)
                const duration = travelInfo?.duration || 0
                return `${u.nickname}은 약 ${duration}분`
              })
              .join(", ")

            const firstPlaceScore = topPlaces[0]?.scoreDetails
            let priorityExplanation = ""
            if (firstPlaceScore) {
              const priorities: string[] = []

              if (firstPlaceScore.equalityScore >= firstPlaceScore.popularityScore) {
                priorities.push(`멤버들의 이동시간이 비슷한 곳(편차 약 ${firstPlaceScore.travelVariance}분)`)
                if (firstPlaceScore.popularityScore > 20) {
                  priorities.push(`리뷰가 많은 인기 있는 곳`)
                }
              } else {
                priorities.push(`리뷰가 많은 인기 있는 곳`)
                if (firstPlaceScore.equalityScore > 20) {
                  priorities.push(`멤버들의 이동시간이 비슷한 곳(편차 약 ${firstPlaceScore.travelVariance}분)`)
                }
              }

              priorityExplanation = `\n\n추천 기준: ${priorities.join(" > ")} 순으로 선정했어`
            }

            const countText = finalCount === 1 ? "가장 적합한 곳을" : `${finalCount}곳을`
            let recommendMessage = ""

            if (aiReason) {
              // AI가 제공한 추천 이유 사용
              recommendMessage = `${aiReason}\n\n예상 이동 시간: ${memberTravelText} 정도 걸려${priorityExplanation}`
            } else {
              // 기존 로직 사용
              const contextInfo =
                actualKeywords.length > 0 ? `최근 대화에서 "${actualKeywords.join(", ")}" 키워드를 참고했고, ` : ""
              const memberNames = userLocations.map((u) => u.nickname).join(", ")
              const regionText = actionData.region === "random" ? "서울 전역" : actionData.region
              recommendMessage = `${contextInfo}${memberNames}의 위치를 고려해서 '${regionText}' 지역에서 ${countText} 추천할게!\n\n예상 이동 시간: ${memberTravelText} 정도 걸려${priorityExplanation}`
            }

            await supabase.from("chat_messages").insert({
              room_id: roomId,
              sender_id: "chunsik",
              sender_name: "춘식",
              content: recommendMessage,
              message_type: "text",
            })

            await supabase.from("chat_messages").insert({
              room_id: roomId,
              sender_id: "chunsik",
              sender_name: "춘식",
              content: finalCount === 1 ? "추천 맛집" : "추천 맛집 리스트",
              message_type: "place_recommendation",
              metadata: {
                places: topPlaces.map((p, index) => ({
                  name: p.name,
                  address: p.address,
                  category: p.category,
                  description: p.description,
                  tags: p.tags,
                  image_url: p.image_url,
                  review_count: p.review_count,
                  price_range: p.price_range,
                  convenience: p.convenience,
                  latitude: p.latitude,
                  longitude: p.longitude,
                  memberTravelInfo: p.memberTravelInfo,
                  avgTravelTime: avgTravelTimes[index],
                  travelVariance: travelVariances[index],
                })),
              },
            })

            await supabase.from("chat_messages").insert({
              room_id: roomId,
              sender_id: "chunsik",
              sender_name: "춘식",
              content: '더 추천해줄까? "다른 가게도 추천해줘"라고 말해줘',
              message_type: "text",
            })
          } else {
            await supabase.from("chat_messages").insert({
              room_id: roomId,
              sender_id: "chunsik",
              sender_name: "춘식",
              content: `${actionData.region}에서 조건에 맞는 맛집을 찾지 못했어. 다른 지역이나 카테고리로 다시 검색해볼까?\n\n사용 가능한 지역: ${availableRegions}`,
              message_type: "text",
            })
          }
        }
      } catch (parseError) {
        console.log("[v0] JSON parse error:", parseError)
        await supabase.from("chat_messages").insert({
          room_id: roomId,
          sender_id: "chunsik",
          sender_name: "춘식",
          content: aiResponse.replace(jsonMatch[0], "").trim() || aiResponse,
          message_type: "text",
        })
      }
    } else {
      await supabase.from("chat_messages").insert({
        room_id: roomId,
        sender_id: "chunsik",
        sender_name: "춘식",
        content: aiResponse,
        message_type: "text",
      })
    }

    return Response.json({ success: true })
  } catch (error) {
    console.error("Chunsik API error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
