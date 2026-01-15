-- users 테이블에 좌표 필드 추가
ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 인덱스 추가 (좌표 기반 검색 최적화)
CREATE INDEX IF NOT EXISTS idx_users_coordinates ON users(latitude, longitude);
