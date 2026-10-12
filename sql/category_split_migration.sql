-- ============================================================
-- 카테고리 분리 마이그레이션: CATEGORY → 가전 / 사무용 가구
--
-- 구조 (변경 후)
--   CATEGORY
--   ├─ HOMEAPPLIANCES   (가전)
--   │   ├─ HOMEAPPLIANCES001 ~ 009   ← 기존 CATEGORY001 ~ 009
--   │   └─ HOMEAPPLIANCES099 (기타)  ← 기존 CATEGORY099
--   └─ OFFICEFURNITURE  (사무용 가구)
--       └─ OFFICEFURNITURE099 (기타)
--
-- cc_code 는 PK 이면서 used_product.category_code 가 FK 로 참조하므로
-- "UPDATE cc_code" 방식이 아닌
--   ① 신규 코드 INSERT → ② 상품 category_code 이전 → ③ 구 코드 DELETE
-- 순서로 처리한다. (트랜잭션 1건으로 실행, 실패 시 전체 롤백)
-- ============================================================

BEGIN;

-- 0. [사전 확인] 현재 CATEGORY 하위 코드 / 사용 중인 상품 수
--    (001~009, 099 외의 코드가 있으면 아래 마이그레이션 대상에서 빠지므로 확인 필요)
-- SELECT c.cc_code, c.cc_desc, c.cc_order, c.cc_use_yn, COUNT(p.used_seq) AS product_cnt
--   FROM common_code c
--   LEFT JOIN used_product p ON p.category_code = c.cc_code
--  WHERE c.cc_parent_code = 'CATEGORY'
--  GROUP BY c.cc_code, c.cc_desc, c.cc_order, c.cc_use_yn
--  ORDER BY c.cc_code;

-- 1. 대분류 코드 생성 (CATEGORY 하위)
INSERT INTO common_code (cc_code, cc_parent_code, cc_desc, cc_order, cc_use_yn) VALUES
  ('HOMEAPPLIANCES',  'CATEGORY', '가전',        1, 'Y'),
  ('OFFICEFURNITURE', 'CATEGORY', '사무용 가구', 2, 'Y')
ON CONFLICT (cc_code) DO NOTHING;

-- 2. 가전 소분류 생성: 기존 CATEGORY001~009 → HOMEAPPLIANCES001~009 (명칭/순서/사용여부 승계)
INSERT INTO common_code (cc_code, cc_parent_code, cc_desc, cc_order, cc_use_yn)
SELECT 'HOMEAPPLIANCES' || substring(cc_code FROM 'CATEGORY(\d{3})$'),
       'HOMEAPPLIANCES',
       cc_desc,
       cc_order,
       cc_use_yn
  FROM common_code
 WHERE cc_parent_code = 'CATEGORY'
   AND cc_code ~ '^CATEGORY00[1-9]$'
ON CONFLICT (cc_code) DO NOTHING;

-- 3. 기타(099) 생성: 가전 / 사무용 가구 각각
--    가전 쪽은 기존 CATEGORY099 의 명칭이 있으면 승계, 없으면 '기타'
INSERT INTO common_code (cc_code, cc_parent_code, cc_desc, cc_order, cc_use_yn) VALUES
  ('HOMEAPPLIANCES099',  'HOMEAPPLIANCES',  COALESCE((SELECT cc_desc FROM common_code WHERE cc_code = 'CATEGORY099'), '기타'), 99, 'Y'),
  ('OFFICEFURNITURE099', 'OFFICEFURNITURE', '기타', 99, 'Y')
ON CONFLICT (cc_code) DO NOTHING;

-- 4. 상품 category_code 이전
--    CATEGORY001~009 → HOMEAPPLIANCES001~009
UPDATE used_product
   SET category_code = 'HOMEAPPLIANCES' || substring(category_code FROM 'CATEGORY(\d{3})$')
 WHERE category_code ~ '^CATEGORY00[1-9]$';

--    CATEGORY099(기타) → HOMEAPPLIANCES099 (일단 가전 기타로 이동)
UPDATE used_product
   SET category_code = 'HOMEAPPLIANCES099'
 WHERE category_code = 'CATEGORY099';

-- 5. 이전이 끝난 구 코드 삭제 (참조 상품이 남아있으면 FK 오류로 롤백되어 안전)
DELETE FROM common_code
 WHERE cc_parent_code = 'CATEGORY'
   AND cc_code ~ '^CATEGORY(00[1-9]|099)$';

COMMIT;

-- 6. [사후 확인]
-- SELECT cc_code, cc_parent_code, cc_desc, cc_order FROM common_code
--  WHERE cc_code = 'CATEGORY' OR cc_code LIKE 'HOMEAPPLIANCES%' OR cc_code LIKE 'OFFICEFURNITURE%'
--  ORDER BY cc_code;
-- SELECT category_code, COUNT(*) FROM used_product GROUP BY category_code ORDER BY 1;
