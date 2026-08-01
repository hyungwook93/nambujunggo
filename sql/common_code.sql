-- 공통코드 관리 테이블 생성
CREATE TABLE common_code (
  cc_code varchar(30) PRIMARY KEY,
  cc_parent_code varchar(30) REFERENCES common_code(cc_code),
  cc_desc varchar(1000),
  cc_order smallint DEFAULT 0,
  cc_use_yn varchar(2) DEFAULT 'Y',
  reg_date timestamptz DEFAULT now(),
  mod_date timestamptz DEFAULT now()
);

-- 더미 데이터 (테스트용)
INSERT INTO common_code (cc_code, cc_parent_code, cc_desc, cc_order, cc_use_yn) VALUES
('SYS', NULL, '시스템 공통', 1, 'Y'),
('SYS_01', 'SYS', '권한', 1, 'Y'),
('SYS_02', 'SYS', '상태', 2, 'Y');

-- ----------------------------------------------------
-- [문제 해결] RLS 정책 위반 오류가 발생할 경우 아래 쿼리를 실행하세요.
-- ----------------------------------------------------

-- 옵션 1. 테스트용으로 RLS를 완전히 끄는 방법 (가장 간단함)
ALTER TABLE common_code DISABLE ROW LEVEL SECURITY;

-- 옵션 2. RLS를 켜둔 상태로 모든 사용자에게 읽기/쓰기 권한을 주는 방법
-- ALTER TABLE common_code ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "public_all" ON common_code;
-- CREATE POLICY "public_all" ON common_code FOR ALL USING (true) WITH CHECK (true);
