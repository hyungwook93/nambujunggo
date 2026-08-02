import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Typography, Space, Carousel, Tag, Divider, App as AntApp, Spin, Image } from 'antd';
import { EditOutlined, DeleteOutlined, LeftOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;

export default function UsedProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { message, modal } = AntApp.useApp();

  const [product, setProduct] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const isManagerOrAdmin = currentUser?.isAdmin || (currentUser?.roles && currentUser.roles.includes('MANAGER'));

  useEffect(() => {
    if (id) {
      loadProduct();
    }
  }, [id]);

  const loadProduct = async () => {
    setLoading(true);
    // 1. 조회수 증가
    await supabase.rpc('increment_view_cnt', { p_used_seq: Number(id) });
    // 만약 rpc가 없으면 단순 select 후 update로 처리해야 함
    const { data: currentData } = await supabase.from('used_product').select('view_cnt').eq('used_seq', id).single();
    if (currentData) {
       await supabase.from('used_product').update({ view_cnt: (currentData.view_cnt || 0) + 1 }).eq('used_seq', id);
    }

    // 2. 상품 정보 및 사진 조회
    const { data: prodData, error: prodErr } = await supabase
      .from('used_product')
      .select(`*, common_code!used_product_category_code_fkey(cc_desc)`)
      .eq('used_seq', id)
      .single();

    const { data: imgData } = await supabase
      .from('used_product_image')
      .select('*')
      .eq('used_seq', id)
      .order('sort_order');

    if (prodErr || !prodData) {
      message.error('상품 정보를 불러오지 못했습니다.');
      navigate('/used/sell');
    } else {
      setProduct(prodData);
      setImages(imgData || []);
    }
    setLoading(false);
  };

  const handleMarkAsSold = async () => {
    const { error } = await supabase.from('used_product').update({ status: 'C' }).eq('used_seq', id);
    if (error) {
      message.error('상태 변경 실패: ' + error.message);
    } else {
      message.success('판매완료 처리되었습니다.');
      loadProduct(); // 재조회
    }
  };

  const handleDelete = async () => {
    // 논리적 삭제 처리 (status: 'D')
    const { error } = await supabase.from('used_product').update({ status: 'D' }).eq('used_seq', id);
    if (error) {
      message.error('삭제 실패: ' + error.message);
    } else {
      message.success('상품이 삭제되었습니다.');
      navigate('/used/sell');
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" /></div>;
  }

  if (!product) return null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '16px 0' }}>
      <Button type="text" icon={<LeftOutlined />} onClick={() => navigate('/used/sell')} style={{ marginBottom: 16 }}>
        목록으로
      </Button>

      <div style={{ marginBottom: 24 }}>
        <Tag color={product.status === 'A' ? 'blue' : 'default'}>
          {product.status === 'A' ? '판매중' : '판매완료'}
        </Tag>
        <Text type="secondary" style={{ marginLeft: 8 }}>
          {product.common_code?.cc_desc || product.category_code}
        </Text>
      </div>

      <Title level={3} style={{ marginTop: 0, marginBottom: 8 }}>
        {product.title}
      </Title>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Text type="secondary">
          등록일: {new Date(product.reg_date).toLocaleDateString()} | 조회 {product.view_cnt}
        </Text>
        
        {isManagerOrAdmin && (
          <Space>
            {product.status !== 'C' && (
              <Button onClick={handleMarkAsSold}>판매완료</Button>
            )}
            <Button icon={<EditOutlined />} onClick={() => navigate(`/used/sell/edit/${id}`)}>
              수정
            </Button>
            <Button danger icon={<DeleteOutlined />} onClick={() => {
              modal.confirm({
                title: '정말 삭제하시겠습니까?',
                content: '삭제 후에는 복구할 수 없습니다.',
                okText: '삭제',
                okType: 'danger',
                cancelText: '취소',
                onOk: handleDelete
              });
            }}>
              삭제
            </Button>
          </Space>
        )}
      </div>

      {images.length > 0 && (
        <div style={{ marginBottom: 24, borderRadius: 8, overflow: 'hidden', backgroundColor: '#f0f2f5' }}>
          <Carousel autoplay>
            {images.map((img) => (
              <div key={img.img_seq} style={{ display: 'flex', justifyContent: 'center' }}>
                <Image 
                  src={img.image_url} 
                  alt="제품 사진" 
                  style={{ width: '100%', height: 400, objectFit: 'contain', backgroundColor: '#fff' }} 
                />
              </div>
            ))}
          </Carousel>
        </div>
      )}

      <Divider />

      <div 
        className="ck-content"
        dangerouslySetInnerHTML={{ __html: product.content || '내용이 없습니다.' }}
        style={{ minHeight: 200, fontSize: 16, lineHeight: 1.6 }}
      />
    </div>
  );
}
