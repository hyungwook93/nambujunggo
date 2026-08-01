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
} from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  MenuOutlined,
  LoginOutlined,
  UserOutlined,
  LogoutOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';
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
import mainLogo from './img/logo/남부중고알뜰매장.png';
import './App.css';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

// ─────────────────────────────────────────────
// 5. AppInner
// ─────────────────────────────────────────────
function AppInner() {
  const { currentUser, login, logout, register, checkDuplicateId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentPage = location.pathname;
  const [banners, setBanners] = useState([]);
  const [bannersLoading, setBannersLoading] = useState(true);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [siteMenus, setSiteMenus] = useState([]);
  const { message, modal } = AntApp.useApp();

  const isAdmin = currentUser?.isAdmin ?? false;

  const loadBanners = useCallback(async () => {
    setBannersLoading(true);
    const { data, error } = await supabase
      .from('dashboard_banners')
      .select('*')
      .eq('is_active', true)
      .order('order_index');
    if (!error) setBanners(data || []);
    else
      setBanners([
        {
          id: 'd1',
          image_url: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=1200&q=80',
          title: '최신 노트북 라인업 출시',
        },
        {
          id: 'd2',
          image_url: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=1200&q=80',
          title: '스마트기기 특가 행사',
        },
        {
          id: 'd3',
          image_url: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=1200&q=80',
          title: '중고 거래 이벤트 안내',
        },
      ]);
    setBannersLoading(false);
  }, []);

  // 메뉴 로드
  const loadSiteMenus = useCallback(async () => {
    const { data, error } = await supabase
      .from('site_menus')
      .select('*')
      .eq('is_active', true)
      .order('order_index');
    if (!error) setSiteMenus(data || []);
  }, []);

  useEffect(() => {
    loadBanners();
    loadSiteMenus();
  }, [loadBanners, loadSiteMenus]);

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
    return (
      <Routes>
        <Route path="/" element={<Dashboard banners={banners} loading={bannersLoading} />} />
        
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
              <AdminPage onBannersChange={setBanners} onMenusChange={loadSiteMenus} />
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
        
        <Route path="/used/sell" element={
          <PageLayout title="중고제품 판매">
            <UsedProductList />
          </PageLayout>
        } />
        
        <Route path="/used/sell/:id" element={
          <PageLayout title="중고제품 상세">
            <UsedProductDetail />
          </PageLayout>
        } />
        
        <Route path="/used/sell/write" element={
          <PageLayout title="중고제품 등록">
            <UsedProductForm />
          </PageLayout>
        } />
        
        <Route path="/used/sell/edit/:id" element={
          <PageLayout title="중고제품 수정">
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
    <Dropdown
      menu={{
        items: [
          {
            key: 'info',
            label: (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {currentUser.userId}
              </Text>
            ),
            disabled: true,
          },
          {
            key: 'edit',
            label: '정보 수정',
            icon: <SettingOutlined />,
            onClick: () => setPasswordModalOpen(true),
          },
          { type: 'divider' },
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
      <Space style={{ cursor: 'pointer' }} size={8}>
        <Avatar
          size={32}
          icon={<UserOutlined />}
          style={{ backgroundColor: isAdmin ? '#faad14' : '#1677ff' }}
        />
        <Text style={{ color: '#fff', fontSize: 13 }}>{currentUser.userName}</Text>
        {isAdmin && (
          <Tag color="gold" style={{ marginLeft: 0 }}>
            시스템관리자
          </Tag>
        )}
      </Space>
    </Dropdown>
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
        style={{
          background: '#001529 !important',
          padding: 0,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <div className="header-inner">
          <div
            className="header-logo"
            onClick={() => navigate('/')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <img
              src={mainLogo}
              alt="남부중고알뜰매장"
              style={{ height: 32, marginRight: 8, objectFit: 'contain' }}
            />
          </div>

          <Menu
            theme="dark"
            mode="horizontal"
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
            }}
            items={navItems}
            className="header-menu"
            triggerSubMenuAction="hover"
            style={{ flex: 1, minWidth: 0 }}
          />

          <div className="header-right">{headerRight}</div>
        </div>
      </Header>

      <Content className="app-content">{renderContent()}</Content>

      <Footer className="app-footer" style={{ background: '#333', color: '#fff' }}>
        <div style={{ textAlign: 'left', lineHeight: '1.8', padding: '24px 24px' }}>
          <Text style={{ color: '#ddd' }}>
            남부중고알뜰매장 | 대표자: 임준삼 | 사업자등록번호: 408-07-39300
          </Text>
          <br />
          <Text style={{ color: '#ddd' }}>
            주소: 광주광역시 남구 대남대로 302 (오시는 길) | 대표전화: 062-351-9007
          </Text>
          <br />
          <Text style={{ color: '#ddd' }}>운영시간: 평일 오전 9시 ~ 오후 6시 (토/일 휴무)</Text>
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
        <AppInner />
      </AntApp>
    </ConfigProvider>
  );
}
