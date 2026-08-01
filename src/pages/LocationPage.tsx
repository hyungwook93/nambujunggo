import React from 'react';
import { Card, Typography, Space, Button } from 'antd';
import { EnvironmentOutlined, GlobalOutlined } from '@ant-design/icons';

const { Text } = Typography;

export default function LocationPage() {
  const address = '광주광역시 남구 대남대로 302';
  const kakaoMapUrl = `https://map.kakao.com/link/search/${encodeURIComponent(address)}`;
  const naverMapUrl = `https://map.naver.com/v5/search/${encodeURIComponent(address)}`;

  return (
    <Card 
      className="location-card" 
      bordered={false} 
      style={{ borderRadius: 12, boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)' }}
    >
      <div style={{ position: 'relative' }}>
        <iframe
          src={`https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
          width="100%"
          height="500"
          frameBorder="0"
          style={{ border: 0, borderRadius: '8px' }}
          allowFullScreen
          title="오시는 길"
        ></iframe>
      </div>
      
      <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Space>
          <EnvironmentOutlined style={{ fontSize: 20, color: '#1677ff' }} />
          <Text strong style={{ fontSize: 18 }}>
            {address} | TEL : 062-351-9007
          </Text>
        </Space>

        <Space style={{ justifyContent: 'center' }} wrap>
          <Button 
            type="primary" 
            style={{ backgroundColor: '#FEE500', color: '#000000', borderColor: '#FEE500', fontWeight: 'bold' }}
            onClick={() => window.open(kakaoMapUrl, '_blank')}
          >
            카카오맵으로 길찾기
          </Button>
          <Button 
            type="primary" 
            style={{ backgroundColor: '#03C75A', color: '#ffffff', borderColor: '#03C75A', fontWeight: 'bold' }}
            onClick={() => window.open(naverMapUrl, '_blank')}
          >
            네이버 지도로 길찾기
          </Button>
          <Button 
            icon={<GlobalOutlined />}
            onClick={() => window.open(`https://maps.google.com/maps?q=${encodeURIComponent(address)}`, '_blank')}
          >
            구글 지도 열기
          </Button>
        </Space>
      </div>
    </Card>
  );
}
