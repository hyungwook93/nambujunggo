import React, { useEffect, useState } from 'react';
import { Row, Col, Card, Carousel, Spin, Empty, Typography, Tag } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  FileTextOutlined,
  LaptopOutlined,
  ShoppingOutlined,
  QuestionCircleOutlined,
  CustomerServiceOutlined,
  EnvironmentOutlined,
  HomeOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const { Title, Text } = Typography;

const CustomPrevArrow = (props: any) => {
  const { onClick } = props;
  return (
    <div className="carousel-custom-arrow carousel-custom-prev" onClick={onClick}>
      <LeftOutlined className="carousel-custom-icon" />
    </div>
  );
};

const CustomNextArrow = (props: any) => {
  const { onClick } = props;
  return (
    <div className="carousel-custom-arrow carousel-custom-next" onClick={onClick}>
      <RightOutlined className="carousel-custom-icon" />
    </div>
  );
};

// 메뉴 이름 기반으로 아이콘 매핑
const getMenuIcon = (name: string, path: string) => {
  if (path?.includes('notice') || name?.includes('공지')) return <FileTextOutlined />;
  if (path?.includes('used') || name?.includes('중고')) return <ShoppingOutlined />;
  if (path?.includes('product') || name?.includes('제품') || name?.includes('상품')) return <LaptopOutlined />;
  if (path?.includes('qna') || path?.includes('qa') || name?.includes('Q&A') || name?.includes('질문')) return <QuestionCircleOutlined />;
  if (path?.includes('cs') || name?.includes('고객') || name?.includes('서비스')) return <CustomerServiceOutlined />;
  if (path?.includes('location') || name?.includes('오시는')) return <EnvironmentOutlined />;
  if (path?.includes('home') || name?.includes('홈')) return <HomeOutlined />;
  return <AppstoreOutlined />;
};

// 메뉴 카드 배경 색상 (순서별)
const CARD_COLORS = ['#e6f4ff', '#f6ffed', '#fff7e6', '#fff0f6'];

interface DashboardProps {
  mainMenus: any[];
}

export default function Dashboard({ mainMenus }: DashboardProps) {
  const navigate = useNavigate();
  const [slides, setSlides] = useState<any[]>([]);
  const [slidesLoading, setSlidesLoading] = useState(true);

  useEffect(() => {
    loadRecentImages();
  }, []);

  const loadRecentImages = async () => {
    setSlidesLoading(true);

    // 1. status != 'D' 인 최근 4개 제품 조회 (used_seq 내림차순)
    const { data: products, error: prodErr } = await supabase
      .from('used_product')
      .select('used_seq, title, status')
      .neq('status', 'D')
      .order('used_seq', { ascending: false })
      .limit(4);

    if (prodErr || !products || products.length === 0) {
      setSlides([]);
      setSlidesLoading(false);
      return;
    }

    // 2. 각 제품의 대표 이미지 1장씩 조회 (sort_order 오름차순 첫 번째)
    const slideResults = await Promise.all(
      products.map(async (product) => {
        const { data: imgs } = await supabase
          .from('used_product_image')
          .select('img_seq, image_url')
          .eq('used_seq', product.used_seq)
          .order('sort_order', { ascending: true })
          .limit(1);

        if (!imgs || imgs.length === 0) return null; // 이미지 없는 제품 제외

        return {
          img_seq: imgs[0].img_seq,
          used_seq: product.used_seq,
          image_url: imgs[0].image_url,
          used_product: product,
        };
      })
    );

    // 이미지가 있는 제품만 필터링
    const validSlides = slideResults.filter((s) => s !== null) as any[];
    setSlides(validSlides);
    setSlidesLoading(false);
  };

  const getStatusTag = (status: string) => {
    if (status === 'A') return <Tag color="blue" style={{ fontSize: 12 }}>판매중</Tag>;
    if (status === 'C') return <Tag color="default" style={{ fontSize: 12 }}>판매완료</Tag>;
    return null;
  };

  return (
    <div className="dashboard-container">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card className="banner-card" styles={{ body: { padding: 0 } }}>
            {slidesLoading ? (
              <div className="banner-loading">
                <Spin size="large" />
              </div>
            ) : slides.length === 0 ? (
              <div className="banner-empty">
                <Empty description="등록된 중고제품 이미지가 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              </div>
            ) : (
              <Carousel
                autoplay
                autoplaySpeed={3500}
                infinite
                effect="fade"
                arrows
                prevArrow={<CustomPrevArrow />}
                nextArrow={<CustomNextArrow />}
              >
                {slides.map((slide) => {
                  const product = slide.used_product as any;
                  return (
                    <div
                      key={slide.img_seq}
                      className="carousel-slide carousel-slide-clickable"
                      onClick={() => navigate(`/used/sell/${slide.used_seq}`)}
                    >
                      <img
                        src={slide.image_url}
                        alt={product?.title || '중고제품 이미지'}
                        className="carousel-img"
                        onError={(e: any) => {
                          e.target.style.display = 'none';
                        }}
                      />
                      <div className="carousel-caption">
                        <div className="carousel-caption-inner">
                          <Title level={4} style={{ color: '#fff', margin: '0 0 6px 0' }} ellipsis={{ rows: 1 }}>
                            {product?.title || ''}
                          </Title>
                          {product?.status && getStatusTag(product.status)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </Carousel>
            )}
          </Card>
        </Col>
      </Row>

      {/* 하단 바로가기 카드 (show_on_main=true 메뉴들) */}
      {mainMenus.length > 0 && (
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          {mainMenus.map((menu: any, idx: number) => (
            <Col key={menu.id} xs={24} sm={12}>
              <Card
                className="grid-card"
                hoverable
                style={{ backgroundColor: CARD_COLORS[idx % CARD_COLORS.length] }}
                onClick={() => {
                  if (menu.path) {
                    navigate(menu.path);
                  }
                }}
              >
                <div className="grid-card-content">
                  <span className="grid-card-icon">
                    {getMenuIcon(menu.name, menu.path)}
                  </span>
                  <Title level={5} style={{ margin: 0 }}>
                    {menu.name}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    바로가기
                  </Text>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  );
}
