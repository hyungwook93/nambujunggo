import React from 'react';
import { Row, Col, Card, Carousel, Spin, Empty, Typography } from 'antd';
import {
  LeftOutlined,
  RightOutlined,
  FileTextOutlined,
  LaptopOutlined,
  ShoppingOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';

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

export default function Dashboard({ banners, loading }: { banners: any[]; loading: boolean }) {
  const placeholderCards = [
    { title: '최신 공지사항', icon: <FileTextOutlined />, color: '#e6f4ff' },
    { title: '인기 제품', icon: <LaptopOutlined />, color: '#f6ffed' },
    { title: '중고 거래', icon: <ShoppingOutlined />, color: '#fff7e6' },
    { title: 'Q&A 바로가기', icon: <QuestionCircleOutlined />, color: '#fff0f6' },
  ];

  return (
    <div className="dashboard-container">
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card className="banner-card" styles={{ body: { padding: 0 } }}>
            {loading ? (
              <div className="banner-loading">
                <Spin size="large" />
              </div>
            ) : banners.length === 0 ? (
              <div className="banner-empty">
                <Empty description="등록된 배너가 없습니다" image={Empty.PRESENTED_IMAGE_SIMPLE} />
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
                {banners.map((banner) => (
                  <div key={banner.id} className="carousel-slide">
                    <img
                      src={banner.image_url}
                      alt={banner.title || '배너 이미지'}
                      className="carousel-img"
                      onError={(e: any) => {
                        e.target.style.display = 'none';
                      }}
                    />
                    {banner.title && (
                      <div className="carousel-caption">
                        <Title level={3} style={{ color: '#fff', margin: 0 }}>
                          {banner.title}
                        </Title>
                      </div>
                    )}
                  </div>
                ))}
              </Carousel>
            )}
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        {placeholderCards.map((card, idx) => (
          <Col key={idx} xs={24} sm={12}>
            <Card className="grid-card" hoverable style={{ backgroundColor: card.color }}>
              <div className="grid-card-content">
                <span className="grid-card-icon">{card.icon}</span>
                <Title level={5} style={{ margin: 0 }}>
                  {card.title}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  준비 중인 섹션입니다
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
