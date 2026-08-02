import React, { useEffect, useState } from 'react';
import { List, Card, Button, Typography, Space, Tag, Empty, App as AntApp, Input } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import CommonCodeSelector from '../../components/common/CommonCodeSelector';

const { Title, Text } = Typography;

export default function UsedProductList() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [searchCategory, setSearchCategory] = useState<string | undefined>(undefined);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { message } = AntApp.useApp();

  const isManagerOrAdmin = currentUser?.isAdmin || (currentUser?.roles && currentUser.roles.includes('MANAGER'));

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    // common_code 에서 카테고리명 조인을 위해 select 수정
    // Supabase JS에서 외래키 조인: category_code (cc_desc)
    const { data, error } = await supabase
      .from('used_product')
      .select(`
        *,
        common_code!used_product_category_code_fkey(cc_desc)
      `)
      .neq('status', 'D')
      .order('used_seq', { ascending: false });

    if (error) {
      message.error('목록을 불러오는 중 오류가 발생했습니다.');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const filteredProducts = products.filter(p => {
    let match = true;
    if (searchText) {
      match = match && p.title.toLowerCase().includes(searchText.toLowerCase());
    }
    if (searchCategory) {
      match = match && p.category_code === searchCategory;
    }
    return match;
  });

  return (
    <div style={{ padding: '16px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        <Space wrap>
          <CommonCodeSelector 
            parentCode="CATEGORY" 
            placeholder="카테고리 전체" 
            value={searchCategory}
            onChange={setSearchCategory}
            style={{ width: 140 }}
          />
          <Input.Search 
            placeholder="제목 검색" 
            allowClear 
            onSearch={setSearchText} 
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 200 }} 
          />
        </Space>
        {isManagerOrAdmin && (
          <div>
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate('/used/sell/write')}>
              상품 등록
            </Button>
          </div>
        )}
      </div>

      <List
        grid={{ gutter: 16, column: 2, xs: 1, sm: 2 }}
        loading={loading}
        dataSource={filteredProducts}
        locale={{ emptyText: <Empty description="등록된 상품이 없습니다." /> }}
        pagination={{
          pageSize: 10,
          align: 'center',
          showSizeChanger: false,
        }}
        renderItem={(item) => (
          <List.Item>
            <Card
              hoverable
              onClick={() => navigate(`/used/sell/${item.used_seq}`)}
              cover={
                <div style={{ height: 200, overflow: 'hidden', backgroundColor: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {item.thumbnail_url ? (
                    <img alt={item.title} src={item.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Text type="secondary">이미지 없음</Text>
                  )}
                </div>
              }
              bodyStyle={{ padding: '12px 16px' }}
            >
              <div style={{ marginBottom: 8 }}>
                <Tag color={item.status === 'A' ? 'blue' : 'default'}>
                  {item.status === 'A' ? '판매중' : '판매완료'}
                </Tag>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {item.common_code?.cc_desc || item.category_code}
                </Text>
              </div>
              <Title level={5} style={{ margin: '0 0 8px 0' }} ellipsis={{ rows: 2 }}>
                {item.title}
              </Title>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {new Date(item.reg_date).toLocaleDateString()}
                </Text>
                <Space size={4}>
                  <EyeOutlined style={{ color: '#8c8c8c' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>{item.view_cnt || 0}</Text>
                </Space>
              </div>
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}
