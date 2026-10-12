-- ============================================================
-- 중고 메뉴 분리: [중고 > 팝니다] → [중고 > 가전] / [중고 > 사무용 가구]
--
--   /used/sell  → /used/appliance   (HOMEAPPLIANCES 하위 코드 상품)
--   신규        → /used/furniture   (OFFICEFURNITURE 하위 코드 상품)
--
-- 기존 '팝니다' 메뉴(path = '/used/sell') 행을 '가전'으로 변경(재사용)하고
-- 같은 부모 아래에 '사무용 가구'를 추가한다. (이미 실행했어도 중복 생성되지 않음)
-- ============================================================

BEGIN;

-- 1. 기존 '팝니다' → '가전'
UPDATE public.site_menus
   SET name = '가전',
       path = '/used/appliance',
       order_index = 1,
       mod_date = now()
 WHERE path = '/used/sell';

-- 2. '사무용 가구' 추가 (가전과 같은 부모 아래, 순서 2)
INSERT INTO public.site_menus (parent_id, name, path, order_index, requires_admin, is_active)
SELECT parent_id, '사무용 가구', '/used/furniture', 2, FALSE, TRUE
  FROM public.site_menus
 WHERE path = '/used/appliance'
   AND NOT EXISTS (SELECT 1 FROM public.site_menus WHERE path = '/used/furniture')
 LIMIT 1;

-- 3. '삽니다'(/used/buy)가 있으면 뒤로 밀기
UPDATE public.site_menus
   SET order_index = 3, mod_date = now()
 WHERE path = '/used/buy';

COMMIT;

-- [확인]
-- SELECT id, parent_id, name, path, order_index FROM public.site_menus WHERE path LIKE '/used%' ORDER BY order_index;
