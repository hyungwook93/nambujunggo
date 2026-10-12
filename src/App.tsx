import React, { useState, useEffect, useCallback } from 'react';
import {
  ConfigProvider,
  App as AntApp,
  Layout,
  Menu,
  Typography,
  Button,
  Space,
  Tag,
  Avatar,
  Dropdown,
  Result,
  Drawer,
} from 'antd';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import {
  MenuOutlined,
  LoginOutlined,
  LogoutOutlined,
  SettingOutlined,
  CrownFilled,
} from '@ant-design/icons';
import SessionTimer from './components/SessionTimer';
import { supabase } from './lib/supabase';
import { useAuth, AuthProvider } from './hooks/useAuth';
import LoginModal from './components/LoginModal';
import PasswordConfirmModal from './components/PasswordConfirmModal';
import SignupPage from './pages/SignupPage';
import ProfilePage from './pages/ProfilePage';
import PageLayout from './components/PageLayout';
import LocationPage from './pages/LocationPage';
import Dashboard from './pages/Dashboard';
import AdminPage from './pages/AdminPage';
import UsedProductList from './pages/used/UsedProductList';
import UsedProductDetail from './pages/used/UsedProductDetail';
import UsedProductForm from './pages/used/UsedProductForm';
import { USED_TYPES, isUsedType } from './lib/usedType';
import FontSizeControl, { useFontScale } from './components/FontSizeControl';
import mainLogo from './img/logo/남부중고알뜰매장.png';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

// 아바타 표시 텍스트: 3글자 이상이면 첫 글자, 2글자 이하면 전체
const getAvatarText = (name?: string) => {
  const chars = Array.from((name || '').trim());
  if (chars.length === 0) return '?';
  return chars.length >= 3 ? chars[0] : chars.join('');
};

// ─────────────────────────────────────────────
// 5. AppInner
// ─────────────────────────────────────────────
function AppInner() {
  const { currentUser, login, logout, register, checkDuplicateId, extendSession, expiredAt, clearExpired } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = location.pathname;
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [siteMenus, setSiteMenus] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { message, modal } = AntApp.useApp();
  const [fontScale, setFontScale] = useFontScale();
  // 글자 크기: 화면 영역(헤더 제외)에 zoom 적용 → 비율이 유지되어 레이아웃이 잘 깨지지 않음
  const zoomStyle = { zoom: fontScale, '--font-zoom': fontScale } as React.CSSProperties;

  const isAdmin = currentUser?.isAdmin ?? false;

  // 메뉴 로드
  const loadSiteMenus = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_menus')
      .select('*')
      .eq('is_active', true)
      .order('order_index');
    if (!error) setSiteMenus(data || []);
  }, []);

  // 메인화면 보이기 메뉴 (show_on_main=true, order_index 순)
  const mainMenus = (siteMenus as any[])
    .filter((m: any) => m.show_on_main)
    .sort((a: any, b: any) => a.order_index - b.order_index);

  useEffect(() => {
    loadSiteMenus();
  }, [loadSiteMenus]);

  // 무활동 자동 로그아웃 안내
  useEffect(() => {
    if (!expiredAt) return;
    message.warning('30분간 활동이 없어 자동 로그아웃되었습니다.');
    clearExpired();
    if (['/admin', '/profile'].includes(location.pathname) || location.pathname.endsWith('/write') || location.pathname.includes('/edit/')) {
      navigate('/');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiredAt]);

  const handleExtend = () => {
    // 이미 만료된 경우 연장되지 않으며, 만료 안내는 expiredAt effect 에서 표시됨
    if (extendSession()) message.success('로그인 시간이 30분 연장되었습니다.');
  };

  // 로그인 처리
  const handleLogin = async (userId, password) => {
    setLoginLoading(true);
    const result = await login(userId, password);
    setLoginLoading(false);
    if (result.success) {
      message.success(`환영합니다, ${result.user.userName}님!`);
    } else if (result.locked) {
      modal.error({ title: '계정 잠금', content: result.message, okText: '확인' });
    }
    return result;
  };

  // 로그아웃
  const handleLogout = () => {
    logout();
    message.info('로그아웃 되었습니다.');
    if (currentPage === '/admin' || currentPage === '/profile') navigate('/');
  };

  // 페이지 렌더
  const renderContent = () => {
    const usedSeg = currentPage.split('/')[2];
    const usedTypeTitle = isUsedType(usedSeg) ? USED_TYPES[usedSeg].title : '제품';
    return (
      <Routes>
        <Route path="/" element={<Dashboard mainMenus={mainMenus} />} />
        
        <Route path="/signup" element={
          <PageLayout title="회원가입">
            <SignupPage
              onBack={() => navigate('/')}
              onSuccess={() => {
                navigate('/');
                setLoginOpen(true);
              }}
              checkDuplicateId={checkDuplicateId}
              register={register}
            />
          </PageLayout>
        } />

        <Route path="/profile" element={
          currentUser ? (
            <PageLayout title="내 정보">
              <ProfilePage onBack={() => navigate('/')} />
            </PageLayout>
          ) : (
            <Result
              status="403"
              title="로그인이 필요합니다"
              extra={<Button type="primary" onClick={() => navigate('/')}>홈으로 가기</Button>}
            />
          )
        } />

        <Route path="/admin" element={
          isAdmin ? (
            <PageLayout title="관리자 메뉴">
              <AdminPage onMenusChange={loadSiteMenus} />
            </PageLayout>
          ) : (
            <Result
              status="403"
              title="접근 권한 없음"
              extra={<Button type="primary" onClick={() => navigate('/')}>홈으로 가기</Button>}
            />
          )
        } />

        <Route path="/location" element={
          <PageLayout title="오시는 길">
            <LocationPage />
          </PageLayout>
        } />
        
        {/* 중고: /used/appliance(가전), /used/furniture(사무용 가구) */}
        <Route path="/used/sell" element={<Navigate to="/used/appliance" replace />} />

        <Route path="/used/:type" element={
          <PageLayout title={`중고 ${usedTypeTitle}`}>
            <UsedProductList />
          </PageLayout>
        } />
        
        <Route path="/used/:type/:id" element={
          <PageLayout title={`중고 ${usedTypeTitle} 상세`}>
            <UsedProductDetail />
          </PageLayout>
        } />
        
        <Route path="/used/:type/write" element={
          <PageLayout title={`중고 ${usedTypeTitle} 등록`}>
            <UsedProductForm />
          </PageLayout>
        } />
        
        <Route path="/used/:type/edit/:id" element={
          <PageLayout title={`중고 ${usedTypeTitle} 수정`}>
            <UsedProductForm isEdit />
          </PageLayout>
        } />

        <Route path="*" element={
          <PageLayout title="준비중">
            <Result
              status="404"
              title="페이지 준비 중"
              subTitle="해당 메뉴의 페이지는 현재 준비 중입니다."
              extra={<Button type="primary" onClick={() => navigate('/')}>홈으로 가기</Button>}
            />
          </PageLayout>
        } />
      </Routes>
    );
  };

  // 헤더 우측 – 로그인 상태에 따라 다른 UI
  const headerRight = currentUser ? (
    <div className="header-user">
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            {
              key: 'info',
              label: (
                <div>
                  <Text strong>{currentUser.userName}</Text>{' '}
                  {isAdmin && <Tag color="gold" style={{ marginRight: 0 }}>시스템관리자</Tag>}
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {currentUser.userId}
                    </Text>
                  </div>
                </div>
              ),
              disabled: true,
              style: { cursor: 'default' },
            },
            { type: 'divider' },
            {
              key: 'edit',
              label: '정보 수정',
              icon: <SettingOutlined />,
              onClick: () => setPasswordModalOpen(true),
            },
            {
              key: 'logout',
              label: '로그아웃',
              icon: <LogoutOutlined />,
              onClick: handleLogout,
              danger: true,
            },
          ],
        }}
        placement="bottomRight"
      >
        <span className="header-user-trigger" id="header-user-menu">
          <Avatar
            size={28}
            style={{
              backgroundColor: isAdmin ? '#faad14' : '#1677ff',
              flexShrink: 0,
              fontSize: getAvatarText(currentUser.userName).length > 1 ? 11 : 14,
              fontWeight: 700,
              letterSpacing: -0.5,
            }}
          >
            {getAvatarText(currentUser.userName)}
          </Avatar>
          {isAdmin && <CrownFilled className="header-admin-badge" title="시스템관리자" />}
        </span>
      </Dropdown>
      <SessionTimer onExtend={handleExtend} />
    </div>
  ) : (
    <Button
      type="primary"
      icon={<LoginOutlined />}
      onClick={() => setLoginOpen(true)}
      style={{ fontWeight: 600 }}
    >
      로그인
    </Button>
  );

  // DB 기반 동적 메뉴 구성
  const generateNavItems = () => {
    const items: any[] = [];
    // 1. 대메뉴 필터링
    const parentMenus = siteMenus.filter((m: any) => !m.parent_id);

    parentMenus.forEach((parent: any) => {
      // 관리자 전용 메뉴 처리
      if (parent.requires_admin && !isAdmin) return;

      if (!parent.is_active) return;

      const item: any = {
        key: parent.path || `menu-${parent.id}`,
        label: parent.name,
        icon: <MenuOutlined />,
      };

      const subMenus = siteMenus.filter((m: any) => m.parent_id === parent.id);
      if (subMenus.length > 0) {
        const activeSubMenus = subMenus.filter((sub: any) => sub.is_active && (!sub.requires_admin || isAdmin));

        item.children = activeSubMenus.map((sub: any) => ({
          key: sub.path || `menu-${sub.id}`,
          label: sub.name,
        }));

        // 부모 메뉴 클릭 시 하위 메뉴가 있다면 첫 번째 활성화된 하위 메뉴로 이동
        item.onTitleClick = () => {
          if (parent.requires_admin && !isAdmin) {
            message.warning('관리자 권한이 필요합니다.');
            return;
          }
          if (activeSubMenus.length > 0) {
            const firstSub = activeSubMenus[0];
            navigate(firstSub.path || `menu-${firstSub.id}`);
          } else if (parent.path === '/admin' || parent.requires_admin) {
            navigate('/admin');
          } else {
            navigate(parent.path || `menu-${parent.id}`);
          }
        };
      }

      items.push(item);
    });

    return items;
  };

  const navItems = generateNavItems();

  return (
    <Layout className="app-layout">
      <Header
        className="app-header-wrapper"
        style={{ background: '#fa8c16', padding: 0, position: 'sticky', top: 0, zIndex: 100 }}
      >
        <div className="header-inner">
          {/* 왼쪽: 햄버거 버튼 */}
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <Button
              type="text"
              icon={<MenuOutlined style={{ fontSize: 22, color: '#fff' }} />}
              onClick={() => setDrawerOpen(true)}
              style={{ background: 'transparent', border: 'none', padding: '4px 8px' }}
            />
          </div>

          {/* 가운데: 로고 */}
          <div
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <img src={mainLogo} alt="남부중고알뜰매장" style={{ height: 30, objectFit: 'contain' }} />
          </div>

          {/* 오른쪽: 로그인/유저 */}
          <div className="header-right">
            {headerRight}
          </div>
        </div>
      </Header>

      {/* 좌측 슬라이드 드로어 메뉴 */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <img src={mainLogo} alt="로고" style={{ height: 24, objectFit: 'contain' }} />
          </div>
        }
        placement="left"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={260}
        styles={{ body: { padding: 0, zoom: fontScale } }}
      >
        <Menu
          mode="inline"
          selectedKeys={[currentPage]}
          onClick={(e) => {
            const clickedItem = siteMenus.find(
              (m) => m.path === e.key || `menu-${m.id}` === e.key
            );
            if ((e.key === '/admin' || clickedItem?.requires_admin) && !isAdmin) {
              message.warning('관리자 권한이 필요합니다.');
              return;
            }
            navigate(e.key);
            setDrawerOpen(false);
          }}
          items={navItems}
          style={{ border: 'none', fontSize: 15 }}
        />
      </Drawer>

      <Content className="app-content" style={zoomStyle}>{renderContent()}</Content>

      <Footer className="app-footer" style={{ background: '#333', color: '#fff', ...zoomStyle }}>
        <div style={{ textAlign: 'left', lineHeight: '1.8', padding: '24px 24px' }}>
          <Text style={{ color: '#ddd' }}>
            남부중고알뜰매장 | 대표자: 임준삼 | 사업자등록번호: 408-07-39300
          </Text>
          <br />
          <Text style={{ color: '#ddd' }}>
            주소: 광주광역시 남구 대남대로 302 (오시는 길) | 대표전화: 062-351-9007
          </Text>
          <br />
          <Text style={{ color: '#ddd' }}>운영시간: 평일 오전 9시 ~ 오후 6시 (토 오전 9시 ~ 오후 4시 / 일 휴무)</Text>
          <div style={{ margin: '16px 0' }}>
            <Space size="large">
              <a href="#" style={{ color: '#fff' }}>
                [이용약관]
              </a>
              <a href="#" style={{ color: '#fff', fontWeight: 600 }}>
                [개인정보처리방침]
              </a>
              <a href="#" style={{ color: '#fff' }}>
                [고객문의]
              </a>
            </Space>
          </div>
          <Text style={{ fontSize: 13, color: '#aaa' }}>
            Copyright © 2026 남부중고알뜰매장. All rights reserved.
          </Text>
        </div>
      </Footer>

      {/* 로그인 모달 */}
      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        onGoSignup={() => {
          setLoginOpen(false);
          navigate('/signup');
        }}
        loading={loginLoading}
      />

      {/* 정보 수정 전 비밀번호 확인 모달 */}
      <PasswordConfirmModal
        open={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={() => {
          setPasswordModalOpen(false);
          navigate('/profile');
        }}
      />
      {/* 우측 하단 글자 크기 조절 */}
      <FontSizeControl scale={fontScale} onChange={setFontScale} />
    </Layout>
  );
}

// ─────────────────────────────────────────────
// 6. 최상위 App
// ─────────────────────────────────────────────
export default function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#fa8c16',
          borderRadius: 8,
          fontFamily: "'Pretendard', 'Noto Sans KR', 'Inter', sans-serif",
        },
        components: {
          Layout: {
            headerBg: '#fa8c16',
          },
          Menu: {
            darkItemBg: '#fa8c16',
            darkSubMenuItemBg: '#fa8c16',
            darkItemSelectedBg: '#d46b08',
            darkItemHoverBg: '#d46b08',
          },
        },
      }}
    >
      <AntApp>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </AntApp>
    </ConfigProvider>
  );
}
