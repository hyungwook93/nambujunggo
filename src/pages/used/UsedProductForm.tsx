import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, Button, Upload, Typography, Space, App as AntApp, Radio, Card, Select } from 'antd';
import { CameraOutlined, UploadOutlined, MobileOutlined, DesktopOutlined } from '@ant-design/icons';
import { supabase } from '../../lib/supabase';
import CommonCodeSelector from '../../components/common/CommonCodeSelector';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import {
  ClassicEditor,
  Heading,
  Bold,
  Italic,
  Link,
  List,
  BlockQuote,
  Essentials,
  Paragraph,
} from 'ckeditor5';
// @ts-ignore
import 'ckeditor5/ckeditor5.css';
import { useAuth } from '../../hooks/useAuth';

const { Title, Text } = Typography;

export default function UsedProductForm({ isEdit = false }: { isEdit?: boolean }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const { message } = AntApp.useApp();
  const { currentUser } = useAuth();
  const isManagerOrAdmin = currentUser?.isAdmin || (currentUser?.roles && currentUser.roles.includes('MANAGER'));

  const [loading, setLoading] = useState(false);
  const [content, setContent] = useState('');
  const [fileList, setFileList] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'PC' | 'MOBILE'>('PC');

  useEffect(() => {
    if (!isManagerOrAdmin) {
      message.error('접근 권한이 없습니다.');
      navigate('/used/sell');
      return;
    }

    if (isEdit && id) {
      loadData();
    }
  }, [isEdit, id, isManagerOrAdmin]);

  const loadData = async () => {
    setLoading(true);
    const { data: prodData } = await supabase.from('used_product').select('*').eq('used_seq', id).single();
    if (prodData) {
      form.setFieldsValue({
        title: prodData.title,
        category_code: prodData.category_code,
        status: prodData.status,
      });
      setContent(prodData.content || '');
    }

    const { data: imgData } = await supabase.from('used_product_image').select('*').eq('used_seq', id).order('sort_order');
    if (imgData) {
      const formatted = imgData.map((img) => ({
        uid: String(img.img_seq),
        name: 'image.png',
        status: 'done',
        url: img.image_url,
        isExisting: true,
        img_seq: img.img_seq,
      }));
      setFileList(formatted);
    }
    setLoading(false);
  };

  const handleFinish = async (values: any) => {
    if (!values.title || !values.category_code) {
      message.warning('필수 항목을 모두 입력해주세요.');
      return;
    }

    setLoading(true);
    message.loading({ content: '저장 중...', key: 'saveProduct' });

    try {
      let usedSeq = Number(id);

      // 1. 제품 기본 정보 저장
      const prodData = {
        title: values.title,
        category_code: values.category_code,
        content: content,
        status: values.status || 'A',
        mod_id: currentUser?.userId,
        mod_date: new Date().toISOString(),
      };

      if (!isEdit) {
        const { data: newProd, error: insertErr } = await supabase
          .from('used_product')
          .insert([{ ...prodData, reg_id: currentUser?.userId, reg_date: new Date().toISOString() }])
          .select()
          .single();
        if (insertErr) throw insertErr;
        usedSeq = newProd.used_seq;
      } else {
        const { error: updateErr } = await supabase.from('used_product').update(prodData).eq('used_seq', usedSeq);
        if (updateErr) throw updateErr;
      }

      // 2. 이미지 처리
      // 기존 이미지 중 삭제된 것 처리
      if (isEdit) {
        const remainingImgSeqs = fileList.filter((f) => f.isExisting).map((f) => f.img_seq);
        await supabase
          .from('used_product_image')
          .delete()
          .eq('used_seq', usedSeq)
          .not('img_seq', 'in', `(${remainingImgSeqs.length > 0 ? remainingImgSeqs.join(',') : '0'})`);
      }

      // 신규 추가 이미지 업로드
      const newFiles = fileList.filter((f) => !f.isExisting);
      let thumbnailUrl = fileList.length > 0 && fileList[0].isExisting ? fileList[0].url : null;
      let sortOrderCounter = fileList.filter((f) => f.isExisting).length;

      for (let i = 0; i < newFiles.length; i++) {
        const f = newFiles[i];
        if (f.originFileObj) {
          // 한글/특수문자로 인한 Invalid key 에러 방지를 위해 랜덤 문자열과 확장자만 사용
          const extension = f.originFileObj.name.split('.').pop();
          const randomStr = Math.random().toString(36).substring(2, 10);
          const fileName = `${Date.now()}_${randomStr}.${extension}`;
          const filePath = `products/${usedSeq}/${fileName}`;

          const { error: uploadErr } = await supabase.storage.from('product image').upload(filePath, f.originFileObj);
          if (uploadErr) throw uploadErr;

          const { data: urlData } = supabase.storage.from('product image').getPublicUrl(filePath);
          const imgUrl = urlData.publicUrl;

          if (i === 0 && !thumbnailUrl) thumbnailUrl = imgUrl; // 첫 이미지를 썸네일로

          await supabase.from('used_product_image').insert({
            used_seq: usedSeq,
            image_url: imgUrl,
            is_thumbnail: i === 0 && !thumbnailUrl,
            sort_order: ++sortOrderCounter,
          });
        }
      }

      // 기존 썸네일이 변경되었을 수 있으므로 첫번째 항목을 썸네일로 갱신 (선택적)
      if (fileList.length > 0 && fileList[0].isExisting) {
        thumbnailUrl = fileList[0].url;
      }
      
      // 제품 썸네일 URL 업데이트
      if (thumbnailUrl || fileList.length === 0) {
        await supabase.from('used_product').update({ thumbnail_url: fileList.length === 0 ? null : thumbnailUrl }).eq('used_seq', usedSeq);
      }

      message.success({ content: '저장되었습니다.', key: 'saveProduct' });
      navigate('/used/sell');
    } catch (error: any) {
      message.error({ content: '저장 실패: ' + error.message, key: 'saveProduct' });
    } finally {
      setLoading(false);
    }
  };

  const uploadProps = {
    onRemove: (file: any) => {
      setFileList((prev) => prev.filter((f) => f.uid !== file.uid));
    },
    beforeUpload: (file: any) => {
      const newFile = {
        uid: file.uid || String(Date.now()),
        name: file.name,
        status: 'done',
        originFileObj: file,
        url: URL.createObjectURL(file)
      };
      setFileList((prev) => [...prev, newFile]);
      return false; // Prevent auto upload
    },
    fileList,
    listType: "picture-card" as const,
    multiple: true,
    accept: 'image/*'
  };

  return (
    <div style={{ padding: '16px 0', backgroundColor: '#f0f2f5', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>{isEdit ? '중고상품 수정' : '중고상품 등록'}</Title>
        <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
          <Radio.Button value="PC"><DesktopOutlined /> PC 뷰</Radio.Button>
          <Radio.Button value="MOBILE"><MobileOutlined /> 모바일 뷰</Radio.Button>
        </Radio.Group>
      </div>

      {/* 모바일 뷰 래퍼 */}
      <div style={{
        maxWidth: viewMode === 'MOBILE' ? 414 : 1000,
        margin: '0 auto',
        backgroundColor: '#fff',
        borderRadius: viewMode === 'MOBILE' ? 24 : 8,
        boxShadow: viewMode === 'MOBILE' ? '0 10px 30px rgba(0,0,0,0.1)' : 'none',
        padding: viewMode === 'MOBILE' ? '32px 16px' : '24px',
        border: viewMode === 'MOBILE' ? '8px solid #333' : '1px solid #d9d9d9',
        minHeight: viewMode === 'MOBILE' ? 800 : 'auto',
        transition: 'all 0.3s ease'
      }}>
        <Form form={form} layout="vertical" onFinish={handleFinish} initialValues={{ status: 'A' }}>
          <Form.Item label="제목" name="title" rules={[{ required: true, message: '제목을 입력해주세요.' }]}>
            <Input placeholder="상품 제목을 입력하세요" size="large" />
          </Form.Item>

          <Form.Item label="카테고리" name="category_code" rules={[{ required: true, message: '카테고리를 선택해주세요.' }]}>
            {/* 공통코드 부모가 'CATEGORY'로 설정됨 */}
            <CommonCodeSelector parentCode="CATEGORY" placeholder="품목 선택" />
          </Form.Item>

          {isEdit && (
            <Form.Item label="상태" name="status">
              <Select options={[
                { label: '판매중', value: 'A' },
                { label: '판매완료', value: 'C' }
              ]} />
            </Form.Item>
          )}

          <Form.Item label="상품 사진 (첫번째 사진이 대표이미지가 됩니다)">
            <Space direction="vertical" style={{ width: '100%' }}>
              {/* 모바일 뷰에서는 카메라 촬영 버튼도 노출 유도 */}
              {viewMode === 'MOBILE' && (
                <div style={{ position: 'relative', overflow: 'hidden', display: 'inline-block' }}>
                  <Button icon={<CameraOutlined />} block>카메라로 촬영하기</Button>
                  <input 
                    type="file" 
                    accept="image/*" 
                    capture="environment" 
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        const file = e.target.files[0];
                        // Antd Upload 포맷에 맞춤
                        setFileList([...fileList, {
                          uid: String(Date.now()),
                          name: file.name,
                          status: 'done',
                          originFileObj: file,
                          url: URL.createObjectURL(file)
                        }]);
                      }
                    }}
                    style={{ position: 'absolute', top: 0, right: 0, minWidth: '100%', minHeight: '100%', fontSize: 100, textAlign: 'right', opacity: 0, outline: 'none', background: 'white', cursor: 'inherit', display: 'block' }}
                  />
                </div>
              )}
              
              <Upload {...uploadProps}>
                <div>
                  <UploadOutlined />
                  <div style={{ marginTop: 8 }}>사진 업로드</div>
                </div>
              </Upload>
            </Space>
          </Form.Item>

          <Form.Item label="상품 설명">
            <CKEditor
              editor={ClassicEditor}
              data={content}
              onChange={(event, editor) => {
                const data = editor.getData();
                setContent(data);
              }}
              config={{
                licenseKey: 'GPL',
                plugins: [Heading, Bold, Italic, Link, List, BlockQuote, Essentials, Paragraph],
                toolbar: ['heading', '|', 'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote'],
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: 32 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => navigate('/used/sell')}>취소</Button>
              <Button type="primary" htmlType="submit" loading={loading} size="large">
                {isEdit ? '수정하기' : '등록하기'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </div>
    </div>
  );
}
