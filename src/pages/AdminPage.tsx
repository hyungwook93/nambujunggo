import React from 'react';
import { Tabs, Typography } from 'antd';
import { CrownOutlined, MenuOutlined, PictureOutlined } from '@ant-design/icons';
import MenuManager from '../components/admin/MenuManager';
import BannerManager from '../components/admin/BannerManager';
import CommonCodeManager from '../components/admin/CommonCodeManager';

const { Title } = Typography;

export default function AdminPage({
  onBannersChange,
  onMenusChange,
}: {
  onBannersChange: (banners: any[]) => void;
  onMenusChange: (menus: any[]) => void;
}) {
  const tabItems = [
    {
      key: 'menus',
      label: (
        <span>
          <MenuOutlined /> 메뉴 관리
        </span>
      ),
      children: <MenuManager onMenusChange={onMenusChange} />,
    },
    {
      key: 'banners',
      label: (
        <span>
          <PictureOutlined /> 대시보드 관리
        </span>
      ),
      children: <BannerManager onBannersChange={onBannersChange} />,
    },
    {
      key: 'common_code',
      label: (
        <span>
          <MenuOutlined /> 공통코드 관리
        </span>
      ),
      children: <CommonCodeManager />,
    },
  ];

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <CrownOutlined style={{ fontSize: 24, marginRight: 10 }} />
        <Title level={3} style={{ margin: 0 }}>
          관리자 메뉴
        </Title>
      </div>
      <Tabs defaultActiveKey="menus" items={tabItems} className="admin-tabs" />
    </div>
  );
}
