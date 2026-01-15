-- 춘식 챗봇 서비스를 위한 테이블 생성

-- 기존 messages 테이블 삭제 (새 스키마로 교체)
DROP TABLE IF EXISTS messages;

-- 사용자 테이블: 닉네임과 거주 지역 저장
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,                    -- 로컬 UUID
  nickname TEXT NOT NULL,                 -- 닉네임 (예: 사용자1)
  location TEXT,                          -- 거주 지역 (예: 종로, 강남, 인천)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅방 테이블
CREATE TABLE IF NOT EXISTS chat_rooms (
  id TEXT PRIMARY KEY,                    -- 채팅방 UUID
  name TEXT NOT NULL,                     -- 채팅방 이름
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 채팅방 참여자 테이블
CREATE TABLE IF NOT EXISTS chat_room_members (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

-- 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL,                -- 사용자 ID 또는 'chunsik' (챗봇)
  sender_name TEXT NOT NULL,              -- 발신자 이름
  content TEXT NOT NULL,                  -- 메시지 내용
  message_type TEXT DEFAULT 'text',       -- 'text', 'place_recommendation', 'system'
  metadata JSONB,                         -- 장소 추천 시 추가 정보 저장
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_room_id ON chat_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_chat_room_members_user_id ON chat_room_members(user_id);

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_room_members;
