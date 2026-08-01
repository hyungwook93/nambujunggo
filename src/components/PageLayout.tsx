import React from 'react';
import { Typography } from 'antd';

const { Title } = Typography;

export default function PageLayout({ title, children }) {
  return (
    <div className="page-layout-container">
      {/* <div className="page-layout-header"> */}
        <div className="page-layout-header-inner">
          <Title level={2} style={{ margin: 0, fontWeight: 700 }}>
            {title}
          </Title>
        </div>
      {/* </div> */}
      <div className="page-layout-content">
        <div className="page-layout-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
