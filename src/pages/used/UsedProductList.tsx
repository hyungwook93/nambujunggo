import React, { useEffect, useState } from 'react';
import { List, Card, Button, Typography, Space, Tag, Empty, App as AntApp, Input, Result } from 'antd';
import { EditOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';
import CommonCodeSelector from '../../components/common/CommonCodeSelector';
import { USED_TYPES, isUsedType } from '../../lib/usedType';

const { Title, Text } = Typography;

export default function UsedProductList() {
  const { type } = useParams();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // 검색 조건은 URL 쿼리로 관리 (상세 → 뒤로가기/새로고침에도 유지)
  const [searchParams, setSearchParams] = useSearchParams();
  const searchText = searchParams.get('q') || '';
  const searchCategory = searchParams.get('cat') || undefined;
  const page = Number(searchParams.get('page')) || 1;
  const [keyword, setKeyword] = useState(searchText);
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { message } = AntApp.useApp();

  const isManagerOrAdmin = currentUser?.isAdmin || (currentUser?.roles && currentUser.roles.includes('MANAGER'));
  const validType = isUsedType(type) ? type : null;
  const typeInfo = validType ? USED_TYPES[validType] : null;

  const updateParams = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(patch).forEach(([k, v]) => {
      if (v) next.set(k, v);
      else next.delete(k);
    });
    setSearchParams(next, { replace: true });
  };

  useEffect(() => {
    setKeyword(searchText);
  }, [type]);

  useEffect(() => {
    if (typeInfo) fetchProducts();
  }, [type]);

  const fetchProducts = async () => {
    if (!typeInfo) return;
    setLoading(true);
    // 해당 대분류(HOMEAPPLIANCES / OFFICEFURNITURE) 하위 코드의 상품만 조회
    const { data, error } = await supabase
      .from('used_product')
      .select(`
        *,
        common_code!used_product_category_code_fkey(cc_desc)
      `)
      .like('category_code', `${typeInfo.parentCode}%`)
      .neq('status', 'D')
      .order('used_seq', { ascending: false });

    if (error) {
      message.error('목록을 불러오는 중 오류가 발생했습니다.');
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  if (!typeInfo || !validType) {
    return (
      <Result
        status="404"
        title="페이지 준비 중"
        subTitle="해당 메뉴의 페이지는 현재 준비 중입니다."
        extra={<Button type="primary" onClick={() => navigate('/')}>홈으로 가기</Button>}
      />
    );
  }

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
            parentCode={typeInfo.parentCode} 
            placeholder={`${typeInfo.title} 카테고리 전체`} 
            value={searchCategory}
            onChange={(v) => updateParams({ cat: v, page: undefined })}
            style={{ width: 160 }}
          />
          <Input.Search 
            placeholder="제목 검색" 
            allowClear 
            value={keyword}
            onSearch={(v) => updateParams({ q: v.trim() || undefined, page: undefined })}
            onChange={(e) => {
              setKeyword(e.target.value);
              if (!e.target.value) updateParams({ q: undefined, page: undefined });
            }}
            style={{ width: 200 }} 
          />
        </Space>
        {isManagerOrAdmin && (
          <div>
            <Button type="primary" icon={<EditOutlined />} onClick={() => navigate(`/used/${validType}/write`)}>
              등록
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
          current: page,
          onChange: (p) => updateParams({ page: p > 1 ? String(p) : undefined }),
          align: 'center',
          showSizeChanger: false,
        }}
        renderItem={(item) => (
          <List.Item>
            <Card
              hoverable
              onClick={() => navigate(`/used/${validType}/${item.used_seq}`)}
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
