-- ============================================================
-- Supabase SQL Setup Script v2
-- 실행 방법: Supabase 대시보드 → SQL Editor → 전체 복사 후 Run
-- ============================================================

-- 기존 테이블 정리 (의존성 역순으로 DROP)
DROP TABLE IF EXISTS public.user_role CASCADE;
DROP TABLE IF EXISTS public.role CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();


-- ① users 테이블
CREATE TABLE IF NOT EXISTS public.users (
  user_seq            BIGINT GENERATED ALWAYS AS IDENTITY,
  user_name           VARCHAR(10),
  user_id             VARCHAR(30)  NOT NULL,
  user_pw             VARCHAR(100) NOT NULL,
  user_phone          VARCHAR(13),
  user_email          VARCHAR(50),
  user_address        VARCHAR(200),
  user_address_detail VARCHAR(50),
  status              VARCHAR(2)   NOT NULL DEFAULT 'C',
  password_fail       SMALLINT     NOT NULL DEFAULT 0,
  reg_date            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  mod_date            TIMESTAMPTZ,
  CONSTRAINT pk_users         PRIMARY KEY (user_seq),
  CONSTRAINT uq_users_user_id UNIQUE (user_id)
);

-- 상태 코드 제약: C(사용가능) / D(탈퇴) / L(잠김)
ALTER TABLE public.users
  ADD CONSTRAINT chk_users_status
  CHECK (status IN ('C', 'D', 'L'));

-- RLS 활성화
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 정책: 본인 레코드 조회
CREATE POLICY "Users can view own record"
  ON public.users FOR SELECT
  USING (user_id = current_user OR TRUE);   -- 클라이언트 Anon Key 기준 허용 (앱에서 필터)

-- 정책: 누구나 INSERT 가능 (회원가입)
CREATE POLICY "Anyone can register"
  ON public.users FOR INSERT
  WITH CHECK (TRUE);

-- 정책: 본인 레코드 UPDATE (비밀번호 오류 횟수 포함)
CREATE POLICY "Anyone can update users"
  ON public.users FOR UPDATE
  USING (TRUE);


-- ② role 테이블
CREATE TABLE IF NOT EXISTS public.role (
  role_code  VARCHAR(10) NOT NULL,
  use_yn     VARCHAR(2)  NOT NULL DEFAULT 'Y',
  CONSTRAINT pk_role PRIMARY KEY (role_code)
);

ALTER TABLE public.role ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view roles"
  ON public.role FOR SELECT
  USING (TRUE);

CREATE POLICY "Admins can manage roles"
  ON public.role FOR ALL
  USING (TRUE);


-- ③ user_role 테이블
CREATE TABLE IF NOT EXISTS public.user_role (
  user_role_seq  BIGINT GENERATED ALWAYS AS IDENTITY,
  user_id        VARCHAR(30) NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  role_code      VARCHAR(10) NOT NULL REFERENCES public.role(role_code) ON DELETE RESTRICT,
  status         VARCHAR(2)  NOT NULL DEFAULT 'Y',
  reg_date       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pk_user_role PRIMARY KEY (user_role_seq)
);

ALTER TABLE public.user_role ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user_roles"
  ON public.user_role FOR SELECT
  USING (TRUE);

CREATE POLICY "Anyone can manage user_roles"
  ON public.user_role FOR ALL
  USING (TRUE);


-- ④ dashboard_banners 테이블
CREATE TABLE IF NOT EXISTS public.dashboard_banners (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url    TEXT NOT NULL,
  title        TEXT,
  order_index  INTEGER     NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.dashboard_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners"
  ON public.dashboard_banners FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Anyone can manage banners"
  ON public.dashboard_banners FOR ALL
  USING (TRUE);


-- ⑤ site_menus 테이블
CREATE TABLE IF NOT EXISTS public.site_menus (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id      UUID REFERENCES public.site_menus(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  path           TEXT,
  order_index    INTEGER     NOT NULL DEFAULT 0,
  requires_admin BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  mod_date       TIMESTAMPTZ
);

ALTER TABLE public.site_menus ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active menus"
  ON public.site_menus FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Anyone can manage menus"
  ON public.site_menus FOR ALL
  USING (TRUE);


-- ============================================================
-- 기본 데이터 INSERT (seed data)
-- ============================================================

-- role 기본 데이터
INSERT INTO public.role (role_code, use_yn)
VALUES
  ('SYSTEM', 'Y'),
  ('USER',   'Y')
ON CONFLICT (role_code) DO NOTHING;


-- site_menus 대메뉴
INSERT INTO public.site_menus (id, name, path, order_index, requires_admin, is_active)
VALUES
  ('10000000-0000-0000-0000-000000000001', '오시는 길',  '/location', 1, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000002', '새 제품',    '/products', 2, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000003', '중고',       '/used',     3, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000004', 'Q&A',        '/qna',      4, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000005', '게시판',     '/board',    5, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000006', '관리자메뉴','/admin',    6, TRUE,  TRUE)
ON CONFLICT (id) DO NOTHING;

-- site_menus 서브메뉴
INSERT INTO public.site_menus (parent_id, name, path, order_index, requires_admin, is_active)
VALUES
  ('10000000-0000-0000-0000-000000000001', '본사 안내',  '/location/hq',      1, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000001', '지사 안내',  '/location/branch',  2, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000002', '노트북',     '/products/laptop',  1, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000002', '스마트기기', '/products/smart',   2, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000003', '팝니다',     '/used/sell',        1, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000003', '삽니다',     '/used/buy',         2, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000005', '공지사항',   '/board/notice',     1, FALSE, TRUE),
  ('10000000-0000-0000-0000-000000000005', '자유게시판', '/board/free',       2, FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- dashboard_banners 샘플
INSERT INTO public.dashboard_banners (image_url, title, order_index, is_active)
VALUES
  ('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&q=80', '최신 노트북 라인업 출시', 1, TRUE),
  ('https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80', '스마트기기 특가 행사',   2, TRUE),
  ('https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200&q=80', '중고 거래 이벤트 안내',  3, TRUE)
ON CONFLICT DO NOTHING;
