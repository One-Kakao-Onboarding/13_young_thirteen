import { generateText } from "ai"
import { createClient } from "@supabase/supabase-js"
import { searchRestaurants, getAllRegions, getAllCategories } from "@/lib/restaurants"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function POST(request: Request) {
  try {
    const { roomId, message } = await request.json()

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 최근 대화 20개 가져오기
    const { data: recentMessages } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(20)

    const chatHistory = (recentMessages || []).reverse()

    // 채팅방 멤버들의 위치 정보 가져오기
    const { data: members } = await supabase.from("chat_room_members").select("user_id").eq("room_id", roomId)

    const memberIds = members?.map((m) => m.user_id) || []

    const { data: users } = await supabase.from("users").select("*").in("id", memberIds)

    const userLocations =
      users?.map((u) => ({
        nickname: u.nickname,
        location: u.location,
      })) || []

    // 대화 맥락 분석
    const conversationContext = chatHistory.map((m) => `${m.sender_name}: ${m.content}`).join("\n")

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
        content: "네, 즐거운 모임 되세요! 다음에 또 불러주세요~",
        message_type: "text",
      })
      return Response.json({ success: true })
    }

    const availableRegions = getAllRegions().join(", ")
    const availableCategories = getAllCategories().join(", ")

    // AI로 의도 파악 및 응답 생성
    const systemPrompt = `당신은 '춘식'이라는 이름의 친근한 모임 장소 추천 챗봇입니다.
카카오톡 스타일로 짧고 친근하게 대화해주세요.

현재 채팅방 멤버들의 위치 정보:
${userLocations.map((u) => `- ${u.nickname}: ${u.location}`).join("\n")}

최근 대화 내용:
${conversationContext}

사용 가능한 지역: ${availableRegions}
사용 가능한 카테고리: ${availableCategories}

당신의 역할:
1. 대화 맥락을 파악하여 모임 목적(종강, 축하, 오랜만에 만남 등)을 이해합니다.
2. 멤버들의 위치를 고려하여 적절한 지역을 추천합니다.
3. "추천해줘", "맛집", "어디서 만날까" 등의 요청에는 구체적인 지역과 카테고리를 제안합니다.
4. 사용자가 특정 음식(고기, 파스타, 버거 등)을 원하면 해당 카테고리로 검색합니다.
5. 짧고 친근한 말투를 사용합니다.

응답 형식:
- 장소를 추천할 때는 반드시 JSON 형태로 다음 정보를 포함해주세요:
{"action": "recommend", "region": "추천 지역", "category": "음식 카테고리(선택)", "purpose": "모임 목적(선택)", "keyword": "기타 키워드(선택)", "reason": "추천 이유"}
- region은 반드시 사용 가능한 지역 중에서 선택해주세요.
- 단순 대화일 때는 일반 텍스트로 응답합니다.
- 추가 정보가 필요할 때는 질문합니다.`

    const { text: aiResponse } = await generateText({
      model: "openai/gpt-4o-mini",
      system: systemPrompt,
      prompt: message,
    })

    // JSON 응답인지 확인
    const jsonMatch = aiResponse.match(/\{[\s\S]*"action"[\s\S]*\}/)

    if (jsonMatch) {
      try {
        const actionData = JSON.parse(jsonMatch[0])

        if (actionData.action === "recommend") {
          const places = searchRestaurants({
            region: actionData.region,
            category: actionData.category,
            purpose: actionData.purpose,
            keyword: actionData.keyword,
          })

          // 상위 4개 선택
          const topPlaces = places.slice(0, 4)

          if (topPlaces.length > 0) {
            // 추천 메시지 저장
            const recommendMessage = `추천 지역은 '${actionData.region}'입니다! ${actionData.reason}\n\n맛집 ${topPlaces.length}곳을 추천해드릴게요!`

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
              content: "추천 맛집 리스트",
              message_type: "place_recommendation",
              metadata: {
                places: topPlaces.map((p) => ({
                  name: p.name,
                  address: p.address,
                  category: p.category,
                  description: p.description,
                  tags: p.tags,
                  image_url: p.image_url,
                  review_count: p.review_count,
                })),
              },
            })

            // 추가 추천 안내
            await supabase.from("chat_messages").insert({
              room_id: roomId,
              sender_id: "chunsik",
              sender_name: "춘식",
              content: '더 추천해드릴까요? "다른 가게도 추천해줘"라고 말씀해주세요!',
              message_type: "text",
            })
          } else {
            await supabase.from("chat_messages").insert({
              room_id: roomId,
              sender_id: "chunsik",
              sender_name: "춘식",
              content: `${actionData.region}에서 조건에 맞는 맛집을 찾지 못했어요. 다른 지역이나 카테고리로 다시 검색해볼까요?\n\n사용 가능한 지역: ${availableRegions}`,
              message_type: "text",
            })
          }
        }
      } catch {
        // JSON 파싱 실패시 일반 텍스트로 응답
        await supabase.from("chat_messages").insert({
          room_id: roomId,
          sender_id: "chunsik",
          sender_name: "춘식",
          content: aiResponse.replace(jsonMatch[0], "").trim() || aiResponse,
          message_type: "text",
        })
      }
    } else {
      // 일반 텍스트 응답
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
