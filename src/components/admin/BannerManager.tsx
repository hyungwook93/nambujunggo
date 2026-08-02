import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Card, Input, Typography, Image, Empty, App as AntApp, Upload } from 'antd';
import { PictureOutlined, PlusOutlined, DeleteOutlined, FileTextOutlined, UploadOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import modal from 'antd/es/modal';

const { Title, Text } = Typography;

export default function BannerManager({ onBannersChange }: { onBannersChange: (banners: any[]) => void }) {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [newTitle, setNewTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [adding, setAdding] = useState(false);
  
  const { message } = AntApp.useApp();

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('dashboard_banners')
      .select('*')
      .order('order_index');
    if (error) message.error('배너 로드 실패: ' + error.message);
    else {
      setBanners(data || []);
      onBannersChange(data || []);
    }
    setLoading(false);
  }, [message, onBannersChange]);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('이미지 파일(JPG, PNG 등)만 업로드 가능합니다!');
      return Upload.LIST_IGNORE;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    return false; // 브라우저 자체 업로드 방지
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setPreviewUrl('');
  };

  const handleAdd = async () => {
    if (!selectedFile) {
      message.warning('업로드할 이미지 파일을 선택해주세요.');
      return;
    }
    
    setAdding(true);
    message.loading({ content: '이미지 업로드 중...', key: 'uploadBanner' });

    try {
      // 1. Supabase Storage 에 파일 업로드
      const fileName = `${Date.now()}_${selectedFile.name}`;
      const filePath = `banners/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('product image')
        .upload(filePath, selectedFile);
        
      if (uploadError) throw uploadError;

      // 2. 업로드된 파일의 Public URL 가져오기
      const { data: publicUrlData } = supabase.storage
        .from('product image')
        .getPublicUrl(filePath);
        
      const imageUrl = publicUrlData.publicUrl;

      // 3. DB에 배너 정보 Insert
      const maxOrder = banners.reduce((acc, b) => Math.max(acc, b.order_index), 0);
      const { error: dbError } = await supabase.from('dashboard_banners').insert({
        image_url: imageUrl,
        title: newTitle.trim() || null,
        order_index: maxOrder + 1,
        is_active: true,
      });

      if (dbError) throw dbError;

      message.success({ content: '배너가 추가되었습니다!', key: 'uploadBanner' });
      
      // 초기화 및 새로고침
      setNewTitle('');
      setSelectedFile(null);
      setPreviewUrl('');
      fetchBanners();
      
    } catch (error: any) {
      message.error({ content: '추가 실패: ' + error.message, key: 'uploadBanner' });
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { data, error } = await supabase.from('dashboard_banners').delete().eq('id', id).select();
    if (error) {
      message.error('삭제 실패: ' + error.message);
    } else if (data && data.length === 0) {
      message.error('삭제 권한이 없거나 이미 삭제된 배너입니다. (Supabase RLS 정책을 확인해주세요)');
    } else {
      message.success('배너가 삭제되었습니다.');
      fetchBanners();
    }
  };

  const columns = [
    {
      title: '미리보기',
      dataIndex: 'image_url',
      key: 'preview',
      width: 120,
      render: (url: string) => (
        <Image
          src={url}
          width={100}
          height={56}
          style={{ objectFit: 'cover', borderRadius: 4 }}
          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        />
      ),
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
      render: (v: string) => v || <Text type="secondary">-</Text>,
    },
    {
      title: '이미지 URL',
      dataIndex: 'image_url',
      key: 'image_url',
      ellipsis: true,
      render: (url: string) => (
        <Text copyable style={{ fontSize: 12 }}>
          {url}
        </Text>
      ),
    },
    { title: '순서', dataIndex: 'order_index', key: 'order_index', width: 70, align: 'center' as const },
    {
      title: '관리',
      key: 'action',
      width: 80,
      align: 'center' as const,
      render: (_: any, record: any) => (
        <Button 
          danger 
          size="small" 
          icon={<DeleteOutlined />}
          onClick={() => {
            modal.confirm({
              title: '정말 삭제하시겠습니까?',
              content: '삭제 후에는 복구할 수 없습니다.',
              okText: '삭제',
              okType: 'danger',
              cancelText: '취소',
              onOk: () => handleDelete(record.id)
            });
          }}
        >
          삭제
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="admin-section-header">
        <PictureOutlined style={{ marginRight: 8, color: '#1677ff' }} />
        <Title level={5} style={{ margin: 0 }}>
          배너 이미지 관리
        </Title>
      </div>
      <Card
        size="small"
        className="add-banner-card"
        title={
          <>
            <PlusOutlined /> 새 배너 추가
          </>
        }
        styles={{ body: { padding: '12px 16px' } }}
      >
        <Space orientation="vertical" style={{ width: '100%' }} size={12}>
          <Input
            placeholder="배너 제목 (선택)"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            prefix={<FileTextOutlined style={{ color: '#aaa' }} />}
          />
          
          <Space>
            <Upload
              beforeUpload={beforeUpload}
              onRemove={handleRemoveFile}
              maxCount={1}
              fileList={selectedFile ? [selectedFile as any] : []}
              accept="image/*"
            >
              <Button icon={<UploadOutlined />}>이미지 선택</Button>
            </Upload>

            <Button type="primary" onClick={handleAdd} loading={adding} disabled={!selectedFile}>
              대시보드 반영
            </Button>
          </Space>

          {previewUrl && (
            <div className="preview-box" style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
                미리보기:
              </Text>
              <img
                src={previewUrl}
                alt="미리보기"
                className="url-preview-img"
                style={{ maxHeight: 150, borderRadius: 4, objectFit: 'cover' }}
              />
            </div>
          )}
        </Space>
      </Card>
      <Table
        dataSource={banners}
        columns={columns}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={false}
        style={{ marginTop: 16 }}
        scroll={{ x: true }}
        locale={{ emptyText: <Empty description="등록된 배너가 없습니다" /> }}
        className="admin-table"
      />
    </div>
  );
}
